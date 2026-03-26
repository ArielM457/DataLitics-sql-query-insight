"""Clarification Agent — Asks targeted questions before executing a query (Extended Mode).

In Extended Mode, this agent runs BEFORE the normal pipeline. It analyzes the user's
natural language question and generates up to 3 short, targeted questions that can be
answered with simple Yes/No or choice clicks.

Once the user answers, the Chat component builds a clarification_context string and
passes it to the normal pipeline (Intention → SQL → Execution → Insights), which
produces a more precise analysis.
"""

import json
import logging

from openai import AsyncAzureOpenAI

from app.config import settings
from app.core.schema_loader import get_allowed_tables, get_schema_description

logger = logging.getLogger("dataagent.agents.clarification")

SYSTEM_PROMPT = """You are a helpful data analyst assistant in Extended Mode.
Your job is to look at a user's natural language question and decide if 2-3 short
clarifying questions would meaningfully improve the analysis.

Return a valid JSON object — nothing else:
{
    "needs_clarification": true,
    "questions": [
        {
            "id": "q1",
            "text": "Short question (max 10 words)",
            "type": "yes_no"
        },
        {
            "id": "q2",
            "text": "Which period?",
            "type": "choice",
            "options": ["Este mes", "Este año", "Últimos 30 días", "Todo el historial"]
        }
    ]
}

Rules:
- If the question is already fully specific, return {"needs_clarification": false, "questions": []}
- Maximum 3 questions — never more
- Keep question text SHORT (max 10 words)
- "yes_no" type: do NOT include "options" field
- "choice" type: include 2-4 options (never more than 4)
- Focus clarifications on: time period, breakdown/grouping, metric selection, comparison scope
- LANGUAGE: always match the language of the user's question
- Only ask questions that would genuinely change the SQL or analysis approach
"""


class ClarificationAgent:
    """Agent 0 (Extended Mode only): Generates quick clarifying questions.

    Runs only at the very start of the Extended Mode flow. The normal pipeline
    (IntentionAgent → SQLAgent → ExecutionAgent → InsightsAgent) runs unchanged
    after the user answers these questions.
    """

    def __init__(self):
        self._client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version="2024-10-21",
        )

    async def analyze(self, question: str, tenant_id: str, user_role: str) -> dict:
        """Analyze a question and return clarifying questions if needed.

        Args:
            question: The user's natural language question.
            tenant_id: The tenant identifier.
            user_role: The role of the user (analyst, manager, admin).

        Returns:
            dict: {needs_clarification: bool, questions: list[ClarifyQuestion]}
        """
        logger.info(
            "Clarification analysis: tenant=%s, role=%s, question='%s'",
            tenant_id, user_role, question[:80],
        )

        schema_desc = get_schema_description(tenant_id, user_role)
        allowed_tables = get_allowed_tables(tenant_id, user_role)

        user_message = f"""Question: {question}

--- DATABASE SCHEMA ---
{schema_desc}

Available tables: {', '.join(allowed_tables)}

Decide whether this question needs clarification before running a full data analysis.
Return JSON only.
"""

        response = await self._client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
            max_tokens=500,
            response_format={"type": "json_object"},
        )

        raw_content = response.choices[0].message.content.strip()

        try:
            result = json.loads(raw_content)
        except json.JSONDecodeError:
            logger.error("Failed to parse clarification JSON: %s", raw_content)
            result = {"needs_clarification": False, "questions": []}

        result.setdefault("needs_clarification", False)
        result.setdefault("questions", [])

        # Enforce max 3 questions
        result["questions"] = result["questions"][:3]

        logger.info(
            "Clarification result: needs_clarification=%s, questions_count=%d",
            result["needs_clarification"],
            len(result["questions"]),
        )

        return result
