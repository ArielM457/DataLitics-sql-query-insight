"""Analytics Agent — Analyzes interaction logs and recommends new skills.

Reads from the audit store to identify usage patterns, frequent failures,
risky queries, and skill coverage gaps. Uses GPT-4.1 to produce human-readable
summaries and actionable skill recommendations.

Features:
- Interaction pattern analysis (success/block/error rates, risk distribution)
- Skills gap detection (which query types lack skill coverage)
- Suggested new skills based on blocked or failed queries
- Full narrative report per tenant
"""

import json
import logging
from collections import Counter
from datetime import datetime, timezone

from openai import AsyncAzureOpenAI

from app.config import settings
from app.core.audit_store import audit_store
from app.core.skills import skills_manager

logger = logging.getLogger("dataagent.agents.analytics")

SYSTEM_PROMPT = """You are an expert data platform analyst responsible for improving
a multi-agent SQL query system.

Your job is to:
1. Analyze interaction logs to identify patterns, problems, and opportunities.
2. Identify which types of queries are failing or being blocked frequently.
3. Suggest specific new skills (SQL techniques, visualization methods, domain knowledge)
   that would help the system handle those queries better.
4. Generate a clear narrative summary for a technical product manager.

Your output MUST be a valid JSON object with this exact structure:
{
    "executive_summary": "3-5 sentence overview of system health and usage patterns",
    "interaction_patterns": {
        "most_common_topics": ["topic1", "topic2", "topic3"],
        "peak_usage_observation": "Observation about usage volume and timing",
        "user_behavior_insight": "Non-obvious finding about how users interact with the system"
    },
    "problem_areas": [
        {
            "type": "blocked|error|clarification|risk",
            "frequency": "high|medium|low",
            "description": "Specific description of the problem",
            "example_question": "Example question that triggered this problem",
            "impact": "Business impact of this problem"
        }
    ],
    "skill_gaps": [
        {
            "gap_type": "SQL technique|visualization|domain knowledge|security",
            "description": "What the system currently cannot do well",
            "affected_query_types": ["type1", "type2"],
            "priority": "high|medium|low"
        }
    ],
    "recommended_skills": [
        {
            "title": "Skill title (3-7 words)",
            "description": "What this skill adds to the system (1-2 sentences)",
            "agent": "agent_intention|agent_sql|agent_execution|agent_insights",
            "category": "Category name",
            "content_outline": "What the skill content should cover (3-5 bullet points as a string)",
            "justification": "Why this skill would reduce the observed problems",
            "priority": "high|medium|low"
        }
    ],
    "performance_insights": {
        "avg_execution_time_ms": 0,
        "slowest_query_type": "description",
        "performance_recommendation": "Specific recommendation to improve performance"
    },
    "health_score": {
        "score": 0,
        "label": "excellent|good|needs_attention|critical",
        "breakdown": {
            "success_rate": 0.0,
            "security_posture": "strong|adequate|weak",
            "skill_coverage": "comprehensive|partial|limited"
        }
    }
}

Rules:
- Be specific — cite actual question patterns from the logs
- Prioritize skill recommendations by their expected impact on reducing failures
- The health_score.score is 0-100 (100 = perfect)
- Output valid JSON only — no markdown, no extra text
- Write in a professional but accessible tone for technical product managers
"""


