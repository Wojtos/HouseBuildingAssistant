"""
Health Check API Schemas

DTOs for health check endpoint (Section 2.7 of API plan).
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

# =============================================================================
# ENUMS
# =============================================================================


class ServiceStatus(str, Enum):
    """Service health status"""

    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


# =============================================================================
# RESPONSE DTOs
# =============================================================================


class ServiceHealthStatus(BaseModel):
    """
    Individual service health status.

    Status of each dependent service.
    """

    database: ServiceStatus = Field(description="PostgreSQL database connection status")
    supabase_auth: ServiceStatus = Field(description="Supabase Auth service status")
    openrouter: ServiceStatus = Field(description="OpenRouter AI API status")
    ocr_service: ServiceStatus = Field(description="OCR processing service status")


class HealthResponse(BaseModel):
    """
    Health check response DTO.

    GET /api/health response
    Provides overall system health and status of dependent services.

    Response Codes:
    - 200 OK: All services healthy
    - 503 Service Unavailable: One or more services unhealthy
    """

    status: ServiceStatus = Field(description="Overall system health status")
    version: str = Field(description="API version string")
    timestamp: datetime = Field(description="Health check timestamp")
    services: ServiceHealthStatus = Field(description="Individual service health statuses")
