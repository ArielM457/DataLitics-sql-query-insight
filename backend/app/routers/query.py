"""Query Router — Main data analysis endpoint.

Orchestrates the multi-agent pipeline:
    1. verify_firebase_token → Authenticate and extract tenant context
    2. IntentionAgent → Analyze the user's question
    3. SQLAgent → Generate and validate SQL (LangGraph pipeline)
    4. ExecutionAgent → Execute via DAB with Circuit Breaker
    5. InsightsAgent → Generate insights and recommendations
"""

import logging
import time

from fastapi import APIRouter, Header, HTTPException

from app.agents.agent_execution import ExecutionAgent
from app.agents.agent_insights import InsightsAgent
from app.agents.agent_intention import IntentionAgent
from app.agents.agent_sql import SQLAgent
from app.core.audit_store import audit_store
from app.core.auth import verify_firebase_token
from app.core.schema_loader import get_restricted_columns, load_tenant_schema
from app.models.request import QueryRequest
from app.models.response import QueryResponse

logger = logging.getLogger("dataagent.routers.query")

router = APIRouter()

# Agent instances
intention_agent = IntentionAgent()
sql_agent = SQLAgent()
execution_agent = ExecutionAgent()
insights_agent = InsightsAgent()


@router.post("", response_model=QueryResponse)
async def execute_query(
    request: QueryRequest,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Execute a natural language query through the multi-agent pipeline.

    Receives a natural language question, processes it through 4 agents
    (Intention → SQL → Execution → Insights), and returns the complete
    analysis result with SQL, data, and insights.

    Args:
        request: The query request containing the question and tenant_id.
        authorization: Bearer token from Firebase Auth.

    Returns:
        QueryResponse: Complete analysis result.
    """
    pipeline_start = time.time()

    try:
        # Extract token from "Bearer {token}" header
        token = authorization.replace("Bearer ", "")

        # Step 1: Authenticate
        user_context = await verify_firebase_token(token)
        tenant_id = user_context["tenant_id"]
        user_role = user_context["role"]

        logger.info(
            "Query pipeline started: tenant=%s, role=%s, question='%s'",
            tenant_id, user_role, request.question[:80],
        )

        # Load schema and restricted columns
        schema = load_tenant_schema(tenant_id)
        restricted_cols = get_restricted_columns(tenant_id, user_role)

        trace = {
            "tenant_id": tenant_id,
            "user_role": user_role,
            "stages": {},
        }

        # Step 2: Intention Analysis
        stage_start = time.time()
        intention = await intention_agent.analyze(
            question=request.question,
            tenant_id=tenant_id,
            user_role=user_role,
        )
        trace["stages"]["intention"] = {
            "duration_ms": round((time.time() - stage_start) * 1000, 2),
            "result": intention,
        }

        # Check if clarification is needed
        if intention.get("clarificacion_requerida"):
            total_time = (time.time() - pipeline_start) * 1000
            audit_store.log_query(
                tenant_id=tenant_id,
                user_role=user_role,
                question=request.question,
                sql="",
                status="clarification_needed",
                risk_level="low",
                execution_time_ms=total_time,
            )
            return QueryResponse(
                sql="",
                explanation=intention.get("mensaje_clarificacion", "Please clarify your question."),
                data=[],
                insights={
                    "summary": intention.get("mensaje_clarificacion", ""),
                    "clarification_required": True,
                },
                security={"status": "ok"},
                trace=trace,
            )

        # Check if question is out of domain
        if intention.get("fuera_de_dominio"):
            total_time = (time.time() - pipeline_start) * 1000
            audit_store.log_query(
                tenant_id=tenant_id,
                user_role=user_role,
                question=request.question,
                sql="",
                status="blocked",
                risk_level="low",
                block_type="out_of_domain",
                block_reason="Question is outside the data domain",
                execution_time_ms=total_time,
            )
            return QueryResponse(
                sql="",
                explanation="This question is outside the scope of your available data.",
                data=[],
                insights={"summary": "Question is not related to the available data domain."},
                security={"status": "out_of_domain"},
                trace=trace,
            )

        # Step 3: SQL Generation (LangGraph pipeline)
        stage_start = time.time()
        sql_result = await sql_agent.generate(
            intention=intention,
            schema=schema,
            tenant_id=tenant_id,
            user_role=user_role,
            restricted_columns=restricted_cols,
        )
        trace["stages"]["sql_generation"] = {
            "duration_ms": round((time.time() - stage_start) * 1000, 2),
            "attempts": sql_result.get("attempts", 1),
            "risk_level": sql_result.get("risk_level", "low"),
        }

        # Log security events from SQL pipeline
        for event in sql_result.get("security_events", []):
            audit_store.log_security_event(
                tenant_id=tenant_id,
                user_role=user_role,
                event_type=event.get("type", "unknown"),
                details=event,
            )

        # Check if SQL was blocked
        if sql_result.get("blocked"):
            total_time = (time.time() - pipeline_start) * 1000
            audit_store.log_query(
                tenant_id=tenant_id,
                user_role=user_role,
                question=request.question,
                sql=sql_result.get("sql", ""),
                status="blocked",
                risk_level=sql_result.get("risk_level", "low"),
                block_type=sql_result.get("block_type", ""),
                block_reason=sql_result.get("block_reason", ""),
                execution_time_ms=total_time,
            )
            return QueryResponse(
                sql=sql_result.get("sql", ""),
                explanation=sql_result.get("block_reason", "Query was blocked."),
                data=[],
                insights={"summary": sql_result.get("block_reason", "")},
                security={
                    "status": "blocked",
                    "block_type": sql_result.get("block_type", ""),
                    "block_reason": sql_result.get("block_reason", ""),
                    "risk_level": sql_result.get("risk_level", "low"),
                },
                trace=trace,
            )

        # Step 4: Execution via DAB
        stage_start = time.time()
        exec_result = await execution_agent.execute(
            sql=sql_result["sql"],
            tenant_id=tenant_id,
            user_role=user_role,
        )
        trace["stages"]["execution"] = {
            "duration_ms": round((time.time() - stage_start) * 1000, 2),
            "rows": exec_result.get("rows", 0),
            "dab_endpoint": exec_result.get("dab_endpoint", ""),
        }

        # Check for circuit breaker or execution errors
        if exec_result.get("circuit_breaker_open"):
            audit_store.log_security_event(
                tenant_id=tenant_id,
                user_role=user_role,
                event_type="circuit_breaker",
                details={"error": exec_result.get("error", "")},
            )

        if exec_result.get("error"):
            total_time = (time.time() - pipeline_start) * 1000
            audit_store.log_query(
                tenant_id=tenant_id,
                user_role=user_role,
                question=request.question,
                sql=sql_result["sql"],
                status="error",
                risk_level=sql_result.get("risk_level", "low"),
                execution_time_ms=total_time,
            )
            return QueryResponse(
                sql=sql_result["sql"],
                explanation=sql_result.get("explanation", ""),
                data=[],
                insights={"summary": exec_result["error"]},
                security={
                    "status": "error",
                    "risk_level": sql_result.get("risk_level", "low"),
                    "circuit_breaker_open": exec_result.get("circuit_breaker_open", False),
                },
                trace=trace,
            )

        # Step 5: Insights Generation
        stage_start = time.time()
        insights = await insights_agent.generate(
            data=exec_result,
            question=request.question,
            tenant_id=tenant_id,
        )
        trace["stages"]["insights"] = {
            "duration_ms": round((time.time() - stage_start) * 1000, 2),
            "chart_type": insights.get("chart_type", ""),
        }

        # Calculate total pipeline time
        total_time = (time.time() - pipeline_start) * 1000
        trace["total_duration_ms"] = round(total_time, 2)

        # Log successful query
        audit_store.log_query(
            tenant_id=tenant_id,
            user_role=user_role,
            question=request.question,
            sql=sql_result["sql"],
            status="success",
            risk_level=sql_result.get("risk_level", "low"),
            execution_time_ms=total_time,
            rows_returned=exec_result.get("rows", 0),
        )

        logger.info(
            "Query pipeline completed: %.2fms, rows=%d, risk=%s",
            total_time, exec_result.get("rows", 0), sql_result.get("risk_level", "low"),
        )

        return QueryResponse(
            sql=sql_result["sql"],
            explanation=sql_result.get("explanation", ""),
            data=exec_result.get("data", []),
            insights=insights,
            security={
                "status": "ok",
                "risk_level": sql_result.get("risk_level", "low"),
                "risk_details": sql_result.get("risk_details", {}),
            },
            trace=trace,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Query execution failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
