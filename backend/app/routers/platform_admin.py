"""Platform Admin Router — Cross-tenant read access for the platform superadmin.

All endpoints require role=platform_admin (no tenant_id needed).

Endpoints:
    GET  /platform/users        — All registered users across all tenants
    GET  /platform/companies    — All unique companies/tenants
    POST /platform/setup        — One-time: set platform_admin claims for a UID
"""

import logging
import os

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.auth import set_user_claims, verify_platform_admin_token
from app.core.user_store import user_store

logger = logging.getLogger("dataagent.routers.platform_admin")

router = APIRouter()


# ─── GET /platform/users ──────────────────────────────────────────────────────

@router.get("/users")
async def get_all_users(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Return all registered users across all tenants."""
    token = authorization.replace("Bearer ", "")
    await verify_platform_admin_token(token)
    return user_store.get_all_users()


# ─── GET /platform/companies ──────────────────────────────────────────────────

@router.get("/companies")
async def get_all_companies(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Return all unique companies/tenants derived from registered users."""
    token = authorization.replace("Bearer ", "")
    await verify_platform_admin_token(token)

    all_users = user_store.get_all_users()
    seen: set[str] = set()
    companies = []
    for u in all_users:
        tid = u.get("tenant_id", "")
        if tid and tid not in seen:
            seen.add(tid)
            companies.append({
                "tenant_id": tid,
                "company_name": u.get("company_name", tid),
                "user_count": sum(1 for x in all_users if x.get("tenant_id") == tid),
            })

    return companies


# ─── POST /platform/setup ─────────────────────────────────────────────────────

class PlatformAdminSetupRequest(BaseModel):
    uid: str
    setup_secret: str


@router.post("/setup")
async def setup_platform_admin(request: PlatformAdminSetupRequest):
    """One-time endpoint to grant platform_admin role to a Firebase user.

    Protected by PLATFORM_ADMIN_SECRET environment variable.
    Set this env var before calling — remove it or rotate after use.
    """
    expected_secret = os.environ.get("PLATFORM_ADMIN_SECRET", "")
    if not expected_secret:
        raise HTTPException(
            status_code=503,
            detail="PLATFORM_ADMIN_SECRET is not set. Configure it in the backend environment.",
        )
    if request.setup_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid setup secret")

    await set_user_claims(request.uid, {"role": "platform_admin"})

    logger.info("Platform admin claims set for uid=%s", request.uid)
    return {"status": "ok", "uid": request.uid, "role": "platform_admin"}
