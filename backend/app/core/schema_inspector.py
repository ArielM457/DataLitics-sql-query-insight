"""Schema Inspector — Introspects Azure SQL database schema via pyodbc."""

import pyodbc


# Columns that are auto-excluded from the analyst role by name pattern
SENSITIVE_COLUMN_PATTERNS = {
    "salary", "ssn", "bank_account", "password", "credit_card",
    "phone", "email", "address", "tax_id", "social_security",
    "date_of_birth", "dob", "passport", "license_number",
}


class SchemaInspector:
    """Connects to an Azure SQL database and introspects its schema."""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string

    def test_connection(self) -> bool:
        """Attempt a connection to verify the connection string is valid.

        Returns:
            bool: True if the connection succeeds, False otherwise.
        """
        try:
            conn = pyodbc.connect(self.connection_string, timeout=10)
            conn.close()
            return True
        except Exception:
            return False

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
        conn = pyodbc.connect(self.connection_string, timeout=15)
        cursor = conn.cursor()

        schema: dict = {}

        # Get all user tables (exclude system tables)
        cursor.execute("""
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        tables = [row.TABLE_NAME for row in cursor.fetchall()]

        for table in tables:
            cursor.execute("""
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION
            """, table)

            columns = []
            for row in cursor.fetchall():
                col_name = row.COLUMN_NAME
                columns.append({
                    "name": col_name,
                    "type": row.DATA_TYPE,
                    "nullable": row.IS_NULLABLE == "YES",
                    "sensitive": col_name.lower() in SENSITIVE_COLUMN_PATTERNS,
                })
            schema[table] = {"columns": columns}

        conn.close()
        return schema
