"""Audit Router — Query history, security metrics, and export.

Provides endpoints for retrieving audit logs, security dashboard
metrics, and CSV export of query history for compliance.
"""

import logging

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.core.audit_store import audit_store
from app.core.auth import verify_firebase_token

logger = logging.getLogger("dataagent.routers.audit")

router = APIRouter()


@router.get("/logs")
async def get_audit_logs(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
    status: str | None = Query(None, description="Filter by status"),
    risk_level: str | None = Query(None, description="Filter by risk level"),
    limit: int = Query(100, description="Max entries to return"),
):
    """Retrieve filterable query audit logs.

    Returns the history of all queries executed, including user,
    question, status, risk level, and any security blocks.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)
        tenant_id = user_context["tenant_id"]

        logs = audit_store.get_logs(
            tenant_id=tenant_id,
            status=status,
            risk_level=risk_level,
            limit=limit,
        )

        return {"logs": logs, "total": len(logs)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Audit logs retrieval failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/security")
async def get_security_metrics(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Retrieve security dashboard metrics.

    Returns aggregated security metrics including blocked threats,
    out-of-context queries, and restricted access attempts.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)
        tenant_id = user_context["tenant_id"]

        metrics = audit_store.get_security_metrics(tenant_id=tenant_id)

        return metrics

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Security metrics retrieval failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/export")
async def export_audit_csv(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Export audit history as CSV.

    Generates and returns a CSV file containing the complete
    query audit history for the tenant.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)
        tenant_id = user_context["tenant_id"]

        csv_content = audit_store.export_csv(tenant_id=tenant_id)

        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=audit_{tenant_id}.csv"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("CSV export failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e
