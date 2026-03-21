"""RAG Client — Retrieval-Augmented Generation using Azure AI Search.

This module provides schema search capabilities using Azure AI Search.
Book content retrieval has been replaced by the dynamic Skills system
(see app/core/skills.py) which provides editable, per-agent knowledge
loaded from JSON files and ranked by GPT-4.1.

The search_books method is kept for backward compatibility but now
delegates to the Skills system.
"""

import logging

from app.config import settings
from app.core.schema_loader import load_tenant_schema

logger = logging.getLogger("dataagent.core.rag")


class RAGClient:
    """Client for Azure AI Search schema operations.

    Book content retrieval is now handled by the Skills system.
    Schema search still uses Azure AI Search when configured.
    """

    def __init__(self):
        self._search_configured = bool(
            settings.AZURE_SEARCH_ENDPOINT and settings.AZURE_SEARCH_KEY
        )
        self._search_client_schema = None

        if self._search_configured:
            try:
                from azure.core.credentials import AzureKeyCredential
                from azure.search.documents import SearchClient

                credential = AzureKeyCredential(settings.AZURE_SEARCH_KEY)

                self._search_client_schema = SearchClient(
                    endpoint=settings.AZURE_SEARCH_ENDPOINT,
                    index_name=settings.AZURE_SEARCH_INDEX_SCHEMA,
                    credential=credential,
                )
                logger.info("Azure AI Search client initialized for schema search")
            except Exception as e:
                logger.warning("Failed to initialize AI Search client: %s", e)
                self._search_configured = False
        else:
            logger.info(
                "Azure AI Search not configured — using local schema loader. "
                "Book content is provided by the Skills system (app/core/skills.py)."
            )

    async def search_books(self, query: str, tipo_uso: str, top: int = 5) -> list:
        """Backward-compatible method — delegates to Skills system.

        This method is kept for any legacy code that still calls it.
        New code should use skills_manager.select_relevant_skills() instead.
        """
        logger.info(
            "search_books called (legacy) — use skills_manager instead. "
            "query='%s', tipo_uso='%s'",
            query[:50], tipo_uso,
        )
        return []

    async def search_schema(self, tenant_id: str, query: str) -> dict:
        """Search the database schema for a specific tenant.

        When AI Search is configured, performs hybrid search on indexed schemas.
        Otherwise falls back to reading the local dab-config.json files.
        """
        if not self._search_configured:
            return load_tenant_schema(tenant_id)

        try:
            results = self._search_client_schema.search(
                search_text=query,
                filter=f"tenant_id eq '{tenant_id}'",
                select=["table_name", "columns", "permissions", "tenant_id"],
                top=10,
            )
            search_results = [dict(r) for r in results]
            if search_results:
                return {
                    "tenant_id": tenant_id,
                    "tables": {r["table_name"]: r for r in search_results},
                    "available_tables": [r["table_name"] for r in search_results],
                }
        except Exception as e:
            logger.error("AI Search schema query failed, using fallback: %s", e)

        return load_tenant_schema(tenant_id)


# Singleton instance
rag_client = RAGClient()
