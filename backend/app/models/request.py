"""Request models — Pydantic schemas for API request bodies."""

from pydantic import BaseModel


class QueryRequest(BaseModel):
    """Request body for the /query endpoint."""

    question: str
    tenant_id: str


class OnboardingRequest(BaseModel):
    """Request body for the /onboarding/connect endpoint."""

    connection_string: str
    company_name: str
    tenant_id: str
