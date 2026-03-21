"""Azure Functions — Skills HTTP API.

Serverless HTTP triggers for managing and selecting AI agent skills.
Uses the Python v2 programming model with decorators.

Endpoints:
    GET    /api/skills            — List all skills (filterable by ?agent=)
    GET    /api/skills/{skill_id} — Get a single skill
    POST   /api/skills            — Create a new skill
    PUT    /api/skills/{skill_id} — Update an existing skill
    DELETE /api/skills/{skill_id} — Delete a skill
    POST   /api/skills/reload     — Reload skills from disk
    POST   /api/skills/select     — Select relevant skills via GPT-4.1
"""

import asyncio
import json
import logging

import azure.functions as func

from skills_manager import skills_manager, VALID_AGENTS

logger = logging.getLogger("skills_function")

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)


def _json_response(body: dict, status_code: int = 200) -> func.HttpResponse:
    """Helper to create a JSON HttpResponse."""
    return func.HttpResponse(
        body=json.dumps(body, ensure_ascii=False),
        status_code=status_code,
        mimetype="application/json",
    )


def _error_response(message: str, status_code: int = 400) -> func.HttpResponse:
    """Helper to create an error JSON HttpResponse."""
    return _json_response({"error": message}, status_code)


# --- List skills ---

@app.route(route="skills", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def list_skills(req: func.HttpRequest) -> func.HttpResponse:
    """List all skills, optionally filtered by agent query parameter."""
    agent = req.params.get("agent")

    if agent and agent not in VALID_AGENTS:
        return _error_response(
            f"Invalid agent: {agent}. Must be one of {VALID_AGENTS}", 400
        )

    skills = skills_manager.get_all_skills(agent=agent)
    return _json_response({
        "skills": skills,
        "total": len(skills),
        "agents": VALID_AGENTS,
    })


# --- Get single skill ---

@app.route(route="skills/{skill_id}", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def get_skill(req: func.HttpRequest) -> func.HttpResponse:
    """Get a single skill by ID."""
    skill_id = req.route_params.get("skill_id")
    skill = skills_manager.get_skill(skill_id)

    if not skill:
        return _error_response(f"Skill not found: {skill_id}", 404)

    return _json_response(skill)


# --- Create skill ---

@app.route(route="skills", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def create_skill(req: func.HttpRequest) -> func.HttpResponse:
    """Create a new skill."""
    try:
        body = req.get_json()
    except ValueError:
        return _error_response("Invalid JSON body", 400)

    # Validate required fields
    required = ["title", "description", "content", "agent"]
    missing = [f for f in required if f not in body]
    if missing:
        return _error_response(f"Missing required fields: {', '.join(missing)}", 400)

    if body["agent"] not in VALID_AGENTS:
        return _error_response(
            f"Invalid agent: {body['agent']}. Must be one of {VALID_AGENTS}", 400
        )

    try:
        skill = skills_manager.create_skill(body)
        return _json_response(skill, 201)
    except ValueError as e:
        return _error_response(str(e), 400)


# --- Update skill ---

@app.route(route="skills/{skill_id}", methods=["PUT"], auth_level=func.AuthLevel.FUNCTION)
def update_skill(req: func.HttpRequest) -> func.HttpResponse:
    """Update an existing skill."""
    skill_id = req.route_params.get("skill_id")

    try:
        body = req.get_json()
    except ValueError:
        return _error_response("Invalid JSON body", 400)

    if not body:
        return _error_response("No fields to update", 400)

    skill = skills_manager.update_skill(skill_id, body)
    if not skill:
        return _error_response(f"Skill not found: {skill_id}", 404)

    return _json_response(skill)


# --- Delete skill ---

@app.route(route="skills/{skill_id}", methods=["DELETE"], auth_level=func.AuthLevel.FUNCTION)
def delete_skill(req: func.HttpRequest) -> func.HttpResponse:
    """Delete a skill."""
    skill_id = req.route_params.get("skill_id")
    deleted = skills_manager.delete_skill(skill_id)

    if not deleted:
        return _error_response(f"Skill not found: {skill_id}", 404)

    return _json_response({"deleted": True, "id": skill_id})


# --- Reload skills ---

@app.route(route="skills/reload", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def reload_skills(req: func.HttpRequest) -> func.HttpResponse:
    """Reload all skills from disk."""
    skills_manager.reload()
    skills = skills_manager.get_all_skills()
    return _json_response({
        "reloaded": True,
        "total": len(skills),
    })


# --- Select relevant skills (GPT-4.1) ---

@app.route(route="skills/select", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
async def select_skills(req: func.HttpRequest) -> func.HttpResponse:
    """Select the most relevant skills for a query using GPT-4.1.

    Returns selected skills AND a pre-formatted prompt string so the
    backend doesn't need to re-implement formatting logic.
    """
    try:
        body = req.get_json()
    except ValueError:
        return _error_response("Invalid JSON body", 400)

    agent = body.get("agent")
    query = body.get("query")
    top = body.get("top", 3)

    if not agent or not query:
        return _error_response("Missing required fields: agent, query", 400)

    if agent not in VALID_AGENTS:
        return _error_response(
            f"Invalid agent: {agent}. Must be one of {VALID_AGENTS}", 400
        )

    selected = await skills_manager.select_relevant_skills(
        agent=agent,
        query=query,
        top=min(top, 10),
    )

    formatted_prompt = skills_manager.format_skills_for_prompt(selected)

    return _json_response({
        "selected": selected,
        "total": len(selected),
        "agent": agent,
        "query": query,
        "formatted_prompt": formatted_prompt,
    })
