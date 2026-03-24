"""Intention Agent — Analyzes natural language questions to extract intent.

Uses Azure OpenAI GPT-4.1 with dynamic Skills to understand the user's
analytical intention, including target tables, metrics, filters,
time periods, and suggested analytical techniques.

Skills are loaded dynamically from JSON files and selected by GPT-4.1
based on relevance to the user's question. This replaces the static
RAG system with an editable, improvable knowledge base.

Verifies that referenced tables exist in the tenant's schema and that
the user's role has access to them. If the question is ambiguous,
requests clarification with concrete options.
"""

import json
import logging

from openai import AsyncAzureOpenAI

from app.config import settings
from app.core.skills import skills_manager
from app.core.schema_loader import (
    get_allowed_tables,
    get_restricted_columns,
    get_schema_description,
    load_tenant_schema,
)

logger = logging.getLogger("dataagent.agents.intention")

SYSTEM_PROMPT = """You are an expert data analyst assistant. Your job is to analyze a user's
natural language question and extract the analytical intent so that a SQL query can be generated.

You have access to:
1. The database schema of the user's organization
2. Best-practice skills for data analysis
3. The user's role and data access permissions

Your output MUST be a valid JSON object with this exact structure:
{
    "tablas": ["Table1", "Table2"],
    "metricas": ["metric1", "metric2"],
    "filtros": [{"campo": "field", "operador": "=", "valor": "value"}],
    "periodo": "description of time period or empty string",
    "tecnica_sugerida": "SQL technique to use (e.g., GROUP BY, JOIN, window function)",
    "clarificacion_requerida": false,
    "mensaje_clarificacion": "",
    "fuera_de_dominio": false
}

Rules:
- CRITICAL: Only reference tables that ACTUALLY EXIST in the provided DATABASE SCHEMA.
  If the user mentions a table or entity that does NOT exist in the schema (e.g., "productos",
  "clientes", "pedidos"), you MUST:
  1. Set "clarificacion_requerida" to true
  2. In "mensaje_clarificacion", clearly tell the user that the table they mentioned does NOT
     exist in the database, list the ACTUAL available tables, and suggest which existing table(s)
     contain data related to what they are looking for.
  3. Put ONLY the valid existing tables in "tablas" (leave empty if none match)
- If the question is ambiguous, set clarificacion_requerida to true and provide
  2-3 concrete options in mensaje_clarificacion
- If the question is completely outside the data domain, set fuera_de_dominio to true
- Suggest the most appropriate SQL technique based on the analysis needed
- Always output valid JSON — no markdown, no extra text
- LANGUAGE: Detect the language of the user's question and write all text fields
  (mensaje_clarificacion, periodo, tecnica_sugerida) in that same language
"""


class IntentionAgent:
    """Agent 1: Analyzes user questions to determine analytical intent.

    Uses Azure OpenAI GPT-4.1 with dynamically selected Skills to
    understand the user's question and extract structured metadata
    that guides the SQL generation process.
    """

    def __init__(self):
        self._client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version="2024-10-21",
        )

    async def analyze(self, question: str, tenant_id: str, user_role: str) -> dict:
        """Analyze a natural language question and extract analytical intent.

        Args:
            question: The user's natural language question.
            tenant_id: The tenant identifier for multi-tenant isolation.
            user_role: The role of the user (analyst, manager, admin).

        Returns:
            dict: Structured intent with tables, metrics, filters, period,
                  suggested technique, and clarification flags.
        """
        logger.info("Analyzing intention: tenant=%s, role=%s", tenant_id, user_role)

        # Gather context
        schema_desc = get_schema_description(tenant_id, user_role)
        allowed_tables = get_allowed_tables(tenant_id, user_role)
        restricted_cols = get_restricted_columns(tenant_id, user_role)

        # Select relevant skills using GPT-4.1
        selected_skills = await skills_manager.select_relevant_skills(
            agent="agent_intention",
            query=question,
            top=3,
        )
        skills_context = skills_manager.format_skills_for_prompt(selected_skills)

        user_message = f"""Question: {question}

--- DATABASE SCHEMA ---
{schema_desc}

Available tables: {', '.join(allowed_tables)}
Restricted columns for role '{user_role}': {', '.join(restricted_cols) if restricted_cols else 'None'}

--- ANALYSIS SKILLS ---
{skills_context}

Analyze the question and return the structured JSON intent.
"""

        response = await self._client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )

        raw_content = response.choices[0].message.content.strip()

        try:
            intent = json.loads(raw_content)
        except json.JSONDecodeError:
            logger.error("Failed to parse intention JSON: %s", raw_content)
            intent = {
                "tablas": [],
                "metricas": [],
                "filtros": [],
                "periodo": "",
                "tecnica_sugerida": "",
                "clarificacion_requerida": True,
                "mensaje_clarificacion": "I could not understand the question. Please rephrase.",
                "fuera_de_dominio": False,
            }

        # Validate tables against schema
        schema = load_tenant_schema(tenant_id)
        available = [t.lower() for t in schema.get("available_tables", [])]
        validated_tables = []
        unknown_tables = []

        for table in intent.get("tablas", []):
            if table.lower() in available:
                # Use the original casing from schema
                matched = next(
                    t for t in schema["available_tables"] if t.lower() == table.lower()
                )
                validated_tables.append(matched)
            else:
                unknown_tables.append(table)

        if unknown_tables and not intent.get("fuera_de_dominio"):
            intent["clarificacion_requerida"] = True
            # Build a helpful mapping of available tables and their descriptions
            table_descriptions = []
            for t in schema["available_tables"]:
                table_info = schema.get("tables", {}).get(t, {})
                cols = table_info.get("columns", [])
                col_names = [c["name"] for c in cols[:5]] if cols else []
                col_hint = f" (contiene: {', '.join(col_names)}...)" if col_names else ""
                table_descriptions.append(f"  - {t}{col_hint}")
            tables_list = "\n".join(table_descriptions)
            intent["mensaje_clarificacion"] = (
                f"La tabla '{', '.join(unknown_tables)}' no existe en tu base de datos. "
                f"Las tablas disponibles son:\n{tables_list}\n\n"
                f"¿Podrías reformular tu pregunta usando alguna de estas tablas?"
            )

        intent["tablas"] = validated_tables
        intent.setdefault("metricas", [])
        intent.setdefault("filtros", [])
        intent.setdefault("periodo", "")
        intent.setdefault("tecnica_sugerida", "")
        intent.setdefault("clarificacion_requerida", False)
        intent.setdefault("mensaje_clarificacion", "")
        intent.setdefault("fuera_de_dominio", False)

        logger.info(
            "Intention result: tables=%s, technique=%s, clarification=%s, skills_used=%d",
            intent["tablas"], intent["tecnica_sugerida"], intent["clarificacion_requerida"],
            len(selected_skills),
        )

        return intent
