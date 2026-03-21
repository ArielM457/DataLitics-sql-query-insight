"""Firebase Authentication — Token verification and user context extraction.

Two verification modes:

1. verify_firebase_token(token)  — Full verification.
   Requires valid token + tenant_id custom claim.
   Used by protected endpoints (/query, /audit, /admin/*).

2. verify_firebase_token_light(token) — Light verification.
   Only checks token validity + returns uid/email.
   Used by registration endpoints where the user has no claims yet.

Development mode (FIREBASE_PROJECT_ID not set):
   Both functions accept a JSON-encoded Bearer token:
     {"uid": "dev123", "tenant_id": "empresa_a", "role": "analyst"}
"""

import json
import logging

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger("dataagent.core.auth")

# Check if Firebase is configured
_firebase_configured = bool(settings.FIREBASE_PROJECT_ID)
_firebase_app = None


def _get_firebase_app():
    """Return the initialized Firebase app, or None if not configured."""
    return _firebase_app


if _firebase_configured:
    try:
        if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            import json as _json
            cred = credentials.Certificate(_json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
            logger.info("Firebase Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT_JSON env var")
        else:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            logger.info("Firebase Admin SDK initialized from credentials file")
        _firebase_app = firebase_admin.initialize_app(cred)
    except Exception as e:
        logger.warning("Firebase init failed — using dev mode: %s", e)
        _firebase_configured = False
else:
    logger.info(
        "Firebase not configured — using development mode. "
        "Pass a JSON object as Bearer token: "
        '{"uid": "dev123", "tenant_id": "empresa_a", "role": "analyst"}'
    )


# ─── Full verification (requires tenant_id claim) ────────────────────────────

async def verify_firebase_token(token: str) -> dict:
    """Verify a Firebase ID token and extract tenant context.

    Args:
        token: The Firebase ID token or dev-mode JSON string.

    Returns:
        dict with: tenant_id, role, allowed_tables, restricted_columns, uid.

    Raises:
        HTTPException(401): Token invalid/expired.
        HTTPException(403): Token missing tenant_id claim.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    if _get_firebase_app() is not None or _firebase_configured:
        return await _verify_production(token)
    return _verify_development(token)


async def _verify_production(token: str) -> dict:
    """Verify token using Firebase Admin SDK (full verification)."""
    try:
        decoded_token = firebase_auth.verify_id_token(token)

        tenant_id = decoded_token.get("tenant_id")
        if not tenant_id:
            raise HTTPException(
                status_code=403,
                detail="Token does not contain a valid tenant_id",
            )

        return {
            "uid": decoded_token.get("uid", ""),
            "tenant_id": tenant_id,
            "role": decoded_token.get("role", "analyst"),
            "allowed_tables": decoded_token.get("allowed_tables", []),
            "restricted_columns": decoded_token.get("restricted_columns", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Firebase token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token") from e


def _verify_development(token: str) -> dict:
    """Parse development mode JSON token (full verification)."""
    try:
        data = json.loads(token)
        tenant_id = data.get("tenant_id")
        if not tenant_id:
            raise HTTPException(
                status_code=403,
                detail="Dev token must include tenant_id",
            )
        return {
            "uid": data.get("uid", "dev_user"),
            "tenant_id": tenant_id,
            "role": data.get("role", "analyst"),
            "allowed_tables": data.get("allowed_tables", []),
            "restricted_columns": data.get("restricted_columns", []),
        }
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid dev token. Pass a JSON object: "
                '{"uid": "dev123", "tenant_id": "empresa_a", "role": "analyst"}'
            ),
        )


# ─── Light verification (only uid/email, no claims required) ─────────────────

async def verify_firebase_token_light(token: str) -> dict:
    """Verify token identity only — no custom claims required.

    Used by registration endpoints where the user has no claims yet.

    Returns:
        dict with: uid, email.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    if _get_firebase_app() is not None or _firebase_configured:
        return await _verify_production_light(token)
    return _verify_development_light(token)


async def _verify_production_light(token: str) -> dict:
    """Light verification using Firebase Admin SDK."""
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return {
            "uid": decoded_token.get("uid", decoded_token.get("sub", "")),
            "email": decoded_token.get("email", ""),
        }
    except Exception as e:
        logger.error("Firebase light token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token") from e


def _verify_development_light(token: str) -> dict:
    """Light verification for dev mode JSON token."""
    try:
        data = json.loads(token)
        uid = data.get("uid", "dev_user")
        return {
            "uid": uid,
            "email": data.get("email", f"{uid}@dev.local"),
        }
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid dev token. Pass a JSON object: "
                '{"uid": "dev123", "tenant_id": "empresa_a", "role": "analyst"}'
            ),
        )


# ─── Set custom claims ────────────────────────────────────────────────────────

async def set_user_claims(uid: str, claims: dict) -> bool:
    """Set Firebase custom claims for a user.

    Args:
        uid: The Firebase UID.
        claims: Dict of claims to set (tenant_id, role, status, etc.)

    Returns:
        True if claims were set, False if Firebase is not configured (dev mode).
    """
    if _get_firebase_app() is None and not _firebase_configured:
        logger.info(
            "Dev mode: skipping set_user_claims for uid=%s claims=%s", uid, claims
        )
        return False

    try:
        firebase_auth.set_custom_user_claims(uid, claims)
        logger.info("Set custom claims for uid=%s: %s", uid, claims)
        return True
    except Exception as e:
        logger.error("Failed to set custom claims for uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=500,
            detail="Failed to set user permissions. Please try again.",
        ) from e
