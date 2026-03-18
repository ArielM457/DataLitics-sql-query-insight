"""Query Router — Main data analysis endpoint.

Orchestrates the multi-agent pipeline:
    1. verify_firebase_token → Authenticate and extract tenant context
    2. IntentionAgent → Analyze the user's question
    3. SQLAgent → Generate and validate SQL
    4. ExecutionAgent → Execute via DAB
    5. InsightsAgent → Generate insights and recommendations
"""

import logging

from fastapi import APIRouter, Header, HTTPException

from app.core.auth import verify_firebase_token
from app.models.request import QueryRequest
from app.models.response import QueryResponse

logger = logging.getLogger("dataagent.routers.query")

router = APIRouter()


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
    try:
        # Extract token from "Bearer {token}" header
        token = authorization.replace("Bearer ", "")

        # Step 1: Authenticate
        user_context = await verify_firebase_token(token)
        logger.info(
            "Query from tenant=%s, role=%s",
            user_context["tenant_id"],
            user_context["role"],
        )

        # Step 2-5: Agent pipeline
        # TODO: Issue #20 — Implement full agent pipeline orchestration
        raise NotImplementedError("Pending implementation - Issue #20")

    except HTTPException:
        raise
    except NotImplementedError:
        raise
    except Exception as e:
        logger.error("Query execution failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Internal server error") from e