class AnalyticsAgent:
    """Agent that analyzes interaction logs and recommends new skills.

    Reads from audit_store (query logs + security events), computes
    statistics, then uses GPT-4.1 to generate a narrative report with
    skill recommendations tailored to the tenant's actual usage patterns.
    """

    def __init__(self):
        self._client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version="2024-10-21",
        )

    # ─── Public API ────────────────────────────────────────────────────────────

    async def analyze(self, tenant_id: str, limit: int = 200) -> dict:
        """Generate a full analytics report for a tenant.

        Reads the last `limit` query logs for the tenant, computes statistics,
        fetches current skills inventory, and asks GPT-4.1 to generate a
        narrative report with skill gap recommendations.

        Args:
            tenant_id: The tenant to analyze.
            limit: Maximum number of recent log entries to consider.

        Returns:
            dict: Full analytics report (executive_summary, patterns,
                  problem_areas, skill_gaps, recommended_skills, etc.)
        """
        logger.info("Starting analytics analysis: tenant=%s, limit=%d", tenant_id, limit)

        # 1. Collect raw data (exclude chatbot interactions from analysis)
        logs = audit_store.get_logs(tenant_id=tenant_id, limit=limit)
        logs = [e for e in logs if e.get("status") != "analytics_chat"]
        security_metrics = audit_store.get_security_metrics(tenant_id=tenant_id)
        recent_events = audit_store.get_recent_events(tenant_id=tenant_id, limit=50)

        # 2. Compute statistics
        stats = self._compute_statistics(logs, security_metrics)

        if stats["total_queries"] == 0:
            return self._empty_report(tenant_id)

        # 3. Get current skills inventory
        current_skills = await self._get_current_skills()

        # 4. Build GPT-4.1 prompt with real data
        user_message = self._build_prompt(
            tenant_id=tenant_id,
            logs=logs,
            stats=stats,
            security_metrics=security_metrics,
            recent_events=recent_events,
            current_skills=current_skills,
        )

        # 5. Call GPT-4.1
        response = await self._client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
            max_tokens=3000,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()

        try:
            report = json.loads(raw)
        except json.JSONDecodeError:
            logger.error("Failed to parse analytics JSON: %s", raw[:500])
            report = self._fallback_report(stats, tenant_id)

        # 6. Attach computed statistics (ground truth, not GPT estimates)
        report["computed_stats"] = stats
        report["generated_at"] = datetime.now(timezone.utc).isoformat()
        report["tenant_id"] = tenant_id
        report["logs_analyzed"] = len(logs)

        logger.info(
            "Analytics report complete: tenant=%s, health=%s, skill_recommendations=%d",
            tenant_id,
            report.get("health_score", {}).get("label", "unknown"),
            len(report.get("recommended_skills", [])),
        )

        return report

    def get_quick_summary(self, tenant_id: str, limit: int = 100) -> dict:
        """Get fast statistics without calling GPT-4.1.

        Useful for dashboards that need quick numbers without the latency
        of a full AI-generated report.

        Args:
            tenant_id: The tenant to summarize.
            limit: Number of recent logs to consider.

        Returns:
            dict: Computed statistics and recent activity.
        """
        logs = audit_store.get_logs(tenant_id=tenant_id, limit=limit)
        logs = [e for e in logs if e.get("status") != "analytics_chat"]
        security_metrics = audit_store.get_security_metrics(tenant_id=tenant_id)
        recent_events = audit_store.get_recent_events(tenant_id=tenant_id, limit=10)
        stats = self._compute_statistics(logs, security_metrics)

        return {
            "tenant_id": tenant_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "stats": stats,
            "recent_events": recent_events,
        }

    # ─── Statistics computation ─────────────────────────────────────────────────

    def _compute_statistics(self, logs: list[dict], security_metrics: dict) -> dict:
        """Compute descriptive statistics from raw audit logs."""
        total = len(logs)
        if total == 0:
            return {
                "total_queries": 0,
                "success_rate": 0.0,
                "block_rate": 0.0,
                "error_rate": 0.0,
                "avg_execution_time_ms": 0.0,
                "p95_execution_time_ms": 0.0,
                "risk_distribution": {},
                "block_type_distribution": {},
                "role_distribution": {},
                "status_distribution": {},
                "avg_rows_returned": 0.0,
                "total_security_events": 0,
                "questions_sample": [],
                "blocked_questions_sample": [],
                "error_questions_sample": [],
            }

        status_counts = Counter(e["status"] for e in logs)
        risk_counts = Counter(e["risk_level"] for e in logs)
        role_counts = Counter(e["user_role"] for e in logs)
        block_type_counts = Counter(
            e["block_type"] for e in logs
            if e.get("block_type")
        )

        exec_times = [e["execution_time_ms"] for e in logs if e.get("execution_time_ms")]
        exec_times_sorted = sorted(exec_times)
        avg_time = sum(exec_times) / len(exec_times) if exec_times else 0.0
        p95_idx = int(len(exec_times_sorted) * 0.95) if exec_times_sorted else 0
        p95_time = exec_times_sorted[p95_idx] if exec_times_sorted else 0.0

        rows_list = [e["rows_returned"] for e in logs if e.get("rows_returned")]
        avg_rows = sum(rows_list) / len(rows_list) if rows_list else 0.0

        # Sample representative questions (most recent 10 of each type)
        success_qs = [e["question"] for e in logs if e["status"] == "success"][:10]
        blocked_qs = [
            {"question": e["question"], "block_type": e.get("block_type", ""), "reason": e.get("block_reason", "")}
            for e in logs if e["status"] == "blocked"
        ][:10]
        error_qs = [e["question"] for e in logs if e["status"] == "error"][:10]

        return {
            "total_queries": total,
            "success_rate": round(status_counts.get("success", 0) / total, 3),
            "block_rate": round(status_counts.get("blocked", 0) / total, 3),
            "error_rate": round(status_counts.get("error", 0) / total, 3),
            "clarification_rate": round(status_counts.get("clarification_needed", 0) / total, 3),
            "avg_execution_time_ms": round(avg_time, 1),
            "p95_execution_time_ms": round(p95_time, 1),
            "risk_distribution": dict(risk_counts),
            "block_type_distribution": dict(block_type_counts),
            "role_distribution": dict(role_counts),
            "status_distribution": dict(status_counts),
            "avg_rows_returned": round(avg_rows, 1),
            "total_security_events": security_metrics.get("total_events", 0),
            "threats_blocked": security_metrics.get("threats_blocked", 0),
            "questions_sample": success_qs,
            "blocked_questions_sample": blocked_qs,
            "error_questions_sample": error_qs,
        }

    # ─── Skills inventory ───────────────────────────────────────────────────────

    async def _get_current_skills(self) -> list[dict]:
        """Fetch the current skills inventory from the Function App."""
        try:
            all_skills = await skills_manager.get_all_skills()
            return [
                {"id": s.get("id"), "title": s.get("title"), "agent": s.get("agent"), "tags": s.get("tags", [])}
                for s in all_skills
            ]
        except Exception as e:
            logger.warning("Could not fetch skills inventory: %s", e)
            return []

    # ─── Prompt builder ─────────────────────────────────────────────────────────

    def _build_prompt(
        self,
        tenant_id: str,
        logs: list[dict],
        stats: dict,
        security_metrics: dict,
        recent_events: list[dict],
        current_skills: list[dict],
    ) -> str:
        return f"""Analyze the following interaction data for tenant '{tenant_id}' and generate a complete analytics report.

--- USAGE STATISTICS ---
Total queries analyzed: {stats['total_queries']}
Success rate: {stats['success_rate'] * 100:.1f}%
Block rate: {stats['block_rate'] * 100:.1f}%
Error rate: {stats['error_rate'] * 100:.1f}%
Clarification needed rate: {stats.get('clarification_rate', 0) * 100:.1f}%
Avg execution time: {stats['avg_execution_time_ms']:.0f}ms
P95 execution time: {stats['p95_execution_time_ms']:.0f}ms
Avg rows returned: {stats['avg_rows_returned']:.0f}

--- STATUS DISTRIBUTION ---
{json.dumps(stats['status_distribution'], indent=2)}

--- RISK DISTRIBUTION ---
{json.dumps(stats['risk_distribution'], indent=2)}

--- BLOCK TYPE DISTRIBUTION ---
{json.dumps(stats['block_type_distribution'], indent=2)}

--- SECURITY EVENTS ---
Total security events: {stats['total_security_events']}
Threats blocked: {stats['threats_blocked']}
{json.dumps(security_metrics.get('events_by_type', {}), indent=2)}

--- SAMPLE SUCCESSFUL QUESTIONS (recent 10) ---
{json.dumps(stats['questions_sample'], ensure_ascii=False, indent=2)}

--- SAMPLE BLOCKED QUESTIONS (recent 10) ---
{json.dumps(stats['blocked_questions_sample'], ensure_ascii=False, indent=2)}

--- SAMPLE ERROR QUESTIONS (recent 10) ---
{json.dumps(stats['error_questions_sample'], ensure_ascii=False, indent=2)}

--- CURRENT SKILLS INVENTORY ({len(current_skills)} skills) ---
{json.dumps(current_skills, ensure_ascii=False, indent=2)}

Based on this data:
1. Identify which query types are failing and why
2. Find patterns in blocked/error queries that suggest missing skill coverage
3. Recommend 3-5 concrete new skills that would directly reduce the observed failure rates
4. Compute a realistic health score (0-100) based on success rate, security posture, and skill coverage
5. Highlight the most impactful problem areas

Generate the full analytics report as a JSON object.
"""

    # ─── Fallback ───────────────────────────────────────────────────────────────

    def _fallback_report(self, stats: dict, tenant_id: str) -> dict:
        """Minimal report when GPT-4.1 parsing fails."""
        success_rate = stats.get("success_rate", 0)
        score = int(success_rate * 70 + 30) if stats["total_queries"] > 0 else 0
        label = (
            "excellent" if score >= 85
            else "good" if score >= 70
            else "needs_attention" if score >= 50
            else "critical"
        )
        return {
            "executive_summary": (
                f"Tenant '{tenant_id}' has processed {stats['total_queries']} queries "
                f"with a {success_rate * 100:.1f}% success rate. "
                "Analytics report generation encountered an issue — showing computed statistics."
            ),
            "interaction_patterns": {
                "most_common_topics": [],
                "peak_usage_observation": "Unable to determine — check logs manually.",
                "user_behavior_insight": "Analysis unavailable.",
            },
            "problem_areas": [],
            "skill_gaps": [],
            "recommended_skills": [],
            "performance_insights": {
                "avg_execution_time_ms": stats.get("avg_execution_time_ms", 0),
                "slowest_query_type": "Unknown",
                "performance_recommendation": "Monitor P95 latency for sustained high values.",
            },
            "health_score": {
                "score": score,
                "label": label,
                "breakdown": {
                    "success_rate": success_rate,
                    "security_posture": "adequate",
                    "skill_coverage": "partial",
                },
            },
        }

    async def chat(self, tenant_id: str, question: str, limit: int = 100) -> str:
        """Answer a free-form question about the tenant's logs using GPT-4.1.

        Args:
            tenant_id: The tenant to analyze.
            question: Free-form question from the user.
            limit: Number of recent logs to include as context.

        Returns:
            str: Conversational answer in the same language as the question.
        """
        logs = audit_store.get_logs(tenant_id=tenant_id, limit=limit)
        security_metrics = audit_store.get_security_metrics(tenant_id=tenant_id)
        stats = self._compute_statistics(logs, security_metrics)

        system = (
            "You are an expert data platform analyst with full admin access to the audit logs "
            "of a multi-agent SQL query system. The person asking is an administrator who is "
            "entitled to see all data including user identities, emails, and query details. "
            "Answer questions concisely and specifically — reference actual usernames, emails, "
            "questions, and numbers from the data provided. Never refuse to share user identity "
            "information; the admin has legitimate access to all of it. "
            "Respond in the same language as the user's question. "
            "Keep answers under 300 words unless more detail is explicitly requested."
        )

        # Include full individual log entries so GPT can answer identity-specific questions
        detailed_logs = [
            {
                "timestamp": e["timestamp"],
                "user_email": e.get("user_email", ""),
                "user_role": e.get("user_role", ""),
                "question": e["question"],
                "status": e["status"],
                "risk_level": e["risk_level"],
                "block_type": e.get("block_type"),
                "block_reason": e.get("block_reason"),
                "execution_time_ms": e.get("execution_time_ms", 0),
                "rows_returned": e.get("rows_returned", 0),
            }
            for e in logs
            if e.get("status") != "analytics_chat"
        ]

        context = f"""--- AUDIT LOG SUMMARY ---
Total queries: {stats['total_queries']}
Success rate: {stats['success_rate'] * 100:.1f}%
Block rate: {stats['block_rate'] * 100:.1f}%
Error rate: {stats['error_rate'] * 100:.1f}%
Risk distribution: {stats['risk_distribution']}
Block types: {stats['block_type_distribution']}
Security events: {stats['total_security_events']}
Avg execution time: {stats['avg_execution_time_ms']:.0f}ms

--- FULL LOG ENTRIES (most recent {len(detailed_logs)}) ---
{json.dumps(detailed_logs, ensure_ascii=False, indent=2)}

--- USER QUESTION ---
{question}"""

        response = await self._client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
            max_tokens=500,
        )
        return response.choices[0].message.content.strip()

    async def chat_skills(self, tenant_id: str, question: str, limit: int = 100) -> str:
        """Answer free-form questions about the skills inventory and recommendations.

        Fetches the current skills list and, if logs exist, derives skill gaps
        from the tenant's failure patterns. Responds in the same language as the question.

        Args:
            tenant_id: The tenant to analyze.
            question: Free-form question about skills.
            limit: Number of recent logs to use for gap detection.

        Returns:
            str: Conversational answer grounded in real skills data.
        """
        # Fetch skills inventory
        current_skills = await self._get_current_skills()

        # Derive skill gaps from logs (best-effort — empty if no logs)
        logs = audit_store.get_logs(tenant_id=tenant_id, limit=limit)
        logs = [e for e in logs if e.get("status") != "analytics_chat"]
        security_metrics = audit_store.get_security_metrics(tenant_id=tenant_id)
        stats = self._compute_statistics(logs, security_metrics)

        gap_context = ""
        if stats["total_queries"] > 0:
            gap_context = f"""
--- FAILURE PATTERNS (from {stats['total_queries']} queries) ---
Block rate: {stats['block_rate'] * 100:.1f}%
Error rate: {stats['error_rate'] * 100:.1f}%
Block types: {stats['block_type_distribution']}
Sample blocked questions: {json.dumps([b['question'] for b in stats['blocked_questions_sample'][:5]], ensure_ascii=False)}
Sample error questions: {json.dumps(stats['error_questions_sample'][:5], ensure_ascii=False)}
"""

        system = (
            "You are an expert in AI agent skill management. You have full access to the "
            "skill inventory of a multi-agent SQL query system. Each skill is a JSON document "
            "that teaches an agent a specific technique (SQL pattern, domain knowledge, "
            "visualization method, etc.). "
            "Answer the administrator's question concisely and specifically. "
            "Reference actual skill titles, agents, and categories from the data. "
            "If asked for recommendations, base them on the failure patterns provided. "
            "Respond in the same language as the user's question. "
            "Keep answers under 300 words unless more detail is explicitly requested."
        )

        context = f"""--- CURRENT SKILLS INVENTORY ({len(current_skills)} skills) ---
{json.dumps(current_skills, ensure_ascii=False, indent=2)}
{gap_context}
--- USER QUESTION ---
{question}"""

        response = await self._client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
            max_tokens=500,
        )
        return response.choices[0].message.content.strip()

    def _empty_report(self, tenant_id: str) -> dict:
        """Report returned when no logs exist yet."""
        return {
            "executive_summary": (
                f"No query logs found for tenant '{tenant_id}'. "
                "The analytics report will be available once users start querying the system."
            ),
            "interaction_patterns": {"most_common_topics": [], "peak_usage_observation": "No data", "user_behavior_insight": "No data"},
            "problem_areas": [],
            "skill_gaps": [],
            "recommended_skills": [],
            "performance_insights": {"avg_execution_time_ms": 0, "slowest_query_type": "N/A", "performance_recommendation": "No data yet"},
            "health_score": {"score": 0, "label": "needs_attention", "breakdown": {"success_rate": 0.0, "security_posture": "adequate", "skill_coverage": "limited"}},
            "computed_stats": {"total_queries": 0},
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "tenant_id": tenant_id,
            "logs_analyzed": 0,
        }
