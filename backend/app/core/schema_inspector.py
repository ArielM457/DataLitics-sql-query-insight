"""Schema Inspector — Introspects Azure SQL database schema via pymssql."""

import logging
import re

import pymssql

logger = logging.getLogger("dataagent.schema_inspector")

# Columns that are auto-excluded from the analyst role by name pattern
SENSITIVE_COLUMN_PATTERNS = {
    "salary", "ssn", "bank_account", "password", "credit_card",
    "phone", "email", "address", "tax_id", "social_security",
    "date_of_birth", "dob", "passport", "license_number",
}


def _parse_connection_string(connection_string: str) -> dict:
    """Parse a pyodbc or Azure portal connection string into components.

    Supports keys: Server/Data Source, Database/Initial Catalog,
    User ID/UID, Password/PWD, Connection Timeout.
    """
    parts: dict[str, str] = {}
    for part in connection_string.split(";"):
        eq = part.find("=")
        if eq > 0:
            key = part[:eq].strip().lower()
            val = part[eq + 1:].strip().strip('"').strip("'")
            parts[key] = val

    def get(*keys: str) -> str:
        for k in keys:
            if k in parts:
                return parts[k]
        return ""

    raw_server = get("server", "data source")
    # Strip tcp: prefix and port from server string
    raw_server = re.sub(r"^tcp:", "", raw_server, flags=re.IGNORECASE)
    if "," in raw_server:
        host, port_str = raw_server.rsplit(",", 1)
        port = int(port_str.strip()) if port_str.strip().isdigit() else 1433
    else:
        host = raw_server
        port = 1433

    return {
        "server": host.strip(),
        "port": port,
        "database": get("database", "initial catalog"),
        "user": get("user id", "uid"),
        "password": get("password", "pwd"),
        "timeout": int(get("connection timeout") or 30),
    }


class SchemaInspector:
    """Connects to an Azure SQL database and introspects its schema."""

    def __init__(self, connection_string: str):
        self._params = _parse_connection_string(connection_string)
        logger.debug(
            "SchemaInspector → server=%s db=%s user=%s",
            self._params["server"], self._params["database"], self._params["user"],
        )

    def _connect(self, timeout: int | None = None) -> pymssql.Connection:
        p = self._params
        return pymssql.connect(
            server=p["server"],
            port=str(p["port"]),
            user=p["user"],
            password=p["password"],
            database=p["database"],
            login_timeout=timeout or p["timeout"],
        )

    def test_connection(self) -> tuple[bool, str]:
        """Attempt a connection to verify the credentials are valid.

        Returns:
            tuple: (success: bool, error_message: str)
        """
        try:
            conn = self._connect(timeout=10)
            conn.close()
            return True, ""
        except Exception as e:
            logger.error("Connection test failed: %s", str(e))
            return False, str(e)

    def introspect(self) -> dict:
        """Introspect all user tables and their columns.

        Returns:
            dict: Schema map in the shape:
                {
                    "TableName": {
                        "columns": [
                            {"name": str, "type": str, "nullable": bool, "sensitive": bool}
                        ]
                    }
                }
        """
        conn = self._connect()
        cursor = conn.cursor()

        schema: dict = {}

        cursor.execute("""
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        tables = [row[0] for row in cursor.fetchall()]

        for table in tables:
            cursor.execute("""
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = %s
                ORDER BY ORDINAL_POSITION
            """, (table,))

            columns = []
            for row in cursor.fetchall():
                col_name = row[0]
                columns.append({
                    "name": col_name,
                    "type": row[1],
                    "nullable": row[2] == "YES",
                    "sensitive": col_name.lower() in SENSITIVE_COLUMN_PATTERNS,
                })
            schema[table] = {"columns": columns}

        conn.close()
        return schema
