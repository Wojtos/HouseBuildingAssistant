"""
Projects API Router
Example implementation showing how to use Supabase with FastAPI
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.api.dependencies import get_current_user
from app.db import (
    Project,
    ProjectInsert,
    ProjectUpdate,
    get_supabase,
)
from app.schemas.common import PaginationInfo
from app.schemas.project import ProjectCreateRequest, ProjectListResponse, ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="updated_at"),
    sort_order: str = Query(default="desc"),
    phase: Optional[str] = Query(default=None),
    include_deleted: bool = Query(default=False),
    user_id: UUID = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Get all projects for the authenticated user with pagination.

    **Authentication:** Required (Bearer token in Authorization header)

    Example:
        GET /projects?page=1&limit=20&sort_by=updated_at&sort_order=desc
        Authorization: Bearer <jwt_token>
    """
    # Build query
    query = supabase.table("projects").select("*", count="exact").eq("user_id", str(user_id))

    # Apply phase filter
    if phase:
        query = query.eq("current_phase", phase)

    # Apply sorting
    is_desc = sort_order.lower() == "desc"
    query = query.order(sort_by, desc=is_desc)

    # Apply pagination
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    # Calculate pagination
    total_items = response.count or 0
    total_pages = (total_items + limit - 1) // limit if total_items > 0 else 1

    return ProjectListResponse(
        data=response.data,
        pagination=PaginationInfo(
            page=page,
            limit=limit,
            total_items=total_items,
            total_pages=total_pages,
        ),
    )


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Get a single project by ID.

    **Authentication:** Required (Bearer token in Authorization header)
    **Authorization:** User must own the project

    Example:
        GET /projects/123e4567-e89b-12d3-a456-426614174000
        Authorization: Bearer <jwt_token>
    """
    response = (
        supabase.table("projects")
        .select("*")
        .eq("id", str(project_id))
        .eq("user_id", str(user_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Project not found")

    return response.data[0]


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    project_data: ProjectCreateRequest,
    user_id: UUID = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Create a new project.

    The user_id is extracted from the JWT token in the Authorization header.

    Example:
        POST /projects
        Authorization: Bearer <jwt_token>
        {
            "name": "My Dream House",
            "location": "Warsaw, Poland",
            "current_phase": "LAND_SELECTION"
        }
    """
    # Create ProjectInsert with user_id from auth token
    project_insert = ProjectInsert(
        user_id=user_id,
        name=project_data.name,
        location=project_data.location,
        current_phase=project_data.current_phase,
    )

    response = supabase.table("projects").insert(project_insert.model_dump(mode="json")).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create project")

    return response.data[0]


@router.patch("/{project_id}", response_model=Project)
async def update_project(
    project_id: UUID,
    project: ProjectUpdate,
    user_id: UUID = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Update an existing project.

    **Authentication:** Required (Bearer token in Authorization header)
    **Authorization:** User must own the project

    Example:
        PATCH /projects/123e4567-e89b-12d3-a456-426614174000
        Authorization: Bearer <jwt_token>
        {
            "current_phase": "FOUNDATION",
            "location": "Warsaw, Poland - Updated"
        }
    """
    # Only include fields that were explicitly set
    update_data = project.model_dump(exclude_unset=True, mode="json")

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = (
        supabase.table("projects")
        .update(update_data)
        .eq("id", str(project_id))
        .eq("user_id", str(user_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Project not found")

    return response.data[0]


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Delete a project.

    **Authentication:** Required (Bearer token in Authorization header)
    **Authorization:** User must own the project

    Example:
        DELETE /projects/123e4567-e89b-12d3-a456-426614174000
        Authorization: Bearer <jwt_token>
    """
    response = (
        supabase.table("projects")
        .delete()
        .eq("id", str(project_id))
        .eq("user_id", str(user_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Project not found")

    return None
