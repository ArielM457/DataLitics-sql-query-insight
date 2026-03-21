"""Firebase Authentication — Token verification and user context extraction.

Uses the Firebase Admin SDK to verify tokens. When Firebase is not
configured (M2 not deployed), falls back to a development mode that
accepts a JSON-encoded token for testing the agent pipeline.

Development mode token format (pass as Bearer token):
    {"tenant_id": "empresa_a", "role": "analyst"}
"""

import json
import logging

import json
import os

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger("dataagent.core.auth")

# Check if Firebase is configured
_firebase_configured = bool(settings.FIREBASE_PROJECT_ID)
_firebase_app = None

if _firebase_configured:
    try:
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized")
    except Exception as e:
        logger.warning("Firebase init failed — using dev mode: %s", e)
        _firebase_configured = False
else:
    logger.info(
        "Firebase not configured — using development mode. "
        "Pass a JSON object as Bearer token: "
        '{\"tenant_id\": \"empresa_a\", \"role\": \"analyst\"}'
    )


async def verify_firebase_token(token: str) -> dict:
    """Verify a Firebase ID token and extract tenant context.

    In production: Uses Firebase Admin SDK to verify the token.
    In development: Accepts a JSON-encoded string with tenant_id and role.

    Args:
        token: The Firebase ID token or dev-mode JSON string.

    Returns:
        dict: User context with tenant_id, role, allowed_tables, restricted_columns.

    Raises:
        HTTPException(401): If the token is invalid or expired.
        HTTPException(403): If the token does not contain a tenant_id.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    if _firebase_configured:
        return await _verify_production(token)
    return _verify_development(token)


async def _verify_production(token: str) -> dict:
    """Verify token using Firebase Admin SDK."""
    try:
        from firebase_admin import auth

        decoded_token = auth.verify_id_token(token)

        tenant_id = decoded_token.get("tenant_id")
        if not tenant_id:
            raise HTTPException(
                status_code=403,
                detail="Token does not contain a valid tenant_id",
            )

        return {
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
    """Parse development mode JSON token."""
    try:
        data = json.loads(token)
        tenant_id = data.get("tenant_id")
        if not tenant_id:
            raise HTTPException(
                status_code=403,
                detail="Dev token must include tenant_id",
            )
        return {
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
                '{"tenant_id": "empresa_a", "role": "analyst"}'
            ),
        )
