"""DataAgent API — Main application entry point."""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.response import HealthResponse
from app.routers import admin_mgmt, analytics, audit, onboarding, platform_admin, query, skills, users

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("dataagent")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Reload persistent stores after Firebase is confirmed initialized."""
    from app.core.audit_store import audit_store
    from app.core.user_store import user_store
    from app.core.conversation_store import conversation_store
    audit_store._load_from_firestore()
    user_store.reload()
    conversation_store.reload()
    logger.info("Persistent stores reloaded from Firestore")
    yield


# FastAPI instance
app = FastAPI(
    title="DataAgent API",
    version="1.0.0",
    description="Multi-agent system that converts natural language questions to SQL queries, "
    "executes them securely, and explains the results.",
    lifespan=lifespan,
)

# CORS middleware
_cors_origins = [settings.FRONTEND_URL]
if settings.ENVIRONMENT == "development":
    _cors_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
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
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(skills.router, tags=["Skills"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(admin_mgmt.router, prefix="/admin", tags=["Admin"])
app.include_router(platform_admin.router, prefix="/platform", tags=["Platform Admin"])
