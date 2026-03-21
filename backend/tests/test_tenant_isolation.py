"""Tenant isolation tests — verifies that multi-tenant data separation is enforced.

These tests verify that:
- Each tenant routes to its own isolated DAB container
- An unknown tenant is rejected with 403
- empresa_a and empresa_b never share the same DAB endpoint
- A token without tenant_id is rejected at the auth layer
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

from app.agents.agent_execution import get_dab_url


# ---------------------------------------------------------------------------
# DAB Routing isolation tests
# ---------------------------------------------------------------------------

def test_empresa_a_routes_to_its_own_dab():
    with patch("app.agents.agent_execution.settings") as mock_settings:
        mock_settings.DAB_BASE_URL_EMPRESA_A = "http://dataagent-dab-empresa-a"
        mock_settings.DAB_BASE_URL_EMPRESA_B = "http://dataagent-dab-empresa-b"
        url = get_dab_url("empresa_a")
        assert url == "http://dataagent-dab-empresa-a"


def test_empresa_b_routes_to_its_own_dab():
    with patch("app.agents.agent_execution.settings") as mock_settings:
        mock_settings.DAB_BASE_URL_EMPRESA_A = "http://dataagent-dab-empresa-a"
        mock_settings.DAB_BASE_URL_EMPRESA_B = "http://dataagent-dab-empresa-b"
        url = get_dab_url("empresa_b")
        assert url == "http://dataagent-dab-empresa-b"


def test_empresa_a_and_empresa_b_use_different_dab_containers():
    """Core isolation check: the two tenants must never share the same endpoint."""
    with patch("app.agents.agent_execution.settings") as mock_settings:
        mock_settings.DAB_BASE_URL_EMPRESA_A = "http://dataagent-dab-empresa-a"
        mock_settings.DAB_BASE_URL_EMPRESA_B = "http://dataagent-dab-empresa-b"
        url_a = get_dab_url("empresa_a")
        url_b = get_dab_url("empresa_b")
        assert url_a != url_b


def test_unknown_tenant_raises_403():
    with patch("app.agents.agent_execution.settings") as mock_settings:
        mock_settings.DAB_BASE_URL_EMPRESA_A = "http://dataagent-dab-empresa-a"
        mock_settings.DAB_BASE_URL_EMPRESA_B = "http://dataagent-dab-empresa-b"
        with pytest.raises(HTTPException) as exc_info:
            get_dab_url("empresa_c")
        assert exc_info.value.status_code == 403


def test_empty_tenant_id_raises_403():
    with patch("app.agents.agent_execution.settings") as mock_settings:
        mock_settings.DAB_BASE_URL_EMPRESA_A = "http://dataagent-dab-empresa-a"
        mock_settings.DAB_BASE_URL_EMPRESA_B = "http://dataagent-dab-empresa-b"
        with pytest.raises(HTTPException) as exc_info:
            get_dab_url("")
        assert exc_info.value.status_code == 403


def test_cross_tenant_access_blocked():
    """empresa_a cannot reach empresa_b's DAB URL and vice versa."""
    with patch("app.agents.agent_execution.settings") as mock_settings:
        mock_settings.DAB_BASE_URL_EMPRESA_A = "http://dataagent-dab-empresa-a"
        mock_settings.DAB_BASE_URL_EMPRESA_B = "http://dataagent-dab-empresa-b"
        url_a = get_dab_url("empresa_a")
        url_b = get_dab_url("empresa_b")
        assert "empresa-b" not in url_a
        assert "empresa-a" not in url_b


# ---------------------------------------------------------------------------
# Auth layer isolation tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_empty_token_raises_401():
    from app.core.auth import verify_firebase_token
    with pytest.raises(HTTPException) as exc_info:
        await verify_firebase_token("")
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_token_without_tenant_id_raises_403():
    from app.core.auth import verify_firebase_token
    with patch("app.core.auth._get_firebase_app"), \
         patch("app.core.auth.firebase_auth") as mock_auth:
        mock_auth.verify_id_token.return_value = {"uid": "test-uid"}  # no tenant_id
        with pytest.raises(HTTPException) as exc_info:
            await verify_firebase_token("valid-token-no-tenant")
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_valid_token_returns_correct_tenant_context():
    from app.core.auth import verify_firebase_token
    with patch("app.core.auth._get_firebase_app"), \
         patch("app.core.auth.firebase_auth") as mock_auth:
        mock_auth.verify_id_token.return_value = {
            "uid": "user-123",
            "tenant_id": "empresa_a",
            "role": "analyst",
            "allowed_tables": ["Sales", "Customers"],
            "restricted_columns": ["cost_price"],
        }
        context = await verify_firebase_token("valid-token")
        assert context["tenant_id"] == "empresa_a"
        assert context["role"] == "analyst"
        assert "Sales" in context["allowed_tables"]


@pytest.mark.asyncio
async def test_invalid_firebase_token_raises_401():
    from app.core.auth import verify_firebase_token
    with patch("app.core.auth._get_firebase_app"), \
         patch("app.core.auth.firebase_auth") as mock_auth:
        mock_auth.verify_id_token.side_effect = Exception("Token expired")
        with pytest.raises(HTTPException) as exc_info:
            await verify_firebase_token("expired-token")
        assert exc_info.value.status_code == 401
