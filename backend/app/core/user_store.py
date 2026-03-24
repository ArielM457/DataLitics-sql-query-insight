"""User Store — Firestore-backed store for invite codes and pending users.

Persists all state to Firestore so data survives server restarts.
Falls back to in-memory if Firestore is unavailable (dev mode).
"""

import logging
import secrets
import threading
import time
from dataclasses import asdict, dataclass

logger = logging.getLogger("dataagent.core.user_store")

_CODES_COLLECTION = "invite_codes"
_PENDING_COLLECTION = "pending_users"


def _get_firestore():
    """Return Firestore client if Firebase is initialized, else None."""
    try:
        from firebase_admin import firestore
        return firestore.client()
    except Exception:
        return None


@dataclass
class InviteCode:
    code: str
    tenant_id: str
    company_name: str
    created_by: str
    created_at: float
    expires_at: float
    used: bool = False

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PendingUser:
    uid: str
    email: str
    name: str
    tenant_id: str
    company_name: str
    requested_at: float
    status: str = "pending"

    def to_dict(self) -> dict:
        return asdict(self)


class UserStore:
    """Firestore-backed store for invite codes and pending users.

    All writes go to Firestore asynchronously. Reads are served from the
    in-memory cache which is populated on startup from Firestore.
    Falls back to memory-only if Firestore is not configured.
    """

    def __init__(self):
        self._codes: dict[str, InviteCode] = {}
        self._pending: dict[str, PendingUser] = {}
        self._load_from_firestore()

    def _load_from_firestore(self):
        """Load existing invite codes and pending users from Firestore on startup."""
        try:
            db = _get_firestore()
            if not db:
                logger.info("Firestore not available — user store running in memory-only mode")
                return

            for doc in db.collection(_CODES_COLLECTION).stream():
                data = doc.to_dict()
                entry = InviteCode(**data)
                self._codes[entry.code] = entry

            for doc in db.collection(_PENDING_COLLECTION).stream():
                data = doc.to_dict()
                user = PendingUser(**data)
                self._pending[user.uid] = user

            logger.info(
                "User store loaded from Firestore: %d invite codes, %d pending users",
                len(self._codes), len(self._pending),
            )
        except Exception as e:
            logger.warning("Could not load user store from Firestore: %s", e)

    def reload(self):
        """Reload data from Firestore. Call this after Firebase is confirmed initialized."""
        self._codes.clear()
        self._pending.clear()
        self._load_from_firestore()

    def _write_async(self, collection: str, doc_id: str, data: dict):
        """Write a document to Firestore in a background thread (non-blocking)."""
        def _write():
            try:
                db = _get_firestore()
                if db:
                    db.collection(collection).document(doc_id).set(data)
            except Exception as ex:
                logger.warning("Firestore write failed (%s/%s): %s", collection, doc_id, ex)
        threading.Thread(target=_write, daemon=True).start()

    # ── Invite codes ───────────────────────────────────────────────────────────

    def generate_invite_code(
        self,
        tenant_id: str,
        company_name: str,
        created_by: str,
        expires_in_ms: int,
    ) -> InviteCode:
        code = secrets.token_urlsafe(6)[:6].upper()
        entry = InviteCode(
            code=code,
            tenant_id=tenant_id,
            company_name=company_name,
            created_by=created_by,
            created_at=time.time(),
            expires_at=time.time() + expires_in_ms / 1000,
            used=False,
        )
        self._codes[code] = entry
        self._write_async(_CODES_COLLECTION, code, entry.to_dict())
        logger.info("Generated invite code %s for tenant=%s", code, tenant_id)
        return entry

    def validate_invite_code(self, code: str) -> tuple[InviteCode | None, str | None]:
        entry = self._codes.get(code.upper())
        if not entry:
            return None, "Código no encontrado."
        if entry.used:
            return None, "El código ya fue utilizado."
        if time.time() > entry.expires_at:
            return None, "El código ha expirado."
        return entry, None

    def mark_code_used(self, code: str) -> None:
        entry = self._codes.get(code.upper())
        if entry:
            entry.used = True
            self._write_async(_CODES_COLLECTION, code, entry.to_dict())

    def get_codes_for_tenant(self, tenant_id: str) -> list[dict]:
        return [
            c.to_dict()
            for c in self._codes.values()
            if c.tenant_id == tenant_id
        ]

    # ── Pending users ──────────────────────────────────────────────────────────

    def add_pending_user(
        self,
        uid: str,
        email: str,
        name: str,
        tenant_id: str,
        company_name: str,
    ) -> PendingUser:
        if uid in self._pending:
            return self._pending[uid]
        user = PendingUser(
            uid=uid,
            email=email,
            name=name,
            tenant_id=tenant_id,
            company_name=company_name,
            requested_at=time.time(),
            status="pending",
        )
        self._pending[uid] = user
        self._write_async(_PENDING_COLLECTION, uid, user.to_dict())
        logger.info("Added pending user uid=%s for tenant=%s", uid, tenant_id)
        return user

    def get_pending_for_tenant(self, tenant_id: str) -> list[dict]:
        return [
            u.to_dict()
            for u in self._pending.values()
            if u.tenant_id == tenant_id
        ]

    def update_user_status(self, uid: str, status: str) -> bool:
        if uid in self._pending:
            self._pending[uid].status = status
            self._write_async(_PENDING_COLLECTION, uid, self._pending[uid].to_dict())
            return True
        return False

    def get_user(self, uid: str) -> PendingUser | None:
        return self._pending.get(uid)


# Singleton
user_store = UserStore()
