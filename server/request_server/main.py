from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from request_server.api.router import api_router
from request_server.core.config import settings
from request_server.core.telemetry import (
    get_prometheus_app,
    init_telemetry,
    instrument_app,
    shutdown_telemetry,
)

# Initialize OTEL providers before app creation
init_telemetry()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    shutdown_telemetry()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    debug=settings.debug,
)

# Instrument FastAPI app with OTEL
instrument_app(app)

# CORS middleware
app.add_middleware(
    CORSMiddleware,  # type: ignore[arg-type]
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router)

# Prometheus metrics endpoint
app.mount("/metrics", get_prometheus_app())


def get_status_response():
    """Return standard status response."""
    return {
        "name": settings.app_name,
        "status": "ok",
        "version": settings.app_version,
    }


@app.get("/")
async def root():
    """Root endpoint returning server info."""
    return get_status_response()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return get_status_response()
