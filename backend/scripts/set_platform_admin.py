"""One-time script to grant platform_admin role to a Firebase user.

Usage:
    1. Make sure FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CREDENTIALS_PATH is set.
    2. Run:
         python scripts/set_platform_admin.py <firebase_uid>

    The UID is found in Firebase Console → Authentication → Users.

Example:
    python scripts/set_platform_admin.py abc123XYZfirebaseUID
"""

import sys
import os

# Make sure we can import from app/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/set_platform_admin.py <firebase_uid>")
        sys.exit(1)

    uid = sys.argv[1].strip()

    # Initialize Firebase Admin SDK
    import firebase_admin
    from firebase_admin import auth, credentials

    cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "")
    cred_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")

    if cred_json:
        import json
        cred = credentials.Certificate(json.loads(cred_json))
    elif cred_path:
        cred = credentials.Certificate(cred_path)
    else:
        print("ERROR: Set FIREBASE_CREDENTIALS_PATH or FIREBASE_SERVICE_ACCOUNT_JSON")
        sys.exit(1)

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

    # Set the platform_admin claim
    auth.set_custom_user_claims(uid, {"role": "platform_admin"})
    print(f"✓ platform_admin claims set for uid={uid}")
    print("  The user must sign out and sign back in for the new role to take effect.")


if __name__ == "__main__":
    main()
