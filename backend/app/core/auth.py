"""Firebase Authentication — Token verification and user context extraction."""

import json
import os

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from fastapi import HTTPException

from app.config import settings

_firebase_app = None


def _get_firebase_app():
    """Initialize Firebase Admin SDK once (lazy singleton)."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    try:
        _firebase_app = firebase_admin.get_app()
    except ValueError:
        if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(cred_dict)
        elif os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        else:
            raise RuntimeError(
                "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON "
                "or FIREBASE_CREDENTIALS_PATH in the environment."
            )
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


async def verify_firebase_token(token: str) -> dict:
    """Verify a Firebase ID token and extract tenant context.

    Uses the Firebase Admin SDK to verify the token's signature and
    extract the user's tenant information, role, and data permissions.

    Args:
        token: The Firebase ID token from the Authorization header.

    Returns:
        dict: User context with the following shape:
            {
                "tenant_id": str,
                "role": str,
                "allowed_tables": list[str],
                "restricted_columns": list[str],
            }

    Raises:
        HTTPException(401): If the token is invalid or expired.
        HTTPException(403): If the token does not contain a tenant_id.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    _get_firebase_app()

    try:
        decoded_token = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

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
