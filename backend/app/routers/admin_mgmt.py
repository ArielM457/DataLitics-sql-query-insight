"""Admin Management Router — Invite codes and user approval.

All endpoints require admin role.

Endpoints:
    POST /admin/invite-codes          — Generate a new invite code
    GET  /admin/invite-codes          — List all invite codes for the tenant
    GET  /admin/pending-users         — List pending users for the tenant
    POST /admin/approve/{uid}         — Approve a pending analyst
    POST /admin/reject/{uid}          — Reject a pending analyst
"""

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.auth import set_user_claims, verify_firebase_token
from app.core.user_store import user_store

logger = logging.getLogger("dataagent.routers.admin_mgmt")

router = APIRouter()


class InviteCodeRequest(BaseModel):
    expires_in_ms: int = 3_600_000   # default 1 hour


def _require_admin(user_context: dict) -> None:
    if user_context.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")


# ─── POST /admin/invite-codes ─────────────────────────────────────────────────

@router.post("/invite-codes")
async def create_invite_code(
    request: InviteCodeRequest,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Generate a new invite code for the admin's tenant.

    The code is single-use and expires after `expires_in_ms` milliseconds.
    """
    token = authorization.replace("Bearer ", "")
    user_context = await verify_firebase_token(token)
    _require_admin(user_context)

    tenant_id = user_context["tenant_id"]
    uid = user_context["uid"]

    # Get company name from the first pending user or use tenant_id as fallback
    pending = user_store.get_pending_for_tenant(tenant_id)
    company_name = pending[0]["company_name"] if pending else tenant_id

    code = user_store.generate_invite_code(
        tenant_id=tenant_id,
        company_name=company_name,
        created_by=uid,
        expires_in_ms=request.expires_in_ms,
    )

    logger.info("Admin uid=%s generated invite code for tenant=%s", uid, tenant_id)
    return code.to_dict()


# ─── GET /admin/invite-codes ──────────────────────────────────────────────────

@router.get("/invite-codes")
async def list_invite_codes(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """List all invite codes generated for the admin's tenant."""
    token = authorization.replace("Bearer ", "")
    user_context = await verify_firebase_token(token)
    _require_admin(user_context)

    tenant_id = user_context["tenant_id"]
    return user_store.get_codes_for_tenant(tenant_id)


# ─── GET /admin/pending-users ─────────────────────────────────────────────────

@router.get("/pending-users")
async def list_pending_users(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """List all pending user registrations for the admin's tenant."""
    token = authorization.replace("Bearer ", "")
    user_context = await verify_firebase_token(token)
    _require_admin(user_context)

    tenant_id = user_context["tenant_id"]
    return user_store.get_pending_for_tenant(tenant_id)


# ─── POST /admin/approve/{uid} ────────────────────────────────────────────────

@router.post("/approve/{uid}")
async def approve_user(
    uid: str,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Approve a pending analyst.

    Sets their Firebase custom claims to status=active and updates
    the pending_users store.
    """
    token = authorization.replace("Bearer ", "")
    user_context = await verify_firebase_token(token)
    _require_admin(user_context)

    tenant_id = user_context["tenant_id"]

    # Verify the user belongs to this tenant
    pending_user = user_store.get_user(uid)
    if not pending_user:
        raise HTTPException(status_code=404, detail="User not found in pending queue")
    if pending_user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot approve a user from a different tenant",
        )

    # Set custom claims: status=active
    await set_user_claims(uid, {
        "role": "analyst",
        "tenant_id": tenant_id,
        "status": "active",
        "allowed_tables": [],
        "restricted_columns": [],
    })

    # Update pending store
    user_store.update_user_status(uid, "approved")

    logger.info(
        "Admin tenant=%s approved analyst uid=%s",
        tenant_id, uid,
    )
    return {"status": "ok", "uid": uid, "approved": True}


# ─── POST /admin/reject/{uid} ─────────────────────────────────────────────────

@router.post("/reject/{uid}")
async def reject_user(
    uid: str,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Reject a pending analyst."""
    token = authorization.replace("Bearer ", "")
    user_context = await verify_firebase_token(token)
    _require_admin(user_context)

    tenant_id = user_context["tenant_id"]

    pending_user = user_store.get_user(uid)
    if not pending_user:
        raise HTTPException(status_code=404, detail="User not found in pending queue")
    if pending_user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot reject a user from a different tenant",
        )

    user_store.update_user_status(uid, "rejected")

    logger.info("Admin tenant=%s rejected analyst uid=%s", tenant_id, uid)
    return {"status": "ok", "uid": uid, "rejected": True}
