"""Basic tests for the DataAgent backend.

Verifies:
    1. The /health endpoint responds with 200 and correct payload
    2. All routers are registered on the app
    3. All agent classes can be imported without errors
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_200():
    """Verify that GET /health returns 200 with the expected JSON body."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "dataagent-backend"


def test_routers_are_registered():
    """Verify that all expected routers are registered in the app."""
    route_paths = [route.path for route in app.routes]
    assert "/health" in route_paths
    assert "/query" in route_paths
    assert "/onboarding/connect" in route_paths
    assert "/onboarding/schema/{tenant_id}" in route_paths
    assert "/audit/logs" in route_paths
    assert "/audit/security" in route_paths
    assert "/audit/export" in route_paths


def test_agents_can_be_imported():
    """Verify that all agent classes can be imported without errors."""
    from app.agents.agent_intention import IntentionAgent
    from app.agents.agent_sql import SQLAgent
    from app.agents.agent_execution import ExecutionAgent
    from app.agents.agent_insights import InsightsAgent

    # Verify classes are instantiable
    assert IntentionAgent is not None
    assert SQLAgent is not None
    assert ExecutionAgent is not None
    assert InsightsAgent is not None

    # Verify instances can be created
    intention = IntentionAgent()
    sql = SQLAgent()
    execution = ExecutionAgent()
    insights = InsightsAgent()

    assert intention is not None
    assert sql is not None
    assert execution is not None
    assert insights is not None
