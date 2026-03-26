"""Schema Loader — Reads database schema from DAB configuration files.

Provides a local schema source independent of Azure AI Search (M3),
allowing agents to function with full table/column/permission awareness
by reading the dab-config.json files directly.

Allowed-tables whitelist:
    Each tenant can optionally restrict which tables are visible to the agent.
    The whitelist is stored in dab/{tenant_id}/allowed_tables.json.
    If the file does not exist, ALL tables are available (backward-compatible).
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger("dataagent.core.schema_loader")

# Base path for DAB configuration files
DAB_CONFIG_DIR = Path(__file__).resolve().parent.parent.parent.parent / "dab"


# ─── Allowed-tables helpers ───────────────────────────────────────────────────

def load_allowed_tables_file(tenant_id: str) -> list[str] | None:
    """Return the saved allowed-tables whitelist for a tenant, or None if not set.

    Returns None (not an empty list) when the file is absent so callers can
    distinguish "no restriction" from "all tables explicitly blocked".
    """
    path = DAB_CONFIG_DIR / tenant_id / "allowed_tables.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("allowed_tables")
    except Exception as exc:
        logger.warning("Could not read allowed_tables.json for tenant %s: %s", tenant_id, exc)
        return None


def save_allowed_tables_file(tenant_id: str, allowed_tables: list[str]) -> None:
    """Persist the allowed-tables whitelist to disk."""
    path = DAB_CONFIG_DIR / tenant_id / "allowed_tables.json"
    path.write_text(
        json.dumps({"allowed_tables": allowed_tables}, indent=2),
        encoding="utf-8",
    )
    logger.info("Saved allowed_tables for tenant=%s: %s", tenant_id, allowed_tables)


def load_all_tenant_tables(tenant_id: str) -> list[str]:
    """Return every table in the dab-config regardless of the allowed-tables whitelist.

    Used by the admin panel to show ALL tables so the admin can re-enable
    previously restricted ones.
    """
    config_path = DAB_CONFIG_DIR / tenant_id / "dab-config.json"
    if not config_path.exists():
        return []
    try:
        dab_config = json.loads(config_path.read_text(encoding="utf-8"))
        return list(dab_config.get("entities", {}).keys())
    except Exception as exc:
        logger.warning("Could not read dab-config for tenant %s: %s", tenant_id, exc)
        return []


def load_tenant_schema(tenant_id: str) -> dict:
    """Load the database schema for a tenant from its dab-config.json.

    Args:
        tenant_id: The tenant identifier (e.g., 'empresa_a').

    Returns:
        dict: Schema with tables, columns, and permissions per role.
            {
                "tenant_id": str,
                "tables": {
                    "TableName": {
                        "source": str,
                        "rest_path": str,
                        "columns_excluded_by_role": {
                            "analyst": ["col1", "col2"],
                        },
                    }
                },
                "available_tables": ["Table1", "Table2"],
                "restricted_columns_by_role": {
                    "analyst": ["col1", "col2"],
                },
            }
    """
    config_path = DAB_CONFIG_DIR / tenant_id / "dab-config.json"

    if not config_path.exists():
        logger.warning("DAB config not found for tenant %s at %s", tenant_id, config_path)
        return {
            "tenant_id": tenant_id,
            "tables": {},
            "available_tables": [],
            "restricted_columns_by_role": {},
        }

    with open(config_path, "r", encoding="utf-8") as f:
        dab_config = json.load(f)

    entities = dab_config.get("entities", {})
    tables = {}
    restricted_by_role: dict[str, set] = {}

    for entity_name, entity_config in entities.items():
        source = entity_config.get("source", "")
        if isinstance(source, dict):
            source = source.get("object", "")

        rest_config = entity_config.get("rest", {})
        rest_path = rest_config.get("path", f"/{entity_name.lower()}")

        columns_excluded_by_role: dict[str, list] = {}
        permissions = entity_config.get("permissions", [])

        for perm in permissions:
            role = perm.get("role", "")
            actions = perm.get("actions", [])

            for action in actions:
                if isinstance(action, dict):
                    fields = action.get("fields", {})
                    excluded = fields.get("exclude", [])
                    if excluded:
                        columns_excluded_by_role[role] = excluded
                        if role not in restricted_by_role:
                            restricted_by_role[role] = set()
                        restricted_by_role[role].update(excluded)

        tables[entity_name] = {
            "source": source,
            "rest_path": rest_path,
            "columns_excluded_by_role": columns_excluded_by_role,
            "columns": entity_config.get("_columns", []),
        }

    # Apply allowed-tables whitelist (if configured by the admin)
    whitelist = load_allowed_tables_file(tenant_id)
    if whitelist is not None:
        tables = {name: info for name, info in tables.items() if name in whitelist}
        # Recompute restricted_by_role to only include allowed tables
        restricted_by_role = {}
        for table_info in tables.values():
            for role, excluded in table_info["columns_excluded_by_role"].items():
                if role not in restricted_by_role:
                    restricted_by_role[role] = set()
                restricted_by_role[role].update(excluded)

    return {
        "tenant_id": tenant_id,
        "tables": tables,
        "available_tables": list(tables.keys()),
        "restricted_columns_by_role": {
            role: sorted(cols) for role, cols in restricted_by_role.items()
        },
    }


def get_allowed_tables(tenant_id: str, user_role: str) -> list[str]:
    """Get the list of tables a user role can access for a tenant."""
    schema = load_tenant_schema(tenant_id)
    return schema["available_tables"]


def get_restricted_columns(tenant_id: str, user_role: str) -> list[str]:
    """Get the list of restricted columns for a user role."""
    schema = load_tenant_schema(tenant_id)
    return schema["restricted_columns_by_role"].get(user_role, [])


def get_schema_description(tenant_id: str, user_role: str) -> str:
    """Generate a human-readable schema description for prompt context.

    Creates a text description of tables and accessible columns that
    can be injected into agent prompts for SQL generation.
    """
    schema = load_tenant_schema(tenant_id)
    restricted = schema["restricted_columns_by_role"].get(user_role, [])

    lines = [f"Database schema for tenant '{tenant_id}' (role: {user_role}):"]
    lines.append("")

    for table_name, table_info in schema["tables"].items():
        excluded = table_info["columns_excluded_by_role"].get(user_role, [])
        columns = table_info.get("columns", [])
        lines.append(f"Table: {table_name} (source: {table_info['source']})")
        if columns:
            available = [
                f"{c['name']} ({c['type']})"
                for c in columns
                if c["name"] not in excluded
            ]
            if available:
                lines.append(f"  Columns: {', '.join(available)}")
        if excluded:
            lines.append(f"  Restricted columns (not accessible): {', '.join(excluded)}")
        lines.append(f"  REST endpoint: {table_info['rest_path']}")
        lines.append("")

    if restricted:
        lines.append(f"Global restricted columns for role '{user_role}': {', '.join(restricted)}")

    return "\n".join(lines)
