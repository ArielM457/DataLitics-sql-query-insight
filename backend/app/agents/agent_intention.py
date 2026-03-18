"""Intention Agent — Analyzes natural language questions to extract intent.

Uses Semantic Kernel with RAG (Retrieval-Augmented Generation) to search
through reference books and determine the user's analytical intention,
including target tables, metrics, filters, time periods, and suggested
analytical techniques.
"""


class IntentionAgent:
    """Agent 1: Analyzes user questions to determine analytical intent.

    Uses Semantic Kernel + RAG from reference books (e.g., Cole Nussbaumer)
    to understand the user's question and extract structured metadata
    that guides the SQL generation process.
    """

    async def analyze(self, question: str, tenant_id: str, user_role: str) -> dict:
        """Analyze a natural language question and extract analytical intent.

        Args:
            question: The user's natural language question.
            tenant_id: The tenant identifier for multi-tenant isolation.
            user_role: The role of the user (analyst, manager, admin).

        Returns:
            dict: Structured intent with the following shape:
                {
                    "tablas": [],
                    "metricas": [],
                    "filtros": [],
                    "periodo": "",
                    "tecnica_sugerida": "",
                    "clarificacion_requerida": False,
                }
        """
        # TODO: Issue #11 — Implement intention analysis with Semantic Kernel + RAG
        raise NotImplementedError("Pending implementation - Issue #11")
