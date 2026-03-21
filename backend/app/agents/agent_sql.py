"""SQL Agent — Generates, validates, and secures SQL queries using LangGraph.

Uses LangGraph with a multi-node directed graph to generate SQL from the
extracted intention, then validate and secure it through multiple safety
checks before execution.

Skills are loaded dynamically and selected by GPT-4.1 based on relevance
to the query being generated. This replaces static RAG with an editable
knowledge base of SQL best practices.

LangGraph pipeline nodes:
    1. Generate — Create SQL from intention + schema + skills using GPT-4.1
    2. Validate — Verify SQL syntax and safety with sqlparse
    3. PromptShields — Check for prompt injection attacks
    4. ContextFilter — Ensure query stays within tenant permissions
    5. Ready — Final approved query ready for execution

Auto-correction: If validation fails, the graph loops back to Generate
with error feedback, up to 3 attempts with exponential backoff (1s, 2s, 4s).
"""

import asyncio
import json
import logging
import re
from typing import TypedDict

import sqlparse
from langgraph.graph import END, StateGraph

from openai import AsyncAzureOpenAI

from app.config import settings
from app.core.skills import skills_manager
from app.core.schema_loader import get_schema_description
from app.security.context_filter import context_filter
from app.security.prompt_shields import prompt_shields
from app.security.risk_analyzer import risk_analyzer

logger = logging.getLogger("dataagent.agents.sql")

# SQL operations that are never allowed
_FORBIDDEN_OPERATIONS = re.compile(
    r"\b(DELETE|DROP|TRUNCATE|UPDATE|INSERT|ALTER|CREATE|EXEC|EXECUTE|MERGE|GRANT|REVOKE)\b",
    re.IGNORECASE,
)

SYSTEM_PROMPT = """You are an expert SQL query generator for Microsoft SQL Server.
Your job is to generate safe, read-only SQL queries based on the user's analytical intent.

STRICT RULES:
1. ONLY generate SELECT statements — NEVER use DELETE, UPDATE, DROP, INSERT, CREATE, TRUNCATE, ALTER, EXEC
2. Always include a TOP clause to limit results (default TOP 1000 unless specified)
3. Use proper SQL Server syntax (T-SQL)
4. Reference ONLY tables and columns that exist in the provided schema
5. NEVER access columns that are listed as restricted for the user's role
6. Add brief SQL comments explaining each main section of the query
7. Use meaningful table aliases

Your output MUST be a JSON object:
{
    "sql": "SELECT ...",
    "explanation": "Brief explanation of what this query does in simple language"
}
"""

CORRECTION_PROMPT = """The previous SQL query had an error. Please fix it.

Previous SQL: {previous_sql}
Error: {error}

Generate a corrected query following the same rules. Output as JSON with "sql" and "explanation" fields.
"""


class SQLState(TypedDict):
    """State object flowing through the LangGraph pipeline."""

    intention: dict
    schema: dict
    tenant_id: str
    user_role: str
    restricted_columns: list
    sql: str
    explanation: str
    risk_level: str
    risk_details: dict
    blocked: bool
    block_reason: str
    block_type: str
    attempt: int
    max_attempts: int
    error_history: list
    security_events: list
    skills_context: str


class SQLAgent:
    """Agent 2: Generates secure SQL queries from analytical intentions.

    Uses LangGraph with a directed graph of nodes that progressively
    generate, validate, and secure SQL queries before execution.
    Skills are loaded dynamically to provide SQL best practices.
    """

    def __init__(self):
        self._client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version="2024-10-21",
        )
        self._graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph state graph for SQL generation pipeline."""
        graph = StateGraph(SQLState)

        # Add nodes
        graph.add_node("generate", self._node_generate)
        graph.add_node("validate", self._node_validate)
        graph.add_node("prompt_shields", self._node_prompt_shields)
        graph.add_node("context_filter", self._node_context_filter)
        graph.add_node("risk_analysis", self._node_risk_analysis)
        graph.add_node("ready", self._node_ready)
        graph.add_node("blocked", self._node_blocked)
        graph.add_node("escalate", self._node_escalate)

        # Set entry point
        graph.set_entry_point("generate")

        # Add edges with conditions
        graph.add_conditional_edges(
            "generate",
            self._route_after_generate,
            {"validate": "validate", "escalate": "escalate"},
        )
        graph.add_conditional_edges(
            "validate",
            self._route_after_validate,
            {"prompt_shields": "prompt_shields", "generate": "generate", "escalate": "escalate"},
        )
        graph.add_conditional_edges(
            "prompt_shields",
            self._route_after_shields,
            {"context_filter": "context_filter", "blocked": "blocked"},
        )
        graph.add_conditional_edges(
            "context_filter",
            self._route_after_context,
            {"risk_analysis": "risk_analysis", "blocked": "blocked", "generate": "generate", "escalate": "escalate"},
        )
        graph.add_edge("risk_analysis", "ready")
        graph.add_edge("ready", END)
        graph.add_edge("blocked", END)
        graph.add_edge("escalate", END)

        return graph.compile()

    # --- Graph nodes ---

    async def _node_generate(self, state: SQLState) -> dict:
        """Generate SQL from intention using GPT-4.1 with dynamic skills."""
        attempt = state.get("attempt", 0) + 1
        logger.info("SQL generation attempt %d/%d", attempt, state.get("max_attempts", 3))

        # Exponential backoff on retries
        if attempt > 1:
            delay = 2 ** (attempt - 2)  # 1s, 2s, 4s
            logger.info("Backoff: waiting %ds before retry", delay)
            await asyncio.sleep(delay)

        schema_desc = get_schema_description(
            state["tenant_id"], state["user_role"]
        )

        # Use pre-loaded skills context
        skills_context = state.get("skills_context", "")

        # Build the prompt
        error_context = ""
        if state.get("error_history"):
            last_error = state["error_history"][-1]
            error_context = CORRECTION_PROMPT.format(
                previous_sql=last_error.get("sql", ""),
                error=last_error.get("error", ""),
            )

        intention_json = json.dumps(state["intention"], ensure_ascii=False, indent=2)

        user_message = f"""Analytical intent:
{intention_json}

