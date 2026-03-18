"""Audit Router — Query history, security metrics, and export."""

import logging

from fastapi import APIRouter, Header, HTTPException

from app.core.auth import verify_firebase_token

logger = logging.getLogger("dataagent.routers.audit")

router = APIRouter()


@router.get("/logs")
async def get_audit_logs(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Retrieve filterable query audit logs.

    Returns the history of all queries executed, including user,
    question, status, risk level, and any security blocks.

    Args:
        authorization: Bearer token from Firebase Auth.

    Returns:
        list: Audit log entries.
    """
    try:
        token = authorization.replace("Bearer ", "")
        await verify_firebase_token(token)

        # TODO: Issue #18 — Implement audit log retrieval
        raise NotImplementedError("Pending implementation - Issue #18")

    except HTTPException:
        raise
    except NotImplementedError:
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

    Args:
        authorization: Bearer token from Firebase Auth.

    Returns:
        dict: Security metrics summary.
    """
    try:
        token = authorization.replace("Bearer ", "")
        await verify_firebase_token(token)

        # TODO: Issue #19 — Implement security metrics dashboard
        raise NotImplementedError("Pending implementation - Issue #19")

    except HTTPException:
        raise
    except NotImplementedError:
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

    Args:
        authorization: Bearer token from Firebase Auth.

    Returns:
        StreamingResponse: CSV file download.
    """
    try:
        token = authorization.replace("Bearer ", "")
        await verify_firebase_token(token)

        # TODO: Issue #18 — Implement CSV export of audit logs
        raise NotImplementedError("Pending implementation - Issue #18")

    except HTTPException:
        raise
    except NotImplementedError:
        raise
    except Exception as e:
        logger.error("CSV export failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e
