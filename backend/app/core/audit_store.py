"""Audit Store — Persistent store for query audit logs and security events.

Writes to Firestore for persistence across restarts, with an in-memory
cache for fast reads. Falls back to memory-only if Firestore is unavailable.
"""

import csv
import io
import logging
import threading
from datetime import datetime, timezone

logger = logging.getLogger("dataagent.core.audit_store")

_AUDIT_COLLECTION = "audit_logs"
_SECURITY_COLLECTION = "security_events"


def _get_firestore():
    """Return Firestore client if Firebase is initialized, else None."""
    try:
        from firebase_admin import firestore
        return firestore.client()
    except Exception:
        return None


class AuditStore:
    """Firestore-backed audit log and security metrics store.

    Persists all events to Firestore and loads existing history on startup.
    Falls back to in-memory only if Firestore is not configured.
    """

    def __init__(self):
        self._logs: list[dict] = []
        self._security_events: list[dict] = []
        self._load_from_firestore()

    def _load_from_firestore(self):
        """Load existing audit logs and security events from Firestore on startup."""
        try:
            db = _get_firestore()
            if not db:
                return
            docs = db.collection(_AUDIT_COLLECTION).order_by("timestamp").limit(500).stream()
            for d in docs:
                self._logs.append(d.to_dict())
            docs = db.collection(_SECURITY_COLLECTION).order_by("timestamp").limit(500).stream()
            for d in docs:
                self._security_events.append(d.to_dict())
            logger.info(
                "Audit store loaded from Firestore: %d logs, %d security events",
                len(self._logs), len(self._security_events),
            )
        except Exception as e:
            logger.warning("Could not load audit store from Firestore: %s", e)

    def _write_async(self, collection_name: str, entry: dict):
        """Write a document to Firestore in a background thread (non-blocking)."""
        def _write():
            try:
                db = _get_firestore()
                if db:
                    db.collection(collection_name).add(entry)
            except Exception as ex:
                logger.warning("Firestore write failed (%s): %s", collection_name, ex)
        threading.Thread(target=_write, daemon=True).start()

    def log_query(
        self,
        tenant_id: str,
        user_role: str,
        question: str,
        sql: str,
        status: str,
        risk_level: str,
        block_type: str | None = None,
        block_reason: str | None = None,
        execution_time_ms: float = 0,
        rows_returned: int = 0,
        user_email: str = "",
        uid: str = "",
    ) -> dict:
        """Log a query execution to the audit trail.

        Args:
            tenant_id: The tenant identifier.
            user_role: The user's role.
            question: The original natural language question.
            sql: The generated SQL (or empty if blocked before generation).
            status: 'success', 'blocked', 'error'.
            risk_level: 'low', 'medium', 'high'.
            block_type: Type of block if applicable.
            block_reason: Reason for block if applicable.
            execution_time_ms: Total pipeline execution time.
            rows_returned: Number of rows returned.
            user_email: The user's email address.
            uid: The user's Firebase UID.

        Returns:
            dict: The created audit log entry.
        """
        entry = {
            "id": len(self._logs) + 1,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tenant_id": tenant_id,
            "user_role": user_role,
            "user_email": user_email,
            "uid": uid,
            "question": question,
            "sql": sql,
            "status": status,
            "risk_level": risk_level,
            "block_type": block_type,
            "block_reason": block_reason,
            "execution_time_ms": round(execution_time_ms, 2),
            "rows_returned": rows_returned,
        }
        self._logs.append(entry)
        self._write_async(_AUDIT_COLLECTION, entry)
        logger.info(
            "Audit log: id=%d, status=%s, risk=%s, tenant=%s",
            entry["id"], status, risk_level, tenant_id,
        )
        return entry

    def log_security_event(
        self,
        tenant_id: str,
        user_role: str,
        event_type: str,
        details: dict,
        user_email: str = "",
    ) -> dict:
        """Log a security event (threat detected, block, circuit breaker).

        Args:
            tenant_id: The tenant identifier.
            user_role: The user's role.
            event_type: 'prompt_shields', 'context_filter', 'circuit_breaker', 'risk_high'.
            details: Additional event details.
            user_email: The user's email address.

        Returns:
            dict: The created security event entry.
        """
        event = {
            "id": len(self._security_events) + 1,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tenant_id": tenant_id,
            "user_role": user_role,
            "user_email": user_email,
            "event_type": event_type,
            "details": details,
        }
        self._security_events.append(event)
        self._write_async(_SECURITY_COLLECTION, event)
        logger.info(
            "Security event: type=%s, tenant=%s, role=%s",
            event_type, tenant_id, user_role,
        )
        return event

    def get_logs(
        self,
        tenant_id: str | None = None,
        status: str | None = None,
        risk_level: str | None = None,
        user_email: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 100,
    ) -> list[dict]:
        """Retrieve audit logs with optional filters.

        Args:
            tenant_id: Filter by tenant (None = all tenants).
            status: Filter by status ('success', 'blocked', 'error').
            risk_level: Filter by risk level ('low', 'medium', 'high').
            user_email: Filter by user email (partial match).
            date_from: Filter from this ISO date (inclusive).
            date_to: Filter to this ISO date (inclusive).
            limit: Maximum number of entries to return.

        Returns:
            list: Filtered audit log entries, most recent first.
        """
        filtered = self._logs
        if tenant_id:
            filtered = [e for e in filtered if e["tenant_id"] == tenant_id]
        if status:
            filtered = [e for e in filtered if e["status"] == status]
        if risk_level:
            filtered = [e for e in filtered if e["risk_level"] == risk_level]
        if user_email:
            user_email_lower = user_email.lower()
            filtered = [
                e for e in filtered
                if user_email_lower in e.get("user_email", "").lower()
            ]
        if date_from:
            filtered = [e for e in filtered if e["timestamp"] >= date_from]
        if date_to:
            filtered = [e for e in filtered if e["timestamp"] <= date_to]
        return list(reversed(filtered))[:limit]

    def get_recent_events(
        self,
        tenant_id: str | None = None,
        limit: int = 10,
    ) -> list[dict]:
        """Get recent security events and query logs for activity feed.

        Merges security events and blocked/error queries, sorted by time.

        Returns:
            list: Recent activity entries, most recent first.
        """
        activities: list[dict] = []

        # Add security events
        events = self._security_events
        if tenant_id:
            events = [e for e in events if e["tenant_id"] == tenant_id]
        for ev in events:
            activities.append({
                "timestamp": ev["timestamp"],
                "type": "security",
                "event_type": ev["event_type"],
                "user_email": ev.get("user_email", ""),
                "details": ev.get("details", {}),
            })

        # Add blocked/error queries
        logs = self._logs
        if tenant_id:
            logs = [e for e in logs if e["tenant_id"] == tenant_id]
        for log in logs:
            if log["status"] in ("blocked", "error"):
                activities.append({
                    "timestamp": log["timestamp"],
                    "type": "block",
                    "event_type": log.get("block_type", "error"),
                    "user_email": log.get("user_email", ""),
                    "question": log.get("question", ""),
                    "details": {
                        "block_reason": log.get("block_reason", ""),
                        "risk_level": log.get("risk_level", ""),
                    },
                })
            elif log["status"] == "success":
                activities.append({
                    "timestamp": log["timestamp"],
                    "type": "success",
                    "event_type": "query_ok",
                    "user_email": log.get("user_email", ""),
                    "question": log.get("question", ""),
                    "details": {"rows_returned": log.get("rows_returned", 0)},
                })

        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        return activities[:limit]

    def get_security_metrics(self, tenant_id: str | None = None) -> dict:
        """Get aggregated security metrics for the dashboard.

        Args:
            tenant_id: Filter by tenant (None = all tenants).

        Returns:
            dict: Aggregated security metrics.
        """
        events = self._security_events
        if tenant_id:
            events = [e for e in events if e["tenant_id"] == tenant_id]

        # Count by event type from security events
        type_counts: dict[str, int] = {}
        attack_types: dict[str, int] = {}
        for event in events:
            et = event["event_type"]
            type_counts[et] = type_counts.get(et, 0) + 1
            attack_type = event.get("details", {}).get("attack_type")
            if attack_type:
                attack_types[attack_type] = attack_types.get(attack_type, 0) + 1

        # Also count blocked queries by block_type (out_of_domain, content_filter, etc.)
        logs = self._logs
        if tenant_id:
            logs = [e for e in logs if e["tenant_id"] == tenant_id]

        blocked_by_type: dict[str, int] = {}
        for log in logs:
            if log["status"] == "blocked" and log.get("block_type"):
                bt = log["block_type"]
                blocked_by_type[bt] = blocked_by_type.get(bt, 0) + 1

        total_blocked = sum(1 for l in logs if l["status"] == "blocked")

        return {
            "total_events": len(events) + total_blocked,
            "threats_blocked": (
                type_counts.get("prompt_shields", 0)
                + type_counts.get("content_filter_jailbreak", 0)
                + type_counts.get("content_filter", 0)
                + blocked_by_type.get("content_filter_jailbreak", 0)
                + blocked_by_type.get("content_filter", 0)
            ),
            "out_of_context": (
                type_counts.get("context_filter", 0)
                + blocked_by_type.get("out_of_domain", 0)
            ),
            "restricted_access": (
                type_counts.get("restricted_column_access", 0)
                + blocked_by_type.get("restricted_column", 0)
            ),
            "circuit_breaker_activations": type_counts.get("circuit_breaker", 0),
            "attack_type_breakdown": attack_types,
            "events_by_type": type_counts,
        }

    def export_csv(self, tenant_id: str | None = None) -> str:
        """Export audit logs as CSV string.

        Args:
            tenant_id: Filter by tenant (None = all tenants).

        Returns:
            str: CSV-formatted string of audit logs.
        """
        logs = self.get_logs(tenant_id=tenant_id, limit=10000)

        if not logs:
            return "No audit logs available.\n"

        output = io.StringIO()
        fieldnames = [
            "id", "timestamp", "tenant_id", "user_role", "user_email",
            "uid", "question", "sql", "status", "risk_level",
            "block_type", "block_reason", "execution_time_ms", "rows_returned",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
        return output.getvalue()


# Singleton instance
audit_store = AuditStore()
