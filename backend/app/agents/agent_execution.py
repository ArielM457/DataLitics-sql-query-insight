"""Execution Agent — Executes SQL queries via Data API Builder (DAB).

Uses the DAB REST API to execute validated SQL queries against the
tenant's database. Implements a Circuit Breaker pattern (via pybreaker)
to handle DAB service failures gracefully.
"""

from fastapi import HTTPException

from app.config import settings


def get_dab_url(tenant_id: str) -> str:
    """Resolve the DAB base URL for a given tenant.

    This is the core multi-tenant isolation enforcement point.
    Each tenant maps to a separate, isolated DAB container.

    Args:
        tenant_id: The tenant identifier extracted from the Firebase token.

    Returns:
        str: The base URL of the DAB container for the given tenant.

    Raises:
        HTTPException(403): If tenant_id is not recognized.
    """
    dab_urls = {
        "empresa_a": settings.DAB_BASE_URL_EMPRESA_A,
        "empresa_b": settings.DAB_BASE_URL_EMPRESA_B,
    }
    url = dab_urls.get(tenant_id)
    if not url:
        raise HTTPException(
            status_code=403,
            detail=f"Unknown tenant: {tenant_id}",
        )
    return url


class ExecutionAgent:
    """Agent 3: Executes SQL queries through DAB REST API.

    Sends validated SQL to the Data API Builder endpoint, which handles
    actual database communication. Uses a Circuit Breaker pattern to
    protect against cascading failures when DAB is unavailable.
    """

    async def execute(self, sql: str, tenant_id: str, user_role: str) -> dict:
        """Execute a validated SQL query via DAB.

        Args:
            sql: The validated SQL query string.
            tenant_id: The tenant identifier for routing to the correct DAB instance.
            user_role: The role of the user for DAB permission enforcement.

        Returns:
            dict: Execution result with the following shape:
                {
                    "data": [],
                    "rows": 0,
                    "execution_time_ms": 0,
                    "dab_endpoint": "",
                    "error": None,
                }
        """
        dab_url = get_dab_url(tenant_id)  # raises 403 for unknown tenant
        # TODO: Issue #15 — Implement DAB REST API execution with Circuit Breaker
        raise NotImplementedError(
            f"Pending implementation - Issue #15 (dab_url={dab_url})"
        )
