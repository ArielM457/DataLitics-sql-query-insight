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

Return a valid JSON object — nothing else. The structure below uses PLACEHOLDER text
(shown in angle brackets) — replace every placeholder with real text in the SAME LANGUAGE
as the user's question:
{
    "needs_clarification": true,
    "detected_language": "<iso-639-1 code, e.g. es, en, pt, fr>",
    "questions": [
        {
            "id": "q1",
            "text": "<short question in user's language, max 10 words>",
            "type": "yes_no"
        },
        {
            "id": "q2",
            "text": "<short question in user's language, max 10 words>",
            "type": "choice",
            "options": ["<option 1 in user's language>", "<option 2>", "<option 3>"]
        }
    ]
}

Rules:
- If the question is already fully specific, return {"needs_clarification": false, "detected_language": "<code>", "questions": []}
- Maximum 3 questions — never more
- Keep question text SHORT (max 10 words)
- "yes_no" type: do NOT include "options" field
- "choice" type: include 2-4 options (never more than 4)
- Focus clarifications on: time period, breakdown/grouping, metric selection, comparison scope
- "detected_language": ISO 639-1 code of the user's question language (e.g. "es", "en", "pt", "fr", "de")
- CRITICAL LANGUAGE RULE: Write ALL text — question texts AND every option — in the EXACT SAME
  LANGUAGE as the user's question. Analyze the user's words carefully to identify their language.
  If the user writes in Spanish → everything in Spanish.
  If in English → everything in English.
  If in Indonesian/Malay → everything in Indonesian.
  If the language is unclear or rare → default to ENGLISH, never default to Spanish.
  DO NOT assume Spanish just because this is a data platform. Match the user's actual language.
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
            result = {"needs_clarification": False, "detected_language": "en", "questions": []}

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
