# Issue #04 — Firebase Authentication: Progress & Implementation

**Type:** Security · **Priority:** High

---

## What Was Implemented

### Firebase Admin SDK (`backend/app/core/auth.py`)

Replaced the full placeholder with a production-ready implementation using the Firebase Admin SDK.

**Initialization — lazy singleton:**

The Firebase app is initialized once on first use. Credentials are loaded in this order:
1. `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable — JSON content of the service account (preferred for containers).
2. `FIREBASE_CREDENTIALS_PATH` — path to a local credentials file (fallback for local dev).

If neither is configured, the app raises a `RuntimeError` at startup.

**`verify_firebase_token(token: str) -> dict`:**

- Returns 401 immediately if the token string is empty.
- Calls `firebase_auth.verify_id_token(token)` — validates the token signature against Google's public keys and checks expiry.
- Returns 401 if Firebase rejects the token for any reason (expired, tampered, revoked).
- Returns 403 if the decoded token does not contain a `tenant_id` custom claim.
- On success, returns a user context dict:

```python
{
    "tenant_id": str,       # e.g. "empresa_a"
    "role": str,            # e.g. "analyst" | "manager" | "admin"
    "allowed_tables": list, # tables the user can access
    "restricted_columns": list  # columns excluded for this user
}
```

### Configuration (`backend/app/config.py`)

Added `FIREBASE_SERVICE_ACCOUNT_JSON: str = ""` to the `Settings` model, loaded from the environment via pydantic-settings.

### Secret in Azure Container Apps

The Firebase service account JSON is stored as a Container App secret (`firebase-sa-json`) and injected as `FIREBASE_SERVICE_ACCOUNT_JSON`. The JSON file is never committed to the repository.

### GitHub Secret

`FIREBASE_SERVICE_ACCOUNT_JSON` added to GitHub repository secrets so the CI/CD pipeline can inject it into the Container App at deploy time.

---

## Custom Claims Required

For the auth to work end-to-end, Firebase tokens must carry custom claims set at login time by the auth module:

```python
firebase_admin.auth.set_custom_user_claims(uid, {
    "tenant_id": "empresa_a",
    "role": "analyst",          # analyst | manager | admin
    "allowed_tables": [],
    "restricted_columns": []
})
```

This is the responsibility of the authentication module / frontend team.

---

## Acceptance Criteria Status

| Criterion | Status |
|---|---|
| Firebase Admin SDK initialized from env var (no hardcoded credentials) | ✅ Done |
| Token verification rejects invalid/expired tokens with 401 | ✅ Done |
| Missing `tenant_id` claim rejected with 403 | ✅ Done |
| `tenant_id` and `role` extracted and returned to callers | ✅ Done |
| Credentials stored as Azure Container App secret | ✅ Done |
| Credentials stored as GitHub Actions secret | ✅ Done |
| Custom claims structure defined | ✅ Done — needs frontend/auth team to set them on login |
