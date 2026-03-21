"""Skills Client — HTTP client for the Azure Functions Skills API.

Calls the Skills Azure Function App via HTTP instead of loading skills
locally. Preserves the same public interface (select_relevant_skills,
format_skills_for_prompt) so that the agents require zero changes.

The Function App handles:
- Skill storage (JSON files)
- GPT-4.1 semantic selection
- CRUD operations
- Prompt formatting
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger("dataagent.core.skills")

# Valid agent directories (kept for validation)
VALID_AGENTS = ["agent_intention", "agent_sql", "agent_execution", "agent_insights"]


class SkillsClient:
    """HTTP client for the Skills Azure Function App.

    Replaces the local SkillsManager with HTTP calls to the
    serverless Function App. Preserves the same public interface
    so that agent code requires no changes.
    """

    def __init__(self):
        self._base_url = settings.SKILLS_FUNCTION_APP_URL.rstrip("/") + "/api"
        self._function_key = settings.SKILLS_FUNCTION_KEY
        self._client = httpx.AsyncClient(timeout=30.0)
        self._last_formatted_prompt = ""

    def _headers(self) -> dict:
        """Build request headers with Function key auth."""
        headers = {"Content-Type": "application/json"}
        if self._function_key:
            headers["x-functions-key"] = self._function_key
        return headers

    async def select_relevant_skills(
        self, agent: str, query: str, top: int = 3
    ) -> list[dict]:
        """Select the most relevant skills for a query via the Function App.

        The Function App uses GPT-4.1 to rank skills by relevance.
        Also caches the formatted_prompt from the response so that
        format_skills_for_prompt() can return it without an extra call.

        Args:
            agent: The agent to select skills for.
            query: The user's question or context.
            top: Maximum number of skills to return.

        Returns:
            list: The most relevant skills, ordered by relevance.
        """
        try:
            response = await self._client.post(
                f"{self._base_url}/skills/select",
                json={"agent": agent, "query": query, "top": top},
                headers=self._headers(),
            )
            response.raise_for_status()
            data = response.json()

            self._last_formatted_prompt = data.get("formatted_prompt", "")
            selected = data.get("selected", [])

            logger.info(
                "Skills selected via Function App: agent=%s, count=%d",
                agent, len(selected),
            )
            return selected

        except Exception as e:
            logger.error("Skills Function App call failed: %s", e)
            self._last_formatted_prompt = ""
            return []

    def format_skills_for_prompt(self, skills: list[dict]) -> str:
        """Return the pre-formatted prompt from the last select call.

        The Function App returns formatted_prompt in the /select response,
        so we cache it and return it here. This avoids re-implementing
        the formatting logic in the backend and saves an HTTP round-trip.

        Args:
            skills: List of skill dictionaries (used as fallback).

        Returns:
            str: Formatted text ready to inject into the agent prompt.
        """
        if self._last_formatted_prompt:
            return self._last_formatted_prompt

        # Fallback: format locally if cache is empty
        if not skills:
            return ""

        sections = []
        for skill in skills:
            source = skill.get("source", {})
            source_str = ""
            if source:
                source_str = (
                    f"\n[Source: {source.get('book', '')}, "
                    f"{source.get('chapter', '')}, p.{source.get('pages', '')}]"
                )
            sections.append(f"### {skill['title']}\n{skill['content']}{source_str}")

        return "\n\n".join(sections)

    # --- CRUD methods (proxy to Function App) ---

    async def get_all_skills(self, agent: str = None) -> list[dict]:
        """List all skills, optionally filtered by agent."""
        try:
            params = {}
            if agent:
                params["agent"] = agent
            response = await self._client.get(
                f"{self._base_url}/skills",
                params=params,
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json().get("skills", [])
        except Exception as e:
            logger.error("Failed to list skills: %s", e)
            return []

    async def get_skill(self, skill_id: str) -> dict | None:
        """Get a single skill by ID."""
        try:
            response = await self._client.get(
                f"{self._base_url}/skills/{skill_id}",
                headers=self._headers(),
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("Failed to get skill %s: %s", skill_id, e)
            return None

    async def create_skill(self, skill_data: dict) -> dict:
        """Create a new skill."""
        response = await self._client.post(
            f"{self._base_url}/skills",
            json=skill_data,
            headers=self._headers(),
        )
        response.raise_for_status()
        return response.json()

    async def update_skill(self, skill_id: str, updates: dict) -> dict | None:
        """Update an existing skill."""
        response = await self._client.put(
            f"{self._base_url}/skills/{skill_id}",
            json=updates,
            headers=self._headers(),
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()

    async def delete_skill(self, skill_id: str) -> bool:
        """Delete a skill by ID."""
        response = await self._client.delete(
            f"{self._base_url}/skills/{skill_id}",
            headers=self._headers(),
        )
        if response.status_code == 404:
            return False
        response.raise_for_status()
        return True

    async def reload(self) -> dict:
        """Reload skills on the Function App."""
        try:
            response = await self._client.post(
                f"{self._base_url}/skills/reload",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("Failed to reload skills: %s", e)
            return {"reloaded": False}


# Singleton instance — same variable name so agents need zero changes
skills_manager = SkillsClient()
