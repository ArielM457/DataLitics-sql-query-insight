"""DAB Config Generator — Generates dab-config.json from an introspected schema.

Produces a ready-to-deploy Data API Builder configuration with:
- Read-only permissions for all roles (analyst / manager / admin)
- Sensitive columns excluded from the analyst role automatically
- Connection string injected from environment variable (never hardcoded)
"""

DAB_SCHEMA_URL = "https://dataapibuilder.azureedge.net/schemas/v1.1.5/dab.draft.schema.json"


class DabConfigGenerator:
    """Generates a dab-config.json dict from an introspected database schema."""

    def generate(self, tenant_id: str, schema: dict, connection_env_var: str) -> dict:
        """Generate a complete dab-config.json for a tenant.

        Args:
            tenant_id: The tenant identifier (used in CORS and naming).
            schema: Output from SchemaInspector.introspect().
            connection_env_var: The env var name holding the connection string
                                (e.g. 'TENANT_EMPRESA_A_CONNECTION').

        Returns:
            dict: A complete dab-config.json ready to be serialized to JSON.
        """
        entities = {}

        for table_name, table_info in schema.items():
            sensitive_cols = [
                col["name"]
                for col in table_info["columns"]
                if col.get("sensitive")
            ]

            analyst_action: dict = {"action": "read"}
            if sensitive_cols:
                analyst_action["fields"] = {"exclude": sensitive_cols}

            entities[table_name] = {
                "source": f"dbo.{table_name}",
                "rest": {"path": f"/{table_name.lower()}"},
                "permissions": [
                    {"role": "analyst", "actions": [analyst_action]},
                    {"role": "manager", "actions": [{"action": "read"}]},
                    {"role": "admin", "actions": [{"action": "read"}]},
                ],
                "_columns": [
                    {"name": col["name"], "type": col["type"], "sensitive": col.get("sensitive", False)}
                    for col in table_info["columns"]
                ],
            }

        return {
            "$schema": DAB_SCHEMA_URL,
            "data-source": {
                "database-type": "mssql",
                "connection-string": f"@env('{connection_env_var}')",
            },
            "runtime": {
                "rest": {"enabled": True, "path": "/api"},
                "graphql": {"enabled": False},
                "host": {
                    "mode": "production",
                    "cors": {
                        "origins": [
                            "http://localhost:3000",
                            "https://*.azurecontainerapps.io",
                        ],
                        "allow-credentials": True,
                    },
                    "authentication": {"provider": "StaticWebApps"},
                },
            },
            "entities": entities,
        }
