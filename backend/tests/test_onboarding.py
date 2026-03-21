"""Onboarding tests — verifies schema introspection, DAB config generation,
and the onboarding endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.core.dab_generator import DabConfigGenerator
from app.core.schema_inspector import SchemaInspector, SENSITIVE_COLUMN_PATTERNS

client = TestClient(app)

# ---------------------------------------------------------------------------
# Sample data shared across tests
# ---------------------------------------------------------------------------

SAMPLE_SCHEMA = {
    "Employees": {
        "columns": [
            {"name": "id", "type": "int", "nullable": False, "sensitive": False},
            {"name": "name", "type": "varchar", "nullable": False, "sensitive": False},
            {"name": "salary", "type": "decimal", "nullable": True, "sensitive": True},
            {"name": "ssn", "type": "varchar", "nullable": True, "sensitive": True},
            {"name": "department", "type": "varchar", "nullable": True, "sensitive": False},
        ]
    },
    "Departments": {
        "columns": [
            {"name": "id", "type": "int", "nullable": False, "sensitive": False},
            {"name": "name", "type": "varchar", "nullable": False, "sensitive": False},
        ]
    },
}


# ---------------------------------------------------------------------------
# SchemaInspector tests
# ---------------------------------------------------------------------------

def test_sensitive_column_patterns_include_common_pii():
    assert "salary" in SENSITIVE_COLUMN_PATTERNS
    assert "ssn" in SENSITIVE_COLUMN_PATTERNS
    assert "bank_account" in SENSITIVE_COLUMN_PATTERNS
    assert "email" in SENSITIVE_COLUMN_PATTERNS


def test_test_connection_returns_true_when_db_is_reachable():
    with patch("app.core.schema_inspector.pyodbc.connect") as mock_connect:
        mock_connect.return_value = MagicMock()
        inspector = SchemaInspector("Server=test;Database=db;")
        assert inspector.test_connection() is True


def test_test_connection_returns_false_when_db_is_unreachable():
    with patch("app.core.schema_inspector.pyodbc.connect", side_effect=Exception("timeout")):
        inspector = SchemaInspector("Server=invalid;")
        assert inspector.test_connection() is False


def test_introspect_returns_tables_and_columns():
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    # Mock tables query
    table_row = MagicMock()
    table_row.TABLE_NAME = "Sales"
    mock_cursor.fetchall.side_effect = [
        [table_row],  # tables query
        [
            MagicMock(COLUMN_NAME="id", DATA_TYPE="int", IS_NULLABLE="NO"),
            MagicMock(COLUMN_NAME="amount", DATA_TYPE="decimal", IS_NULLABLE="YES"),
        ],  # columns query for Sales
    ]

    with patch("app.core.schema_inspector.pyodbc.connect", return_value=mock_conn):
        inspector = SchemaInspector("Server=test;")
        schema = inspector.introspect()

    assert "Sales" in schema
    assert len(schema["Sales"]["columns"]) == 2
    assert schema["Sales"]["columns"][0]["name"] == "id"


# ---------------------------------------------------------------------------
# DabConfigGenerator tests
# ---------------------------------------------------------------------------

def test_generator_produces_valid_structure():
    config = DabConfigGenerator().generate("empresa_a", SAMPLE_SCHEMA, "TENANT_EMPRESA_A_CONNECTION")
    assert "$schema" in config
    assert "data-source" in config
    assert "entities" in config
    assert "Employees" in config["entities"]
    assert "Departments" in config["entities"]


def test_generator_excludes_sensitive_columns_from_analyst():
    config = DabConfigGenerator().generate("empresa_a", SAMPLE_SCHEMA, "TENANT_EMPRESA_A_CONNECTION")
    employees = config["entities"]["Employees"]
    analyst_actions = employees["permissions"][0]["actions"]
    assert analyst_actions[0]["fields"]["exclude"] == ["salary", "ssn"]


def test_generator_gives_manager_full_read_access():
    config = DabConfigGenerator().generate("empresa_a", SAMPLE_SCHEMA, "TENANT_EMPRESA_A_CONNECTION")
    employees = config["entities"]["Employees"]
    manager_actions = employees["permissions"][1]["actions"]
    assert manager_actions[0]["action"] == "read"
    assert "fields" not in manager_actions[0]


def test_generator_uses_env_var_for_connection_string():
    config = DabConfigGenerator().generate("empresa_a", SAMPLE_SCHEMA, "TENANT_EMPRESA_A_CONNECTION")
    assert config["data-source"]["connection-string"] == "@env('TENANT_EMPRESA_A_CONNECTION')"


def test_generator_table_without_sensitive_columns_has_no_field_exclusion():
    config = DabConfigGenerator().generate("empresa_a", SAMPLE_SCHEMA, "TENANT_EMPRESA_A_CONNECTION")
    departments = config["entities"]["Departments"]
    analyst_actions = departments["permissions"][0]["actions"]
    assert "fields" not in analyst_actions[0]


def test_generator_disables_graphql():
    config = DabConfigGenerator().generate("empresa_a", SAMPLE_SCHEMA, "TENANT_EMPRESA_A_CONNECTION")
    assert config["runtime"]["graphql"]["enabled"] is False


# ---------------------------------------------------------------------------
# /onboarding/connect endpoint tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_connect_requires_admin_role():
    with patch("app.routers.onboarding.verify_firebase_token") as mock_auth:
        mock_auth.return_value = {"tenant_id": "empresa_a", "role": "analyst"}
        response = client.post(
            "/onboarding/connect",
            json={"connection_string": "Server=x", "company_name": "Test", "tenant_id": "empresa_a"},
            headers={"authorization": "Bearer fake-token"},
        )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_connect_returns_400_when_connection_fails():
    with patch("app.routers.onboarding.verify_firebase_token") as mock_auth, \
         patch("app.routers.onboarding.SchemaInspector.test_connection", return_value=False):
        mock_auth.return_value = {"tenant_id": "empresa_a", "role": "admin"}
        response = client.post(
            "/onboarding/connect",
            json={"connection_string": "invalid", "company_name": "Test", "tenant_id": "empresa_a"},
            headers={"authorization": "Bearer fake-token"},
        )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_connect_returns_schema_summary_and_dab_config():
    with patch("app.routers.onboarding.verify_firebase_token") as mock_auth, \
         patch("app.routers.onboarding.SchemaInspector.test_connection", return_value=True), \
         patch("app.routers.onboarding.SchemaInspector.introspect", return_value=SAMPLE_SCHEMA):
        mock_auth.return_value = {"tenant_id": "empresa_a", "role": "admin"}
        response = client.post(
            "/onboarding/connect",
            json={
                "connection_string": "Server=prod;Database=hr;",
                "company_name": "Empresa HR",
                "tenant_id": "empresa_a",
            },
            headers={"authorization": "Bearer fake-token"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["tables_found"] == 2
    assert "dab_config" in data
    assert "next_steps" in data
    assert len(data["next_steps"]) == 3
