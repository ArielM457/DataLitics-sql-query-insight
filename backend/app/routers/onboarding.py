"""Onboarding Router — Tenant connection, schema management, and connection test.

Endpoints:
    POST /onboarding/connect         — Connect a new company DB + generate DAB config
    POST /onboarding/test            — Test a connection string (no DB write)
    GET  /onboarding/schema/{id}     — Retrieve the current schema for a tenant
"""

import logging
import os
import time

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.auth import set_user_claims, verify_firebase_token, verify_firebase_token_light
from app.core.dab_generator import DabConfigGenerator
from app.core.schema_inspector import SchemaInspector
from app.models.request import OnboardingRequest

logger = logging.getLogger("dataagent.routers.onboarding")

router = APIRouter()


class TestConnectionRequest(BaseModel):
    connection_string: str


# ─── POST /onboarding/test ────────────────────────────────────────────────────

@router.post("/test")
async def test_connection(
    request: TestConnectionRequest,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Test a connection string without saving any configuration.

    Used by the /join form to validate the DB credentials before submitting.
    Returns latency in ms on success.
    """
    token = authorization.replace("Bearer ", "")
    # Only need to be authenticated, not admin (just testing a connection)
    await verify_firebase_token_light(token)

    start = time.time()
    inspector = SchemaInspector(request.connection_string)
    ok, err = inspector.test_connection()
    latency_ms = round((time.time() - start) * 1000)

    if not ok:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot connect to the database: {err}",
        )

    return {"success": True, "latency_ms": latency_ms}


# ─── POST /onboarding/connect ─────────────────────────────────────────────────

@router.post("/connect")
async def connect_company(
    request: OnboardingRequest,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Connect a new company by introspecting its database and generating DAB config.

    Validates the connection string, introspects all tables and columns,
    auto-detects sensitive columns (salary, ssn, etc.), and generates a
    ready-to-deploy dab-config.json with role-based permissions.

    Requires admin role. After successful connection, updates the admin's
    Firebase custom claims with the real tenant_id (replacing pending_onboarding).

    Args:
        request: Connection details — connection_string, company_name, tenant_id.
        authorization: Bearer token from Firebase Auth (admin role required).

    Returns:
        dict: Schema summary, generated dab-config, and deployment next steps.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)

        if user_context["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail="Only admin users can onboard new companies",
            )

        uid = user_context["uid"]
        logger.info(
            "Onboarding request from uid=%s (current tenant=%s) → new tenant=%s",
            uid, user_context["tenant_id"], request.tenant_id,
        )

        inspector = SchemaInspector(request.connection_string)

        ok, err = inspector.test_connection()
        if not ok:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot connect to the database: {err}",
            )

        schema = inspector.introspect()

        if not schema:
            raise HTTPException(
                status_code=400,
                detail="No tables found in the database.",
            )

        env_var_name = f"TENANT_{request.tenant_id.upper()}_CONNECTION"
        dab_config = DabConfigGenerator().generate(
            tenant_id=request.tenant_id,
            schema=schema,
            connection_env_var=env_var_name,
        )

        schema_summary = {
            table: {
                "total_columns": len(info["columns"]),
                "sensitive_columns_excluded_for_analyst": [
                    col["name"] for col in info["columns"] if col.get("sensitive")
                ],
            }
            for table, info in schema.items()
        }

        # Update admin's custom claims with the real tenant_id
        claims_updated = await set_user_claims(uid, {
            "role": "admin",
            "tenant_id": request.tenant_id,
            "status": "active",
            "allowed_tables": [],
            "restricted_columns": [],
        })

        logger.info(
            "Onboarding complete for tenant=%s — %d tables found, claims_updated=%s",
            request.tenant_id, len(schema), claims_updated,
        )

        return {
            "status": "ok",
            "tenant_id": request.tenant_id,
            "company_name": request.company_name,
            "tables_found": len(schema),
            "schema_summary": schema_summary,
            "dab_config": dab_config,
            "claims_updated": claims_updated,
            "next_steps": [
                f"Add {env_var_name} to the DAB Container App environment variables",
                "Deploy DAB container using the generated dab-config above",
                f"Add DAB_BASE_URL_{request.tenant_id.upper()} to the backend Container App",
                "Refresh your Firebase token in the app to get the updated tenant_id",
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Onboarding failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e


# ─── GET /onboarding/schema/{tenant_id} ──────────────────────────────────────

@router.get("/schema/{tenant_id}")
async def get_schema(
    tenant_id: str,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Retrieve the current database schema for a tenant by introspecting it live.

    Reads the connection string from the environment variable
    TENANT_{TENANT_ID}_CONNECTION and introspects the database.

    Args:
        tenant_id: The tenant identifier.
        authorization: Bearer token from Firebase Auth.

    Returns:
        dict: Tables and columns with type and sensitivity information.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)

        if user_context["tenant_id"] != tenant_id and user_context["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail="Cannot access schema for a different tenant",
            )

        env_var_name = f"TENANT_{tenant_id.upper()}_CONNECTION"
        connection_string = os.getenv(env_var_name)

        if not connection_string:
            raise HTTPException(
                status_code=404,
                detail=f"Tenant '{tenant_id}' is not configured on this server",
            )

        schema = SchemaInspector(connection_string).introspect()

        return {
            "tenant_id": tenant_id,
            "tables": len(schema),
            "schema": schema,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Schema retrieval failed for tenant=%s: %s", tenant_id, str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e
