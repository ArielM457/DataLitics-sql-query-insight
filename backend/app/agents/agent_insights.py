"""Insights Agent — Generates analytical insights from query results.

Uses dynamically selected Skills from "Storytelling with Data" (Cole
Nussbaumer Knaflic) combined with Azure OpenAI GPT-4.1 to produce
human-readable summaries, key findings, actionable recommendations,
and chart suggestions based on the executed query data.

Skills are loaded from JSON files and selected by GPT-4.1 based on
relevance to the data being analyzed.

Features:
- Business-domain language (not technical DB terminology)
- Trend/anomaly/correlation detection
- At least 2 actionable recommendations
- Chart type justified with Cole Nussbaumer citation
- Follow-up question suggestion
"""

import json
import logging

from openai import AsyncAzureOpenAI

from app.config import settings
from app.core.skills import skills_manager

logger = logging.getLogger("dataagent.agents.insights")

SYSTEM_PROMPT = """You are an expert business data analyst and storyteller.
Your job is to interpret query results and generate insights that a business user
can understand and act on.

You follow the methodology from "Storytelling with Data" by Cole Nussbaumer Knaflic:
- Lead with the key message
- Choose the right chart type for the data and audience
- Remove clutter and focus attention
- Tell a story with the data

Your output MUST be a valid JSON object with this exact structure:
{
    "summary": "2-3 sentence business summary in clear language",
    "findings": [
        "Specific observation about the data",
        "Trend, anomaly, or correlation identified",
        "Non-obvious insight"
    ],
    "recommendations": [
        "Actionable recommendation in business-technical language",
        "Actionable recommendation with specific next steps"
    ],
    "chart_type": "bar|line|scatter|table|heatmap|pie",
    "chart_config": {
        "labels": ["label1", "label2"],
        "datasets": [
            {
                "label": "Dataset name",
                "data": [value1, value2]
            }
        ],
        "title": "Chart title"
    },
    "chart_justification": "Why this chart type was chosen, citing Cole Nussbaumer",
    "source": {
        "libro": "Book name",
        "capitulo": "Chapter",
        "pagina": 0
    },
    "follow_up_question": "A relevant follow-up question the user might want to ask"
}

Rules:
- Use the language of the business domain, not technical database terminology
- Identify at least one trend, anomaly, or correlation if the data supports it
- Provide at least 2 actionable recommendations
- Choose the chart type that best communicates the key message
- Always cite the source book and chapter for the chart justification
- Suggest a follow-up question that deepens the analysis
- Output valid JSON only — no markdown, no extra text
- LANGUAGE: Detect the language of the user's original question and write ALL text
  fields (summary, findings, recommendations, chart_justification, chart_config.title,
  follow_up_question) in that same language
"""


class InsightsAgent:
    """Agent 4: Generates insights and visualizations from query data.

    Uses dynamically selected Skills with Cole Nussbaumer's data
    storytelling methodology combined with GPT-4.1 to produce
    actionable insights, chart recommendations, and source citations.
    """

    def __init__(self):
        self._client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version="2024-10-21",
        )

    async def generate(self, data: dict, question: str, tenant_id: str) -> dict:
        """Generate analytical insights from query results.

        Args:
            data: The query execution results from ExecutionAgent.
            question: The original natural language question.
            tenant_id: The tenant identifier for context.

        Returns:
            dict: Insights result with summary, findings, recommendations,
                  chart configuration, source citations, and follow-up question.
        """
        logger.info("Generating insights: tenant=%s, rows=%d", tenant_id, data.get("rows", 0))

        # Select relevant visualization/storytelling skills
        selected_skills = await skills_manager.select_relevant_skills(
            agent="agent_insights",
            query=question,
            top=3,
        )
        skills_context = skills_manager.format_skills_for_prompt(selected_skills)

        # Prepare data sample (limit to avoid token overflow)
        query_data = data.get("data", [])
        sample_size = min(len(query_data), 50)
        data_sample = query_data[:sample_size]

        # Extract column names from data
        columns = list(data_sample[0].keys()) if data_sample else []

        user_message = f"""Original question: {question}

--- QUERY RESULTS ---
Total rows: {data.get('rows', 0)}
Columns: {', '.join(columns)}
Execution time: {data.get('execution_time_ms', 0):.0f}ms

Data sample ({sample_size} of {data.get('rows', 0)} rows):
{json.dumps(data_sample, ensure_ascii=False, indent=2, default=str)}

--- VISUALIZATION & STORYTELLING SKILLS ---
{skills_context}

Analyze the data and generate insights as a JSON object following the specified structure.
Choose the chart type that best communicates the key finding to a business audience.
"""

        response = await self._client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()

        try:
            insights = json.loads(raw)
        except json.JSONDecodeError:
            logger.error("Failed to parse insights JSON: %s", raw)
            insights = self._fallback_insights(data, question)

        # Ensure all required fields exist
        insights.setdefault("summary", "Analysis complete.")
        insights.setdefault("findings", [])
        insights.setdefault("recommendations", [])
        insights.setdefault("chart_type", "table")
        insights.setdefault("chart_config", {"labels": [], "datasets": [], "title": question})
        insights.setdefault("chart_justification", "")
        insights.setdefault("source", {"libro": "", "capitulo": "", "pagina": 0})
        insights.setdefault("follow_up_question", "")

        # Use skill source if available and insights didn't provide one
        if not insights["source"].get("libro") and selected_skills:
            src = selected_skills[0].get("source", {})
            insights["source"] = {
                "libro": src.get("book", ""),
                "capitulo": src.get("chapter", ""),
                "pagina": src.get("pages", 0),
            }

        logger.info(
            "Insights generated: chart=%s, findings=%d, recommendations=%d, skills_used=%d",
            insights["chart_type"],
            len(insights["findings"]),
            len(insights["recommendations"]),
            len(selected_skills),
        )

        return insights

    def _fallback_insights(self, data: dict, question: str) -> dict:
        """Generate minimal fallback insights when GPT-4.1 parsing fails."""
        rows = data.get("rows", 0)
        return {
            "summary": f"Query returned {rows} rows of data for your question: '{question}'.",
            "findings": [
                f"The query returned {rows} rows of data.",
            ],
            "recommendations": [
                "Consider adding more specific filters to narrow down the results.",
                "Try grouping the data by key categories for a clearer picture.",
            ],
            "chart_type": "table",
            "chart_config": {
                "labels": [],
                "datasets": [],
                "title": question,
            },
            "chart_justification": (
                "A table is used as the default when the data structure is not yet "
                "analyzed. Per Cole Nussbaumer, tables are appropriate when the "
                "audience needs to look up specific values."
            ),
            "source": {
                "libro": "Storytelling with Data",
                "capitulo": "5 - Think Like a Designer",
                "pagina": 148,
            },
            "follow_up_question": "What specific trend or comparison would you like to explore?",
        }
