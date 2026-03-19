"""Onboarding Router — Tenant connection and schema management."""

import logging
import os

from fastapi import APIRouter, Header, HTTPException

from app.core.auth import verify_firebase_token
from app.core.dab_generator import DabConfigGenerator
from app.core.schema_inspector import SchemaInspector
from app.models.request import OnboardingRequest

logger = logging.getLogger("dataagent.routers.onboarding")

router = APIRouter()


@router.post("/connect")
async def connect_company(
    request: OnboardingRequest,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Connect a new company by introspecting its database and generating DAB config.

    Validates the connection string, introspects all tables and columns,
    auto-detects sensitive columns (salary, ssn, etc.), and generates a
    ready-to-deploy dab-config.json with role-based permissions.

    Requires admin role.

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

        logger.info("Onboarding request from tenant=%s", user_context["tenant_id"])

        inspector = SchemaInspector(request.connection_string)

        if not inspector.test_connection():
            raise HTTPException(
                status_code=400,
                detail="Cannot connect to the database. Verify the connection string.",
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

        logger.info(
            "Onboarding complete for tenant=%s — %d tables found",
            request.tenant_id,
            len(schema),
        )

        return {
            "status": "ok",
            "tenant_id": request.tenant_id,
            "company_name": request.company_name,
            "tables_found": len(schema),
            "schema_summary": schema_summary,
            "dab_config": dab_config,
            "next_steps": [
                f"Add {env_var_name} to the DAB Container App environment variables",
                f"Deploy DAB container using the generated dab-config above",
                f"Add DAB_BASE_URL_{request.tenant_id.upper()} to the backend Container App",
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Onboarding failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e


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
