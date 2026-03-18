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
