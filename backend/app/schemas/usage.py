"""
Usage API Schemas

DTOs and Command Models for usage tracking endpoints (Section 2.6 of API plan).
Derived from: UsageLog, UsageLogBase models in app/db/models.py
"""

from datetime import date
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# =============================================================================
# ENUMS
# =============================================================================

class UsageGroupBy(str, Enum):
    """Grouping options for usage statistics"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


# =============================================================================
# QUERY PARAMETERS
# =============================================================================

class UsageParams(BaseModel):
    """
    Usage query parameters.
    
    GET /api/usage and GET /api/projects/{project_id}/usage query params
    """
    start_date: Optional[date] = Field(
        default=None,
        description="Start of date range (defaults to 30 days ago)",
    )
    end_date: Optional[date] = Field(
        default=None,
        description="End of date range (defaults to today)",
    )
    group_by: UsageGroupBy = Field(
        default=UsageGroupBy.DAY,
        description="Grouping period: day, week, or month",
    )


# =============================================================================
# RESPONSE DTOs
# =============================================================================

class UsageSummary(BaseModel):
    """
    Usage summary statistics.
    
    Aggregated totals for the requested period.
    """
    total_tokens: int = Field(
        description="Total tokens consumed across all APIs"
    )
    total_cost: float = Field(
        description="Total estimated cost in USD"
    )
    total_requests: int = Field(
        description="Total number of API requests made"
    )


class UsagePeriodItem(BaseModel):
    """
    Usage breakdown by time period.
    
    Individual period (day/week/month) statistics.
    """
    period: str = Field(
        description="Period identifier (e.g., '2024-01-15' for day)"
    )
    tokens: int = Field(
        description="Tokens consumed in this period"
    )
    cost: float = Field(
        description="Estimated cost in USD for this period"
    )
    requests: int = Field(
        description="Number of API requests in this period"
    )


class UsageApiItem(BaseModel):
    """
    Usage breakdown by API/service.
    
    Statistics for a specific API or service.
    """
    api_name: str = Field(
        description="Name of the API or service (e.g., 'OpenRouter', 'Google Search')"
    )
    tokens: int = Field(
        description="Total tokens consumed by this API"
    )
    cost: float = Field(
        description="Total estimated cost for this API in USD"
    )


class UsageResponse(BaseModel):
    """
    User usage response DTO.
    
    GET /api/usage response
    Aggregated usage statistics across all projects for the authenticated user.
    """
    summary: UsageSummary = Field(
        description="Overall usage summary for the period"
    )
    by_period: list[UsagePeriodItem] = Field(
        description="Usage breakdown by time period"
    )
    by_api: list[UsageApiItem] = Field(
        description="Usage breakdown by API/service"
    )


class ProjectUsageResponse(BaseModel):
    """
    Project usage response DTO.
    
    GET /api/projects/{project_id}/usage response
    Usage statistics for a specific project.
    """
    project_id: UUID = Field(
        description="Project identifier"
    )
    summary: UsageSummary = Field(
        description="Usage summary for this project"
    )
    by_api: list[UsageApiItem] = Field(
        description="Usage breakdown by API/service"
    )

