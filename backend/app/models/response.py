"""Response models — Pydantic schemas for API response bodies."""

from pydantic import BaseModel


class QueryResponse(BaseModel):
    """Response body for the /query endpoint."""

    sql: str
    explanation: str
    data: list
    insights: dict
    security: dict
    trace: dict


class HealthResponse(BaseModel):
    """Response body for the /health endpoint."""

    status: str
    service: str


class OnboardingResponse(BaseModel):
    """Response body for the /onboarding/connect endpoint."""

    status: str
    tenant_id: str
    company_name: str
    tables_found: int
    schema_summary: dict
    dab_config: dict
    next_steps: list
