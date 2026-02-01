"""
Project API Schemas

DTOs and Command Models for project endpoints (Section 2.2 of API plan).
Derived from: Project, ProjectBase, ProjectInsert, ProjectUpdate models in app/db/models.py
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.enums import ConstructionPhase
from app.schemas.common import PaginatedResponse, PaginationInfo, PaginationParams, SortOrder

# =============================================================================
# QUERY PARAMETERS
# =============================================================================


class ProjectListParams(PaginationParams):
    """
    Project list query parameters.

    GET /api/projects query params
    Extends common pagination with project-specific filters.
    """

    sort_by: str = Field(
        default="created_at",
        pattern=r"^(created_at|updated_at|name)$",
        description="Sort field: created_at, updated_at, or name",
    )
    sort_order: SortOrder = Field(
        default=SortOrder.DESC,
        description="Sort order: asc or desc",
    )
    phase: Optional[ConstructionPhase] = Field(
        default=None,
        description="Filter by construction phase",
    )
    include_deleted: bool = Field(
        default=False,
        description="Include soft-deleted projects",
    )


# =============================================================================
# RESPONSE DTOs
# =============================================================================


class ProjectListItem(BaseModel):
    """
    Project list item DTO.

    Individual project in GET /api/projects response.
    Derived from: Project model (subset of fields)
    """

    id: UUID = Field(description="Project unique identifier")
    name: str = Field(description="Project name")
    description: Optional[str] = Field(default=None, description="Project description")
    location: Optional[str] = Field(default=None, description="Project location")
    current_phase: ConstructionPhase = Field(description="Current construction phase")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")
    deleted_at: Optional[datetime] = Field(
        default=None, description="Soft delete timestamp (null if active)"
    )

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """
    Paginated project list response.

    GET /api/projects response
    """

    data: list[ProjectListItem] = Field(description="List of projects")
    pagination: PaginationInfo = Field(description="Pagination metadata")


class ProjectResponse(BaseModel):
    """
    Project response DTO (basic).

    POST /api/projects response
    Derived from: Project model
    """

    id: UUID = Field(description="Project unique identifier")
    user_id: UUID = Field(description="Owner's user ID")
    name: str = Field(description="Project name")
    description: Optional[str] = Field(default=None, description="Project description")
    location: Optional[str] = Field(default=None, description="Project location")
    current_phase: ConstructionPhase = Field(description="Current construction phase")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    """
    Project detail response DTO (with counts).

    GET /api/projects/{project_id} response
    Extends ProjectResponse with aggregated counts.
    """

    document_count: int = Field(description="Number of documents in the project")
    message_count: int = Field(description="Number of messages in the project")


class ProjectDeleteResponse(BaseModel):
    """
    Project delete response DTO.

    DELETE /api/projects/{project_id} response
    Confirms soft delete with timestamp.
    """

    id: UUID = Field(description="Deleted project's ID")
    deleted_at: datetime = Field(description="Deletion timestamp")


# =============================================================================
# REQUEST COMMAND MODELS
# =============================================================================


class ProjectCreateRequest(BaseModel):
    """
    Project create command model.

    POST /api/projects request
    Derived from: ProjectInsert model (user_id set by server from auth)

    Validation:
    - name is required and must be non-empty
    - current_phase must be a valid construction_phase enum value

    Side Effects:
    - Creates an empty project_memory record with data: {}
    """

    name: str = Field(
        min_length=1,
        max_length=255,
        description="Project name (required)",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Project description",
    )
    location: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Project location",
    )
    current_phase: ConstructionPhase = Field(
        default=ConstructionPhase.LAND_SELECTION,
        description="Initial construction phase",
    )


class ProjectUpdateRequest(BaseModel):
    """
    Project update command model.

    PUT /api/projects/{project_id} request
    Derived from: ProjectUpdate model

    All fields are optional for partial updates.
    """

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Project name",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Project description",
    )
    location: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Project location",
    )
    current_phase: Optional[ConstructionPhase] = Field(
        default=None,
        description="Construction phase to transition to",
    )
