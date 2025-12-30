"""
Projects API Router
Example implementation showing how to use Supabase with FastAPI
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db import (
    Project,
    ProjectInsert,
    ProjectUpdate,
    get_supabase,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=List[Project])
async def list_projects(
    supabase: Client = Depends(get_supabase),
    user_id: UUID | None = None
):
    """
    Get all projects, optionally filtered by user_id.
    
    Example:
        GET /projects
        GET /projects?user_id=123e4567-e89b-12d3-a456-426614174000
    """
    query = supabase.table("projects").select("*")
    
    if user_id:
        query = query.eq("user_id", str(user_id))
    
    response = query.execute()
    return response.data


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: UUID,
    supabase: Client = Depends(get_supabase)
):
    """
    Get a single project by ID.
    
    Example:
        GET /projects/123e4567-e89b-12d3-a456-426614174000
    """
    response = (
        supabase.table("projects")
        .select("*")
        .eq("id", str(project_id))
        .execute()
    )
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return response.data[0]


@router.post("/", response_model=Project, status_code=201)
async def create_project(
    project: ProjectInsert,
    supabase: Client = Depends(get_supabase)
):
    """
    Create a new project.
    
    Example:
        POST /projects
        {
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "name": "My Dream House",
            "location": "Warsaw, Poland",
            "current_phase": "LAND_SELECTION"
        }
    """
    response = (
        supabase.table("projects")
        .insert(project.model_dump(mode="json"))
        .execute()
    )
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create project")
    
    return response.data[0]


@router.patch("/{project_id}", response_model=Project)
async def update_project(
    project_id: UUID,
    project: ProjectUpdate,
    supabase: Client = Depends(get_supabase)
):
    """
    Update an existing project.
    
    Example:
        PATCH /projects/123e4567-e89b-12d3-a456-426614174000
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
        .execute()
    )
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return response.data[0]


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    supabase: Client = Depends(get_supabase)
):
    """
    Delete a project.
    
    Example:
        DELETE /projects/123e4567-e89b-12d3-a456-426614174000
    """
    response = (
        supabase.table("projects")
        .delete()
        .eq("id", str(project_id))
        .execute()
    )
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return None

