"""Onboarding Router — Tenant connection and schema management."""

import logging

from fastapi import APIRouter, Header, HTTPException

from app.core.auth import verify_firebase_token
from app.models.request import OnboardingRequest

logger = logging.getLogger("dataagent.routers.onboarding")

router = APIRouter()


@router.post("/connect")
async def connect_company(
    request: OnboardingRequest,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Connect a new company by generating its DAB configuration.

    Receives a database connection string and company name, generates
    the appropriate dab-config.json, and indexes the database schema
    for use by the agents.

    Args:
        request: The onboarding request with connection details.
        authorization: Bearer token from Firebase Auth (admin role required).

    Returns:
        dict: Connection status and schema summary.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)
        logger.info("Onboarding request from tenant=%s", user_context["tenant_id"])

        # TODO: Issue #23 — Implement company onboarding and DAB config generation
        raise NotImplementedError("Pending implementation - Issue #23")

    except HTTPException:
        raise
    except NotImplementedError:
        raise
    except Exception as e:
        logger.error("Onboarding failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/schema/{tenant_id}")
async def get_schema(
    tenant_id: str,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Retrieve the indexed database schema for a tenant.

    Args:
        tenant_id: The tenant identifier.
        authorization: Bearer token from Firebase Auth.

    Returns:
        dict: The indexed database schema with tables and columns.
    """
    try:
        token = authorization.replace("Bearer ", "")
        await verify_firebase_token(token)

        # TODO: Issue #23 — Implement schema retrieval
        raise NotImplementedError("Pending implementation - Issue #23")

    except HTTPException:
        raise
    except NotImplementedError:
        raise
    except Exception as e:
        logger.error("Schema retrieval failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e
