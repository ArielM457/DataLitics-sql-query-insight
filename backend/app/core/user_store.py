"""User Store — In-memory store for invite codes and pending users.

Stores invite codes and pending user registrations in memory.
Acceptable for the hackathon (single-instance, no persistence needed).
In production, replace with Firestore collections.
"""

import logging
import secrets
import time
from dataclasses import asdict, dataclass

logger = logging.getLogger("dataagent.core.user_store")


@dataclass
class InviteCode:
    code: str
    tenant_id: str
    company_name: str
    created_by: str       # uid of the admin who generated it
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
    status: str = "pending"   # pending | approved | rejected

    def to_dict(self) -> dict:
        return asdict(self)


class UserStore:
    """Thread-safe in-memory store for invite codes and pending users."""

    def __init__(self):
        self._codes: dict[str, InviteCode] = {}
        self._pending: dict[str, PendingUser] = {}

    # ── Invite codes ──────────────────────────────────────────────────────────

    def generate_invite_code(
        self,
        tenant_id: str,
        company_name: str,
        created_by: str,
        expires_in_ms: int,
    ) -> InviteCode:
        """Generate a 6-char alphanumeric invite code."""
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
        logger.info("Generated invite code %s for tenant=%s", code, tenant_id)
        return entry

    def validate_invite_code(self, code: str) -> tuple[InviteCode | None, str | None]:
        """Validate an invite code. Returns (entry, None) or (None, error_reason)."""
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

    def get_codes_for_tenant(self, tenant_id: str) -> list[dict]:
        return [
            c.to_dict()
            for c in self._codes.values()
            if c.tenant_id == tenant_id
        ]

    # ── Pending users ─────────────────────────────────────────────────────────

    def add_pending_user(
        self,
        uid: str,
        email: str,
        name: str,
        tenant_id: str,
        company_name: str,
    ) -> PendingUser:
        """Add a user to the pending queue. Silently ignores duplicates."""
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
        logger.info("Added pending user uid=%s for tenant=%s", uid, tenant_id)
        return user

    def get_pending_for_tenant(self, tenant_id: str) -> list[dict]:
        return [
            u.to_dict()
            for u in self._pending.values()
            if u.tenant_id == tenant_id
        ]

    def update_user_status(self, uid: str, status: str) -> bool:
        """Update status for a pending user. Returns True if found."""
        if uid in self._pending:
            self._pending[uid].status = status
            return True
        return False

    def get_user(self, uid: str) -> PendingUser | None:
        return self._pending.get(uid)


# Singleton
user_store = UserStore()
