"""Request models — Pydantic schemas for API request bodies."""

from typing import Optional

from pydantic import BaseModel


class QueryRequest(BaseModel):
    """Request body for the /query endpoint.

    tenant_id is optional — the backend always reads it from the Firebase
    token custom claim (more secure). The field is accepted for backward
    compatibility but ignored.

    clarification_context is populated in Extended Mode: a short string
    summarising the user's answers to the ClarificationAgent's questions.
    It is prepended to the question so every downstream agent has full context.
    """

    question: str
    tenant_id: Optional[str] = None
    clarification_context: Optional[str] = None


class ClarifyRequest(BaseModel):
    """Request body for the /query/clarify endpoint (Extended Mode)."""

    question: str
    tenant_id: Optional[str] = None


class OnboardingRequest(BaseModel):
    """Request body for the /onboarding/connect endpoint."""

    connection_string: str
    company_name: str
    tenant_id: str


class AllowedTablesRequest(BaseModel):
    """Request body for the allowed-tables endpoints."""

    tenant_id: str
    allowed_tables: list[str]
