"""Firebase Authentication — Token verification and user context extraction."""

from fastapi import HTTPException


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
    # TODO: Issue #10 — Implement Firebase Admin SDK verification
    if not token:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Placeholder: decode the token and extract claims
    decoded_token = None  # firebase_admin.auth.verify_id_token(token)

    if decoded_token is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    tenant_id = None  # decoded_token.get("tenant_id")

    if not tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Token does not contain a valid tenant_id",
        )

    return {
        "tenant_id": tenant_id,
        "role": "",
        "allowed_tables": [],
        "restricted_columns": [],
    }