--- DATABASE SCHEMA ---
{schema_desc}

Restricted columns (DO NOT access): {', '.join(state.get('restricted_columns', []))}

--- SQL BEST PRACTICES (Skills) ---
{skills_context}

{error_context}

Generate the SQL query as a JSON object with "sql" and "explanation" fields.
"""

        response = await self._client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()

        try:
            result = json.loads(raw)
            sql = result.get("sql", "")
            explanation = result.get("explanation", "")
        except json.JSONDecodeError:
            sql = raw
            explanation = ""

        return {"sql": sql, "explanation": explanation, "attempt": attempt}

    async def _node_validate(self, state: SQLState) -> dict:
        """Validate SQL syntax and check for forbidden operations."""
        sql = state.get("sql", "")
        errors = []

        # Check for forbidden operations
        forbidden_match = _FORBIDDEN_OPERATIONS.search(sql)
        if forbidden_match:
            errors.append(
                f"Forbidden SQL operation detected: {forbidden_match.group()}. "
                f"Only SELECT statements are allowed."
            )

        # Validate syntax with sqlparse
        try:
            parsed = sqlparse.parse(sql)
            if not parsed or not parsed[0].tokens:
                errors.append("SQL could not be parsed — appears to be empty or invalid.")
            else:
                stmt = parsed[0]
                stmt_type = stmt.get_type()
                if stmt_type and stmt_type.upper() != "SELECT":
                    errors.append(
                        f"Statement type is '{stmt_type}' but only SELECT is allowed."
                    )
        except Exception as e:
            errors.append(f"SQL parsing error: {str(e)}")

        if errors:
            error_history = state.get("error_history", [])
            error_history.append({"sql": sql, "error": "; ".join(errors)})
            return {"error_history": error_history}

        return {}

    async def _node_prompt_shields(self, state: SQLState) -> dict:
        """Check for prompt injection attacks using Prompt Shields."""
        result = await prompt_shields.analyze(state["sql"], state["tenant_id"])

        if result["blocked"]:
            security_events = state.get("security_events", [])
            security_events.append({
                "type": "prompt_shields",
                "attack_type": result["attack_type"],
                "confidence": result["confidence"],
                "method": result["method"],
                "tenant_id": state["tenant_id"],
            })
            return {
                "blocked": True,
                "block_reason": (
                    f"Security check blocked this query: {result['attack_type']} detected. "
                    f"Please rephrase your question without attempting to modify system behavior."
                ),
                "block_type": "prompt_shields",
                "security_events": security_events,
            }

        return {}

    async def _node_context_filter(self, state: SQLState) -> dict:
        """Verify SQL stays within tenant permissions."""
        result = context_filter.validate(
            sql=state["sql"],
            tenant_schema=state["schema"],
            user_role=state["user_role"],
            restricted_columns=state.get("restricted_columns", []),
        )

        if not result["valid"]:
            security_events = state.get("security_events", [])
            security_events.append({
                "type": "context_filter",
                "unauthorized_tables": result["unauthorized_tables"],
                "unauthorized_columns": result["unauthorized_columns"],
                "tenant_id": state["tenant_id"],
                "user_role": state["user_role"],
            })
            return {
                "block_reason": result["blocked_reason"],
                "block_type": "context_filter",
                "security_events": security_events,
                "error_history": state.get("error_history", []) + [
                    {"sql": state["sql"], "error": result["blocked_reason"]}
                ],
            }

        return {}

    async def _node_risk_analysis(self, state: SQLState) -> dict:
        """Classify the risk level of the validated SQL."""
        result = risk_analyzer.classify(state["sql"], state["schema"])
        return {
            "risk_level": result["level"],
            "risk_details": result,
        }

    async def _node_ready(self, state: SQLState) -> dict:
        """Mark the SQL as ready for execution."""
        logger.info(
            "SQL ready: risk=%s, attempts=%d",
            state.get("risk_level", "unknown"),
            state.get("attempt", 0),
        )
        return {"blocked": False}

    async def _node_blocked(self, state: SQLState) -> dict:
        """Handle blocked queries."""
        logger.warning(
            "SQL BLOCKED: type=%s, reason=%s",
            state.get("block_type", "unknown"),
            state.get("block_reason", ""),
        )
        return {"blocked": True}

    async def _node_escalate(self, state: SQLState) -> dict:
        """Escalate to user after max attempts exceeded."""
        errors = state.get("error_history", [])
        last_error = errors[-1]["error"] if errors else "Unknown error"
        return {
            "blocked": True,
            "block_reason": (
                f"I was unable to generate a valid SQL query after "
                f"{state.get('attempt', 0)} attempts. "
                f"Last issue: {last_error}. "
                f"Could you try rephrasing your question or being more specific?"
            ),
            "block_type": "escalation",
        }

    # --- Routing functions ---

    def _route_after_generate(self, state: SQLState) -> str:
        if not state.get("sql"):
            if state.get("attempt", 0) >= state.get("max_attempts", 3):
                return "escalate"
            return "validate"  # will fail and trigger retry
        return "validate"

    def _route_after_validate(self, state: SQLState) -> str:
        errors = state.get("error_history", [])
        attempt = state.get("attempt", 0)
        max_attempts = state.get("max_attempts", 3)

        if errors and len(errors) >= attempt:
            # Last validation failed
            if attempt >= max_attempts:
                return "escalate"
            return "generate"  # retry

        return "prompt_shields"

    def _route_after_shields(self, state: SQLState) -> str:
        if state.get("blocked"):
            return "blocked"
        return "context_filter"

    def _route_after_context(self, state: SQLState) -> str:
        if state.get("block_type") == "context_filter":
            # Context filter failed — try to regenerate with the error as feedback
            attempt = state.get("attempt", 0)
            max_attempts = state.get("max_attempts", 3)
            if attempt >= max_attempts:
                return "escalate"
            return "generate"
        if state.get("blocked"):
            return "blocked"
        return "risk_analysis"

    # --- Public API ---

    async def generate(
        self, intention: dict, schema: dict,
        tenant_id: str = "", user_role: str = "", restricted_columns: list = None,
    ) -> dict:
        """Generate a validated and secured SQL query from an intention.

        Args:
            intention: The structured intent from IntentionAgent.
            schema: The tenant's database schema metadata.
            tenant_id: The tenant identifier.
            user_role: The user's role.
            restricted_columns: Columns the user cannot access.

        Returns:
            dict: SQL generation result with shape:
                {
                    "sql": str,
                    "explanation": str,
                    "risk_level": str,
                    "risk_details": dict,
                    "blocked": bool,
                    "block_reason": str,
                    "block_type": str,
                    "attempts": int,
                    "security_events": list,
                }
        """
        # Select relevant skills BEFORE entering the graph
        technique = intention.get("tecnica_sugerida", "SQL query")
        tables = ", ".join(intention.get("tablas", []))
        skill_query = f"{technique} {tables}"

        selected_skills = await skills_manager.select_relevant_skills(
            agent="agent_sql",
            query=skill_query,
            top=3,
        )
        skills_context = skills_manager.format_skills_for_prompt(selected_skills)

        initial_state: SQLState = {
            "intention": intention,
            "schema": schema,
            "tenant_id": tenant_id,
            "user_role": user_role,
            "restricted_columns": restricted_columns or [],
            "sql": "",
            "explanation": "",
            "risk_level": "low",
            "risk_details": {},
            "blocked": False,
            "block_reason": "",
            "block_type": "",
            "attempt": 0,
            "max_attempts": 3,
            "error_history": [],
            "security_events": [],
            "skills_context": skills_context,
        }

        final_state = await self._graph.ainvoke(initial_state)

        return {
            "sql": final_state.get("sql", ""),
            "explanation": final_state.get("explanation", ""),
            "risk_level": final_state.get("risk_level", "low"),
            "risk_details": final_state.get("risk_details", {}),
            "blocked": final_state.get("blocked", False),
            "block_reason": final_state.get("block_reason", ""),
            "block_type": final_state.get("block_type", ""),
            "attempts": final_state.get("attempt", 0),
            "security_events": final_state.get("security_events", []),
        }
