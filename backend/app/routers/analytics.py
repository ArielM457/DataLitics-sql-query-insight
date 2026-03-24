"""Analytics Router — Log analysis, interaction summaries, and skill recommendations.

Endpoints:
    GET  /analytics/report           — Full AI-generated interaction report (GPT-4.1)
    GET  /analytics/summary          — Quick stats summary (no AI, fast)
    GET  /analytics/skills-suggest   — Suggested new skills based on log gaps
"""

import logging

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from app.agents.agent_analytics import AnalyticsAgent
from app.core.audit_store import audit_store
from app.core.auth import verify_firebase_token

logger = logging.getLogger("dataagent.routers.analytics")

router = APIRouter()
analytics_agent = AnalyticsAgent()


# ─── GET /analytics/summary ───────────────────────────────────────────────────

@router.get("/summary")
async def get_summary(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
    limit: int = Query(100, ge=1, le=500, description="Number of recent logs to analyze"),
):
    """Quick statistics summary — no AI, returns instantly.

    Computes success/block/error rates, risk distribution, execution
    times, and recent activity without calling GPT-4.1.

    Returns:
        dict: Computed statistics and the 10 most recent events.
    """
    token = authorization.replace("Bearer ", "")
    user_context = await verify_firebase_token(token)
    tenant_id = user_context["tenant_id"]

    logger.info("Analytics summary requested: tenant=%s", tenant_id)
    return analytics_agent.get_quick_summary(tenant_id=tenant_id, limit=limit)


# ─── GET /analytics/report ────────────────────────────────────────────────────

@router.get("/report")
async def get_report(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
    limit: int = Query(200, ge=10, le=500, description="Number of recent logs to analyze"),
):
    """Full AI-generated analytics report using GPT-4.1.

    Analyzes interaction patterns, detects problem areas, computes a
    health score, and recommends new skills to reduce failure rates.

    This endpoint calls GPT-4.1 and may take 5-15 seconds.

    Returns:
        dict: Full report with executive_summary, interaction_patterns,
              problem_areas, skill_gaps, recommended_skills, health_score,
              and computed_stats.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)
        tenant_id = user_context["tenant_id"]

        logger.info("Full analytics report requested: tenant=%s, limit=%d", tenant_id, limit)
        return await analytics_agent.analyze(tenant_id=tenant_id, limit=limit)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Analytics report failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate analytics report") from e


# ─── GET /analytics/skills-suggest ───────────────────────────────────────────

@router.get("/skills-suggest")
async def get_skills_suggestions(
    authorization: str = Header(..., description="Bearer {firebase_token}"),
    limit: int = Query(100, ge=10, le=300, description="Number of recent logs to consider"),
):
    """Get only the skill recommendations section of the report.

    Returns a lighter response with just the recommended_skills and
    skill_gaps fields, without the full narrative report. Useful for
    the skills management UI.

    Returns:
        dict: skill_gaps, recommended_skills, computed_stats.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)
        tenant_id = user_context["tenant_id"]

        logger.info("Skills suggestions requested: tenant=%s", tenant_id)
        full_report = await analytics_agent.analyze(tenant_id=tenant_id, limit=limit)

        return {
            "tenant_id": tenant_id,
            "generated_at": full_report.get("generated_at"),
            "skill_gaps": full_report.get("skill_gaps", []),
            "recommended_skills": full_report.get("recommended_skills", []),
            "health_score": full_report.get("health_score", {}),
            "computed_stats": full_report.get("computed_stats", {}),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Skills suggestions failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate skill suggestions") from e


# ─── POST /analytics/chat ─────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    limit: int = 100


@router.post("/chat")
async def analytics_chat(
    body: ChatRequest,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Conversational chatbot that answers questions about the audit logs.

    Accepts a natural language question and returns a concise, data-grounded
    answer based on the tenant's audit log history. Responds in the same
    language the question is written in.

    Returns:
        dict: answer (str) and tenant_id.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)
        tenant_id = user_context["tenant_id"]

        logger.info("Analytics chat: tenant=%s question=%r", tenant_id, body.question[:80])
        answer = await analytics_agent.chat(
            tenant_id=tenant_id,
            question=body.question,
            limit=body.limit,
        )

        # Save the chatbot interaction to audit logs
        audit_store.log_query(
            tenant_id=tenant_id,
            user_role=user_context.get("role", "admin"),
            question=body.question,
            sql="",
            status="analytics_chat",
            risk_level="low",
            user_email=user_context.get("email", ""),
            uid=user_context.get("uid", ""),
        )

        return {"answer": answer, "tenant_id": tenant_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Analytics chat failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process chat question") from e


# ─── POST /analytics/skills-chat ──────────────────────────────────────────────

@router.post("/skills-chat")
async def skills_chat(
    body: ChatRequest,
    authorization: str = Header(..., description="Bearer {firebase_token}"),
):
    """Conversational chatbot about the skills inventory and recommendations.

    Answers free-form questions about existing skills, missing capabilities,
    and which new skills would reduce observed failure rates. Responds in
    the same language as the question.

    Returns:
        dict: answer (str) and tenant_id.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_context = await verify_firebase_token(token)
        tenant_id = user_context["tenant_id"]

        logger.info("Skills chat: tenant=%s question=%r", tenant_id, body.question[:80])
        answer = await analytics_agent.chat_skills(
            tenant_id=tenant_id,
            question=body.question,
            limit=body.limit,
        )
        return {"answer": answer, "tenant_id": tenant_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Skills chat failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process skills chat question") from e
