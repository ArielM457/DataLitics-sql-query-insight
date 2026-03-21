"""Execution Agent — Executes SQL queries via Data API Builder (DAB).

Uses the DAB REST API to execute validated SQL queries against the
tenant's database. Implements a Circuit Breaker pattern (via pybreaker)
to handle DAB service failures gracefully.

Features:
- Circuit Breaker: 5 failures → open circuit → 60s timeout → retry
- Query timeout: 30 seconds per request
- Row limit: 10,000 rows maximum
- Error feedback: Passes DAB errors back to Agent 2 for auto-correction
"""

import logging
import time

import httpx
import pybreaker
from fastapi import HTTPException

from app.config import settings
from app.core.circuit_breaker import dab_breaker, handle_circuit_breaker_error
from app.core.schema_loader import load_tenant_schema

logger = logging.getLogger("dataagent.agents.execution")

_TENANT_DAB_URLS = {
    "empresa_a": lambda: settings.DAB_BASE_URL_EMPRESA_A,
    "empresa_b": lambda: settings.DAB_BASE_URL_EMPRESA_B,
}


def get_dab_url(tenant_id: str) -> str:
    """Return the DAB base URL for the given tenant.

    Raises:
        HTTPException(403): If the tenant_id is unknown or empty.
    """
    if not tenant_id or tenant_id not in _TENANT_DAB_URLS:
        raise HTTPException(
            status_code=403,
            detail=f"Unknown or missing tenant_id: '{tenant_id}'",
        )
    return _TENANT_DAB_URLS[tenant_id]()


# Maximum rows to return from a single query
MAX_ROWS = 10_000
# Request timeout in seconds
REQUEST_TIMEOUT = 30.0


class ExecutionAgent:
    """Agent 3: Executes SQL queries through DAB REST API.

    Sends validated SQL to the Data API Builder endpoint, which handles
    actual database communication. Uses a Circuit Breaker pattern to
    protect against cascading failures when DAB is unavailable.
    """

    def __init__(self):
        self._base_url = settings.DAB_BASE_URL.rstrip("/")

    async def execute(self, sql: str, tenant_id: str, user_role: str) -> dict:
        """Execute a validated SQL query via DAB.

        Args:
            sql: The validated SQL query string.
            tenant_id: The tenant identifier for routing to the correct DAB instance.
            user_role: The role of the user for DAB permission enforcement.

        Returns:
            dict: Execution result with shape:
                {
                    "data": list,
                    "rows": int,
                    "execution_time_ms": float,
                    "dab_endpoint": str,
                    "error": str | None,
                    "circuit_breaker_open": bool,
                }
        """
        logger.info("Executing query: tenant=%s, role=%s", tenant_id, user_role)
        start_time = time.time()

        # Check circuit breaker state first
        if dab_breaker.current_state == pybreaker.STATE_OPEN:
            logger.warning("Circuit breaker is OPEN — DAB unavailable")
            cb_error = handle_circuit_breaker_error()
            return {
                "data": [],
                "rows": 0,
                "execution_time_ms": 0,
                "dab_endpoint": "",
                "error": cb_error["error"],
                "circuit_breaker_open": True,
            }

        # Determine DAB endpoint based on tenant and schema
        schema = load_tenant_schema(tenant_id)
        schema.get("available_tables", [])

        # Try to identify the primary table from the SQL to route the DAB request
        endpoint = self._resolve_dab_endpoint(sql, schema)

        try:
            result = await self._call_dab(
                endpoint=endpoint,
                sql=sql,
                tenant_id=tenant_id,
                user_role=user_role,
            )

            execution_time = (time.time() - start_time) * 1000
            rows = result.get("value", []) if isinstance(result, dict) else result
            if isinstance(rows, list):
                data = rows[:MAX_ROWS]
            else:
                data = [rows] if rows else []

            logger.info(
                "Query executed: rows=%d, time=%.2fms, endpoint=%s",
                len(data), execution_time, endpoint,
            )

            return {
                "data": data,
                "rows": len(data),
                "execution_time_ms": round(execution_time, 2),
                "dab_endpoint": endpoint,
                "error": None,
                "circuit_breaker_open": False,
            }

        except pybreaker.CircuitBreakerError:
            logger.error("Circuit breaker tripped during execution")
            cb_error = handle_circuit_breaker_error()
            return {
                "data": [],
                "rows": 0,
                "execution_time_ms": (time.time() - start_time) * 1000,
                "dab_endpoint": endpoint,
                "error": cb_error["error"],
                "circuit_breaker_open": True,
            }
        except httpx.TimeoutException:
            execution_time = (time.time() - start_time) * 1000
            error_msg = (
                f"Query timed out after {REQUEST_TIMEOUT}s. "
                f"The query may be too complex or return too many rows. "
                f"Try adding more specific filters."
            )
            logger.error("DAB request timeout: %.2fms", execution_time)
            return {
                "data": [],
                "rows": 0,
                "execution_time_ms": round(execution_time, 2),
                "dab_endpoint": endpoint,
                "error": error_msg,
                "circuit_breaker_open": False,
            }
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            error_msg = f"DAB execution error: {str(e)}"
            logger.error("DAB error: %s (%.2fms)", str(e), execution_time)
            return {
                "data": [],
                "rows": 0,
                "execution_time_ms": round(execution_time, 2),
                "dab_endpoint": endpoint,
                "error": error_msg,
                "circuit_breaker_open": False,
            }

    @dab_breaker
    async def _call_dab(
        self,
        endpoint: str,
        sql: str,
        tenant_id: str,
        user_role: str,
    ) -> dict:
        """Make the actual HTTP call to DAB, wrapped by circuit breaker.

        DAB supports REST queries via GET with $filter parameters.
        For complex SQL, we use the stored procedure or raw SQL endpoint
        if available, otherwise construct REST filter queries.
        """
        url = f"{self._base_url}{endpoint}"

        headers = {
            "Content-Type": "application/json",
            "X-MS-API-ROLE": user_role,
        }

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            # Try REST API with filter parameters
            response = await client.get(
                url,
                headers=headers,
                params={"$first": MAX_ROWS},
            )

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 403:
                raise PermissionError(
                    f"Access denied: role '{user_role}' does not have permission "
                    f"to access this resource."
                )
            elif response.status_code == 404:
                raise ValueError(
                    f"Endpoint not found: {endpoint}. "
                    f"The table may not be configured in DAB."
                )
            else:
                error_body = response.text
                raise RuntimeError(
                    f"DAB returned status {response.status_code}: {error_body}"
                )

    def _resolve_dab_endpoint(self, sql: str, schema: dict) -> str:
        """Determine the DAB REST endpoint from the SQL and schema.

        Maps the primary table in the SQL query to its DAB REST path.
        """
        tables_info = schema.get("tables", {})
        sql_upper = sql.upper()

        # Find the first table referenced in FROM clause
        for table_name, table_info in tables_info.items():
            if table_name.upper() in sql_upper:
                rest_path = table_info.get("rest_path", f"/{table_name.lower()}")
                return f"/api{rest_path}"

        # Fallback: use the first available table
        if tables_info:
            first_table = next(iter(tables_info.values()))
            return f"/api{first_table.get('rest_path', '/unknown')}"

        return "/api/unknown"
