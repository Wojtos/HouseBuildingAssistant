"""
Project Memory API Schemas

DTOs and Command Models for project memory endpoints (Section 2.3 of API plan).
Derived from: ProjectMemory, ProjectMemoryBase, ProjectMemoryUpdate,
              MemoryAuditTrail, MemoryAuditTrailBase models in app/db/models.py
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import PaginationInfo, PaginationParams


# =============================================================================
# TYPE ALIASES
# =============================================================================

# Flexible JSON structure for project memory data
# Keys are typically category names (FINANCE, PERMITTING, etc.)
ProjectMemoryData = dict[str, Any]


# =============================================================================
# QUERY PARAMETERS
# =============================================================================

class MemoryAuditListParams(PaginationParams):
    """
    Memory audit trail list query parameters.
    
    GET /api/projects/{project_id}/memory/audit query params
    Uses standard pagination parameters.
    """
    pass


# =============================================================================
# RESPONSE DTOs
# =============================================================================

class ProjectMemoryResponse(BaseModel):
    """
    Project memory response DTO.
    
    GET /api/projects/{project_id}/memory response
    Derived from: ProjectMemory model in app/db/models.py
    
    The data field contains a flexible JSONB structure organized by categories:
    - FINANCE: Budget, currency, loan information
    - PERMITTING: Zoning, setbacks, permit status
    - DESIGN: Architectural preferences, room counts
    - etc.
    """
    id: UUID = Field(description="Memory record unique identifier")
    project_id: UUID = Field(description="Associated project ID")
    data: ProjectMemoryData = Field(
        description="Structured memory data organized by category"
    )
    updated_at: datetime = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


class MemoryAuditItem(BaseModel):
    """
    Memory audit trail item DTO.
    
    Individual entry in the audit trail list.
    Derived from: MemoryAuditTrail model in app/db/models.py
    """
    id: UUID = Field(description="Audit entry unique identifier")
    project_id: UUID = Field(description="Associated project ID")
    agent_id: Optional[str] = Field(
        default=None,
        description="AI agent that made the change (null for user changes)",
    )
    change_summary: Optional[str] = Field(
        default=None,
        description="Human-readable description of the change",
    )
    previous_data: Optional[ProjectMemoryData] = Field(
        default=None,
        description="Memory state before the change",
    )
    new_data: Optional[ProjectMemoryData] = Field(
        default=None,
        description="Memory state after the change",
    )
    created_at: datetime = Field(description="Change timestamp")

    class Config:
        from_attributes = True


class MemoryAuditListResponse(BaseModel):
    """
    Paginated memory audit trail response.
    
    GET /api/projects/{project_id}/memory/audit response
    """
    data: list[MemoryAuditItem] = Field(description="List of audit entries")
    pagination: PaginationInfo = Field(description="Pagination metadata")


# =============================================================================
# REQUEST COMMAND MODELS
# =============================================================================

class ProjectMemoryUpdateRequest(BaseModel):
    """
    Project memory update command model.
    
    PATCH /api/projects/{project_id}/memory request
    Derived from: ProjectMemoryUpdate model + audit metadata
    
    Note: Uses deep merge with existing data. New keys are added,
    existing keys are updated, but keys are not deleted.
    
    Validation:
    - data must be a valid JSON object
    - JSON Schema validation performed for critical fields:
      - Budget must be numeric if present
      - Dates must be valid ISO8601 format
      - Enum fields must match allowed values
    
    Side Effects:
    - Creates a memory_audit_trail record with previous and new data
    """
    data: ProjectMemoryData = Field(
        description="Memory data to merge with existing data"
    )
    agent_id: Optional[str] = Field(
        default=None,
        description="AI agent making the change (for audit purposes)",
    )
    change_summary: Optional[str] = Field(
        default=None,
        description="Human-readable description of the change",
    )

