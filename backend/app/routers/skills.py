"""Skills API — Proxy endpoints to the Skills Azure Function App.

Provides a REST API for listing, creating, updating, and deleting
skills via the backend. Requests are proxied to the Azure Function App
where the actual skill storage and GPT-4.1 selection happen.

Endpoints:
    GET    /skills           — List all skills (filterable by agent)
    GET    /skills/{id}      — Get a single skill
    POST   /skills           — Create a new skill
    PUT    /skills/{id}      — Update an existing skill
    DELETE /skills/{id}      — Delete a skill
    POST   /skills/reload    — Reload skills from disk
    POST   /skills/select    — Select relevant skills for a query (GPT-4.1)
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.skills import skills_manager, VALID_AGENTS

logger = logging.getLogger("dataagent.routers.skills")

router = APIRouter(prefix="/skills", tags=["skills"])


# --- Request/Response Models ---


class SkillCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=500)
    content: str = Field(..., min_length=20)
    agent: str = Field(..., description=f"One of: {', '.join(VALID_AGENTS)}")
    category: str = Field(default="general")
    source: dict = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


class SkillUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=500)
    content: Optional[str] = Field(None, min_length=20)
    category: Optional[str] = None
    source: Optional[dict] = None
    tags: Optional[list[str]] = None
    active: Optional[bool] = None


class SkillSelectRequest(BaseModel):
    agent: str = Field(..., description=f"One of: {', '.join(VALID_AGENTS)}")
    query: str = Field(..., min_length=3, description="User question or context")
    top: int = Field(default=3, ge=1, le=10)


# --- Endpoints ---


@router.get("")
async def list_skills(agent: Optional[str] = Query(None, description="Filter by agent")):
    """List all skills, optionally filtered by agent."""
    if agent and agent not in VALID_AGENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid agent: {agent}. Must be one of {VALID_AGENTS}",
        )
    skills = await skills_manager.get_all_skills(agent=agent)
    return {
        "skills": skills,
        "total": len(skills),
        "agents": VALID_AGENTS,
    }


@router.get("/{skill_id}")
async def get_skill(skill_id: str):
    """Get a single skill by ID."""
    skill = await skills_manager.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill not found: {skill_id}")
    return skill


@router.post("", status_code=201)
async def create_skill(skill_data: SkillCreate):
    """Create a new skill."""
    try:
        skill = await skills_manager.create_skill(skill_data.model_dump())
        return skill
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{skill_id}")
async def update_skill(skill_id: str, updates: SkillUpdate):
    """Update an existing skill."""
    update_data = updates.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    skill = await skills_manager.update_skill(skill_id, update_data)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill not found: {skill_id}")
    return skill


@router.delete("/{skill_id}")
async def delete_skill(skill_id: str):
    """Delete a skill."""
    deleted = await skills_manager.delete_skill(skill_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Skill not found: {skill_id}")
    return {"deleted": True, "id": skill_id}


@router.post("/reload")
async def reload_skills():
    """Reload all skills from disk on the Function App."""
    result = await skills_manager.reload()
    return result


@router.post("/select")
async def select_skills(request: SkillSelectRequest):
    """Select the most relevant skills for a query using GPT-4.1."""
    if request.agent not in VALID_AGENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid agent: {request.agent}. Must be one of {VALID_AGENTS}",
        )

    selected = await skills_manager.select_relevant_skills(
        agent=request.agent,
        query=request.query,
        top=request.top,
    )

    formatted_prompt = skills_manager.format_skills_for_prompt(selected)

    return {
        "selected": selected,
        "total": len(selected),
        "agent": request.agent,
        "query": request.query,
        "formatted_prompt": formatted_prompt,
    }
