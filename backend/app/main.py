"""DataAgent API — Main application entry point."""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.response import HealthResponse
from app.routers import admin_mgmt, audit, onboarding, query, skills, users

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("dataagent")

# FastAPI instance
app = FastAPI(
    title="DataAgent API",
    version="1.0.0",
    description="Multi-agent system that converts natural language questions to SQL queries, "
    "executes them securely, and explains the results.",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with method, path, and response time."""
    start_time = time.time()
    logger.info("Incoming request: %s %s", request.method, request.url.path)

    response = await call_next(request)

    duration_ms = (time.time() - start_time) * 1000
    logger.info(
        "Completed: %s %s — %d in %.2fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# Health check endpoint
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint to verify the service is running."""
    return HealthResponse(status="ok", service="dataagent-backend")


# Register routers
app.include_router(query.router, prefix="/query", tags=["Query"])
app.include_router(onboarding.router, prefix="/onboarding", tags=["Onboarding"])
app.include_router(audit.router, prefix="/audit", tags=["Audit"])
app.include_router(skills.router, tags=["Skills"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(admin_mgmt.router, prefix="/admin", tags=["Admin"])
