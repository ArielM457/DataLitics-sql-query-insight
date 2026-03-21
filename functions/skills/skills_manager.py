"""Skills Manager — Core logic for Azure Function App.

Loads skills from JSON files, selects the most relevant skills per
request using GPT-4.1 semantic ranking, and provides CRUD operations.

This is the serverless version of the SkillsManager that runs inside
Azure Functions. Settings come from environment variables (os.environ).
"""

import json
import logging
import os
import uuid
from pathlib import Path

from openai import AsyncAzureOpenAI

logger = logging.getLogger("skills_function.manager")

# Base directory for skills JSON files (relative to this file)
SKILLS_DIR = Path(__file__).parent / "skills"

# Valid agent directories
VALID_AGENTS = ["agent_intention", "agent_sql", "agent_execution", "agent_insights"]


def _get_openai_client() -> AsyncAzureOpenAI:
    """Create an AsyncAzureOpenAI client from environment variables."""
    return AsyncAzureOpenAI(
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
        api_key=os.environ.get("AZURE_OPENAI_API_KEY", ""),
        api_version="2024-10-21",
    )


class SkillsManager:
    """Manages skill loading, selection, and CRUD operations.

    Skills are stored as JSON files in the skills/ directory, organized
    by agent. Each skill has a title, description, content, tags, and
    metadata that enables GPT-4.1 to select the most relevant skills
    for a given user request.
    """

    def __init__(self):
        self._skills_cache: dict[str, list[dict]] = {}
        self._load_all_skills()

    def _load_all_skills(self):
        """Load all skills from JSON files into memory cache."""
        self._skills_cache.clear()
        for agent in VALID_AGENTS:
            agent_dir = SKILLS_DIR / agent
            self._skills_cache[agent] = []
            if not agent_dir.exists():
                logger.warning("Skills directory not found: %s", agent_dir)
                continue
            for file_path in sorted(agent_dir.glob("*.json")):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        skill = json.load(f)
                    skill["_file"] = str(file_path)
                    if skill.get("active", True):
                        self._skills_cache[agent].append(skill)
                except Exception as e:
                    logger.error("Failed to load skill %s: %s", file_path, e)

        total = sum(len(v) for v in self._skills_cache.values())
        logger.info(
            "Skills loaded: %d total (%s)",
            total,
            ", ".join(f"{k}={len(v)}" for k, v in self._skills_cache.items()),
        )

    def reload(self):
        """Reload all skills from disk."""
        self._load_all_skills()

    def get_all_skills(self, agent: str = None) -> list[dict]:
        """Get all skills, optionally filtered by agent."""
        if agent:
            return [self._public_skill(s) for s in self._skills_cache.get(agent, [])]
        result = []
        for agent_skills in self._skills_cache.values():
            result.extend(self._public_skill(s) for s in agent_skills)
        return result

    def get_skill(self, skill_id: str) -> dict | None:
        """Get a single skill by ID."""
        for agent_skills in self._skills_cache.values():
            for skill in agent_skills:
                if skill.get("id") == skill_id:
                    return self._public_skill(skill)
        return None

    def create_skill(self, skill_data: dict) -> dict:
        """Create a new skill and save to disk."""
        agent = skill_data.get("agent")
        if agent not in VALID_AGENTS:
            raise ValueError(f"Invalid agent: {agent}. Must be one of {VALID_AGENTS}")

        skill_id = skill_data.get("id") or f"{agent.split('_')[1]}_{uuid.uuid4().hex[:6]}"
        skill = {
            "id": skill_id,
            "title": skill_data["title"],
            "description": skill_data["description"],
            "agent": agent,
            "category": skill_data.get("category", "general"),
            "content": skill_data["content"],
            "source": skill_data.get("source", {}),
            "tags": skill_data.get("tags", []),
            "version": skill_data.get("version", 1),
            "active": skill_data.get("active", True),
        }

        agent_dir = SKILLS_DIR / agent
        agent_dir.mkdir(parents=True, exist_ok=True)
        filename = skill_data.get("title", skill_id).lower().replace(" ", "_")
        filename = "".join(c for c in filename if c.isalnum() or c == "_")[:50]
        file_path = agent_dir / f"{filename}.json"

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(skill, f, ensure_ascii=False, indent=2)

        logger.info("Skill created: id=%s, agent=%s, file=%s", skill_id, agent, file_path)
        self.reload()
        return self._public_skill(skill)

    def update_skill(self, skill_id: str, updates: dict) -> dict | None:
        """Update an existing skill."""
        for agent_skills in self._skills_cache.values():
            for skill in agent_skills:
                if skill.get("id") == skill_id:
                    file_path = skill.get("_file")
                    if not file_path:
                        return None

                    for field in ["title", "description", "content", "category",
                                  "tags", "source", "active"]:
                        if field in updates:
                            skill[field] = updates[field]

                    skill["version"] = skill.get("version", 1) + 1

                    save_data = {k: v for k, v in skill.items() if k != "_file"}
                    with open(file_path, "w", encoding="utf-8") as f:
                        json.dump(save_data, f, ensure_ascii=False, indent=2)

                    logger.info("Skill updated: id=%s, version=%d", skill_id, skill["version"])
                    self.reload()
                    return self._public_skill(skill)
        return None

    def delete_skill(self, skill_id: str) -> bool:
        """Delete a skill by ID."""
        for agent_skills in self._skills_cache.values():
            for skill in agent_skills:
                if skill.get("id") == skill_id:
                    file_path = skill.get("_file")
                    if file_path and os.path.exists(file_path):
                        os.remove(file_path)
                        logger.info("Skill deleted: id=%s, file=%s", skill_id, file_path)
                        self.reload()
                        return True
        return False

    async def select_relevant_skills(
        self, agent: str, query: str, top: int = 3
    ) -> list[dict]:
        """Select the most relevant skills for a query using GPT-4.1."""
        available = self._skills_cache.get(agent, [])
        if not available:
            return []

        if len(available) <= top:
            return [self._public_skill(s) for s in available]

        catalog = [
            {
                "id": skill["id"],
                "title": skill["title"],
                "description": skill["description"],
                "tags": skill.get("tags", []),
            }
            for skill in available
        ]
        catalog_json = json.dumps(catalog, ensure_ascii=False, indent=2)

        try:
            client = _get_openai_client()
            deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4.1")

            response = await client.chat.completions.create(
                model=deployment,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a skill selector. Given a user query and a catalog of "
                            "available skills, return the IDs of the most relevant skills "
                            "ordered by relevance.\n\n"
                            "Output MUST be a JSON object: {\"selected_ids\": [\"id1\", \"id2\", ...]}\n"
                            "Select the skills whose knowledge would be most useful to "
                            "answer the user's query. Consider title, description, and tags."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"User query: {query}\n\n"
                            f"Available skills:\n{catalog_json}\n\n"
                            f"Select the top {top} most relevant skills."
                        ),
                    },
                ],
                temperature=0.0,
                max_tokens=200,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content.strip()
            result = json.loads(raw)
            selected_ids = result.get("selected_ids", [])[:top]

            id_to_skill = {s["id"]: s for s in available}
            selected = [
                self._public_skill(id_to_skill[sid])
                for sid in selected_ids
                if sid in id_to_skill
            ]

            logger.info("Skills selected for '%s': %s", query[:50], [s["id"] for s in selected])
            return selected

        except Exception as e:
            logger.error("Skill selection failed, returning first %d: %s", top, e)
            return [self._public_skill(s) for s in available[:top]]

    def format_skills_for_prompt(self, skills: list[dict]) -> str:
        """Format selected skills as context for injection into agent prompts."""
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

    def _public_skill(self, skill: dict) -> dict:
        """Return skill without internal fields."""
        return {k: v for k, v in skill.items() if not k.startswith("_")}


# Singleton instance — initialized when the Function App process starts
skills_manager = SkillsManager()
