"""Context Filter — Validates SQL queries against tenant permissions.

Ensures that generated SQL queries only access tables and columns
that the user is authorized to query, based on their role and the
tenant's schema configuration from DAB.
"""

import logging
import re

import sqlparse

logger = logging.getLogger("dataagent.security.context_filter")

# Regex to extract table names from SQL (handles aliases)
_TABLE_PATTERN = re.compile(
    r"\bFROM\s+(\w+)"
    r"|\bJOIN\s+(\w+)"
    r"|\bINTO\s+(\w+)"
    r"|\bUPDATE\s+(\w+)",
    re.IGNORECASE,
)

# Regex to extract column names from SELECT clause
_COLUMN_PATTERN = re.compile(
    r"SELECT\s+(.*?)\s+FROM",
    re.IGNORECASE | re.DOTALL,
)


def _extract_tables(sql: str) -> list[str]:
    """Extract table names referenced in the SQL query."""
    matches = _TABLE_PATTERN.findall(sql)
    tables = set()
    for match_groups in matches:
        for table in match_groups:
            if table:
                tables.add(table)
    return list(tables)


def _extract_columns(sql: str) -> list[str]:
    """Extract column names from the SELECT clause."""
    match = _COLUMN_PATTERN.search(sql)
    if not match:
        return []

    select_clause = match.group(1).strip()
    if select_clause == "*":
        return ["*"]

    columns = set()
    for part in select_clause.split(","):
        part = part.strip()
        # Handle aliases: "column AS alias" or "table.column"
        # Extract the actual column name
        if " AS " in part.upper():
            part = part.split(" AS ")[0].strip()
            part = re.split(r"\s+[Aa][Ss]\s+", part)[0].strip()
        if "(" in part:
            # Aggregate function: extract column inside
            inner = re.search(r"\(([^)]+)\)", part)
            if inner:
                col = inner.group(1).strip()
                if "." in col:
                    col = col.split(".")[-1]
                if col != "*":
                    columns.add(col)
            continue
        if "." in part:
            part = part.split(".")[-1]
        part = part.strip().strip('"').strip("'").strip("`")
        if part and part != "*":
            columns.add(part)

    return list(columns)


class ContextFilter:
    """Validates SQL queries against tenant schema and user permissions.

    Prevents unauthorized data access by checking that the SQL query
    only references tables and columns the user's role is allowed to access.
    """

    def validate(
        self,
        sql: str,
        tenant_schema: dict,
        user_role: str,
        restricted_columns: list,
    ) -> dict:
        """Validate an SQL query against tenant permissions.

        Args:
            sql: The SQL query to validate.
            tenant_schema: The tenant's schema from schema_loader.
            user_role: The role of the user (analyst, manager, admin).
            restricted_columns: List of columns the user cannot access.

        Returns:
            dict: Validation result with shape:
                {
                    "valid": bool,
                    "blocked_reason": str | None,
                    "unauthorized_tables": list,
                    "unauthorized_columns": list,
                }
        """
        result = {
            "valid": True,
            "blocked_reason": None,
            "unauthorized_tables": [],
            "unauthorized_columns": [],
        }

        available_tables = tenant_schema.get("available_tables", [])
        tables_info = tenant_schema.get("tables", {})

        # --- Check tables ---
        referenced_tables = _extract_tables(sql)
        unauthorized_tables = []

        for table in referenced_tables:
            # Case-insensitive comparison against available tables
            if not any(t.lower() == table.lower() for t in available_tables):
                unauthorized_tables.append(table)

        if unauthorized_tables:
            result["valid"] = False
            result["unauthorized_tables"] = unauthorized_tables
            result["blocked_reason"] = (
                f"Query references tables not available in your schema: "
                f"{', '.join(unauthorized_tables)}. "
                f"Available tables: {', '.join(available_tables)}"
            )
            logger.warning(
                "Context filter BLOCKED: unauthorized tables %s (role=%s)",
                unauthorized_tables, user_role,
            )
            return result

        # --- Check columns ---
        referenced_columns = _extract_columns(sql)

        # Build the full set of restricted columns for this role
        all_restricted = set(c.lower() for c in restricted_columns)
        for table_name, table_info in tables_info.items():
            excluded = table_info.get("columns_excluded_by_role", {}).get(user_role, [])
            all_restricted.update(c.lower() for c in excluded)

        # Check if SELECT * is used with tables that have restricted columns
        if "*" in referenced_columns and all_restricted:
            result["valid"] = False
            result["unauthorized_columns"] = sorted(all_restricted)
            result["blocked_reason"] = (
                f"SELECT * is not allowed for role '{user_role}' because the following "
                f"columns are restricted: {', '.join(sorted(all_restricted))}. "
                f"Please specify the columns you need explicitly."
            )
            logger.warning(
                "Context filter BLOCKED: SELECT * with restricted columns (role=%s)",
                user_role,
            )
            return result

        unauthorized_columns = []
        for col in referenced_columns:
            if col.lower() in all_restricted:
                unauthorized_columns.append(col)

        if unauthorized_columns:
            result["valid"] = False
            result["unauthorized_columns"] = unauthorized_columns
            result["blocked_reason"] = (
                f"Your role '{user_role}' does not have access to columns: "
                f"{', '.join(unauthorized_columns)}. "
                f"These columns are restricted by your organization's data policy."
            )
            logger.warning(
                "Context filter BLOCKED: unauthorized columns %s (role=%s)",
                unauthorized_columns, user_role,
            )
            return result

        return result


# Singleton instance
context_filter = ContextFilter()
