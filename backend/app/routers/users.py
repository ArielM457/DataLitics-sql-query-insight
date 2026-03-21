"""Users Router — Registration and status endpoints.

These endpoints use light token verification (no claims required)
because they are called during the registration flow before claims are set.

Endpoints:
    POST /users/register/admin    — Register a new company admin
    POST /users/register/analyst  — Register an analyst with invite code
    GET  /users/status            — Check own status (used by /pending polling)
"""

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.auth import set_user_claims, verify_firebase_token, verify_firebase_token_light
from app.core.user_store import user_store

logger = logging.getLogger("dataagent.routers.users")

router = APIRouter()


class RegisterAnalystRequest(BaseModel):
    invite_code: str
    name: str
    email: str


# ─── POST /users/register/admin ──────────────────────────────────────────────

@router.post("/register/admin")
async def register_admin(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Register a new company admin.

    Called immediately after Firebase user creation for "company" account type.
    Sets initial custom claims: role=admin, tenant_id=pending_onboarding, status=active.

    The admin can then call POST /onboarding/connect to set their real tenant_id.
    """
    token = authorization.replace("Bearer ", "")
    identity = await verify_firebase_token_light(token)
    uid = identity["uid"]

    await set_user_claims(uid, {
        "role": "admin",
        "tenant_id": "pending_onboarding",
        "status": "active",
        "allowed_tables": [],
        "restricted_columns": [],
    })

    logger.info("Registered admin uid=%s", uid)
    return {"status": "ok", "role": "admin", "message": "Admin registered. Proceed to onboarding."}


# ─── POST /users/register/analyst ────────────────────────────────────────────

@router.post("/register/analyst")
async def register_analyst(
    request: RegisterAnalystRequest,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Register a new analyst using an invite code.

    Validates the code, sets pending claims, and adds user to the approval queue.
    The admin must approve before status changes to 'active'.
    """
    token = authorization.replace("Bearer ", "")
    identity = await verify_firebase_token_light(token)
    uid = identity["uid"]

    # Validate the invite code
    invite, error = user_store.validate_invite_code(request.invite_code)
    if error:
        raise HTTPException(status_code=400, detail=error)

    # Mark code as used
    user_store.mark_code_used(request.invite_code)

    # Add to pending queue
    user_store.add_pending_user(
        uid=uid,
        email=request.email,
        name=request.name,
        tenant_id=invite.tenant_id,
        company_name=invite.company_name,
    )

    # Set initial custom claims (pending status — no access until approved)
    await set_user_claims(uid, {
        "role": "analyst",
        "tenant_id": invite.tenant_id,
        "status": "pending",
        "allowed_tables": [],
        "restricted_columns": [],
    })

    logger.info(
        "Registered analyst uid=%s for tenant=%s (pending approval)",
        uid, invite.tenant_id,
    )
    return {
        "status": "ok",
        "role": "analyst",
        "tenant_id": invite.tenant_id,
        "company_name": invite.company_name,
        "message": "Registration successful. Waiting for admin approval.",
    }


# ─── GET /users/status ────────────────────────────────────────────────────────

@router.get("/status")
async def get_user_status(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Check the current user's approval status.

    Used by the /pending page to poll whether the admin has approved them.
    Returns status from user_store (updated when admin approves/rejects).

    In production with Firebase, the frontend should also force-refresh the
    token after receiving 'approved' to pick up the updated claims.
    """
    token = authorization.replace("Bearer ", "")

    # Try full verification first (user may already have claims)
    try:
        user_context = await verify_firebase_token(token)
        uid = user_context["uid"]
    except HTTPException:
        # Fall back to light verification (no claims yet)
        identity = await verify_firebase_token_light(token)
        uid = identity["uid"]

    pending_user = user_store.get_user(uid)
    if pending_user:
        return {
            "uid": uid,
            "status": pending_user.status,
            "tenant_id": pending_user.tenant_id,
            "company_name": pending_user.company_name,
        }

    # User not in pending store — assume active (they may have been registered
    # via the old localStorage flow or are an admin)
    return {"uid": uid, "status": "active"}
