"""Conversation Store — Firestore-backed store for chat conversation history.

Persists full message threads (analytics and skills chatbot conversations)
so admins can review and restore past sessions.
"""

import logging
import threading
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("dataagent.core.conversation_store")

_COLLECTION = "conversations"


def _get_firestore():
    try:
        from firebase_admin import firestore
        return firestore.client()
    except Exception:
        return None


class ConversationStore:
    """Firestore-backed store for chat conversations.

    Each conversation stores the full message thread, the tenant, the type
    (analytics_chat or skills_chat), a short preview, and a timestamp.
    """

    def __init__(self):
        self._conversations: dict[str, dict] = {}
        self._load_from_firestore()

    def _load_from_firestore(self):
        try:
            db = _get_firestore()
            if not db:
                logger.info("Firestore not available — conversation store in memory-only mode")
                return
            docs = (
                db.collection(_COLLECTION)
                .order_by("created_at", direction="DESCENDING")
                .limit(300)
                .stream()
            )
            for d in docs:
                data = d.to_dict()
                self._conversations[data["id"]] = data
            logger.info("Loaded %d conversations from Firestore", len(self._conversations))
        except Exception as e:
            logger.warning("Could not load conversations from Firestore: %s", e)

    def reload(self):
        self._conversations.clear()
        self._load_from_firestore()

    def _write_async(self, conv_id: str, data: dict):
        def _write():
            try:
                db = _get_firestore()
                if db:
                    db.collection(_COLLECTION).document(conv_id).set(data)
            except Exception as ex:
                logger.warning("Firestore write failed (conversations/%s): %s", conv_id, ex)
        threading.Thread(target=_write, daemon=True).start()

    def save(
        self,
        tenant_id: str,
        conv_type: str,
        messages: list[dict],
        preview: str,
        conv_id: str | None = None,
    ) -> dict:
        """Create or update a conversation (upsert).

        Pass conv_id to update an existing conversation, omit to create a new one.

        Args:
            tenant_id: The tenant this conversation belongs to.
            conv_type: 'analytics_chat' or 'skills_chat'.
            messages: Full message thread [{role, content}, ...].
            preview: Short summary (first user message truncated).
            conv_id: Existing conversation ID to update, or None to create new.

        Returns:
            dict: Saved conversation entry (without messages).
        """
        conv_id = conv_id or str(uuid.uuid4())
        entry = {
            "id": conv_id,
            "tenant_id": tenant_id,
            "type": conv_type,
            "messages": messages,
            "preview": preview[:150],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "message_count": len(messages),
        }
        self._conversations[conv_id] = entry
        self._write_async(conv_id, entry)
        logger.info(
            "Saved conversation id=%s type=%s tenant=%s messages=%d",
            conv_id, conv_type, tenant_id, len(messages),
        )
        return {k: v for k, v in entry.items() if k != "messages"}

    def get_recent(self, tenant_id: str, limit: int = 30) -> list[dict]:
        """Return recent conversations for the tenant (no messages, just metadata)."""
        convs = [c for c in self._conversations.values() if c["tenant_id"] == tenant_id]
        convs.sort(key=lambda x: x["created_at"], reverse=True)
        return [
            {k: v for k, v in c.items() if k != "messages"}
            for c in convs[:limit]
        ]

    def get_by_id(self, tenant_id: str, conv_id: str) -> dict | None:
        """Return a full conversation including messages, or None if not found."""
        conv = self._conversations.get(conv_id)
        if conv and conv["tenant_id"] == tenant_id:
            return conv
        return None


conversation_store = ConversationStore()
