"""Request models — Pydantic schemas for API request bodies."""

from typing import Optional

from pydantic import BaseModel


class QueryRequest(BaseModel):
    """Request body for the /query endpoint.

    tenant_id is optional — the backend always reads it from the Firebase
    token custom claim (more secure). The field is accepted for backward
    compatibility but ignored.
    """

    question: str
    tenant_id: Optional[str] = None


class OnboardingRequest(BaseModel):
    """Request body for the /onboarding/connect endpoint."""

    connection_string: str
    company_name: str
    tenant_id: str
