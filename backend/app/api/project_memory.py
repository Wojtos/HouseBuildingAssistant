"""
Project Memory API Endpoints

Implements endpoints for project memory management (Section 2.3 of API plan):
- GET /api/projects/{project_id}/memory - Retrieve project memory
- PATCH /api/projects/{project_id}/memory - Update project memory
- GET /api/projects/{project_id}/memory/audit - Get audit trail (TODO)
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_current_user, verify_project_ownership
from app.db import get_supabase, Project
from app.schemas.memory import (
    ProjectMemoryResponse,
    ProjectMemoryUpdateRequest,
    MemoryAuditListParams,
    MemoryAuditListResponse,
)
from app.schemas.common import PaginationInfo
from app.services.project_memory_service import (
    ProjectMemoryService,
    get_project_memory_service,
)
from supabase import Client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/projects/{project_id}/memory",
    tags=["project-memory"]
)


@router.get(
    "",
    response_model=ProjectMemoryResponse,
    summary="Get project memory",
    description="Retrieve structured project memory (JSONB data)",
)
async def get_project_memory(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    supabase: Client = Depends(get_supabase),
):
    """
    Get project memory.

    Returns structured JSONB data organized by domain:
    - LAND: Land selection, site information
    - PERMITTING: Permits, regulations, zoning
    - DESIGN: Architectural decisions, materials
    - FINANCE: Budget, costs, loans
    - SITE_PREP: Site preparation, excavation
    - SHELL_SYSTEMS: Framing, roofing, MEP
    - PROCUREMENT: Materials, contractors
    - FINISHES: Interior finishes, furnishing
    - GENERAL: Other project facts

    This data is loaded in full at the start of every AI turn for context.

    Requires authentication and project ownership.

    Raises:
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project not found
        500: If database error occurs
    """
    try:
        memory_service = get_project_memory_service(supabase)
        memory_data = await memory_service.get_memory(project_id)

        # Get the full memory record for metadata
        response = (
            supabase.table("project_memory")
            .select("*")
            .eq("project_id", str(project_id))
            .execute()
        )

        if not response.data:
            # Return empty memory structure
            logger.info(f"No memory found for project {project_id}, returning default")
            from datetime import datetime
            return ProjectMemoryResponse(
                id=project_id,  # Temporary ID
                project_id=project_id,
                data=memory_data,
                updated_at=datetime.utcnow(),
            )

        memory_record = response.data[0]

        return ProjectMemoryResponse(
            id=memory_record["id"],
            project_id=memory_record["project_id"],
            data=memory_data,
            updated_at=memory_record["updated_at"],
        )

    except Exception as e:
        logger.error(
            f"Error retrieving memory for project {project_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.patch(
    "",
    response_model=ProjectMemoryResponse,
    summary="Update project memory",
    description="Update project memory with deep merge of new data",
)
async def update_project_memory(
    project_id: UUID,
    request: ProjectMemoryUpdateRequest,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    supabase: Client = Depends(get_supabase),
):
    """
    Update project memory.

    Performs deep merge of provided data with existing memory:
    - New keys are added
    - Existing keys are updated
    - Keys not provided are preserved
    - Nested objects are merged recursively

    TODO: JSON Schema validation for critical fields (budget, dates, enums)
    TODO: Create audit trail entry with agent_id and change_summary

    Example update:
    ```json
    {
        "data": {
            "FINANCE": {
                "total_budget": 500000,
                "currency": "USD"
            }
        },
        "agent_id": "FINANCE_LEGAL_AGENT",
        "change_summary": "Updated budget based on mortgage approval"
    }
    ```

    Requires authentication and project ownership.

    Raises:
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project not found
        422: If JSON Schema validation fails (TODO)
        500: If database error occurs
    """
    try:
        memory_service = get_project_memory_service(supabase)

        # TODO: Validate critical fields against JSON Schema
        # - Budget must be numeric
        # - Dates must be valid ISO8601
        # - Enum fields must match allowed values

        # TODO: Create audit trail entry
        # if request.agent_id or request.change_summary:
        #     current_memory = await memory_service.get_memory(project_id)
        #     await create_audit_entry(
        #         project_id=project_id,
        #         agent_id=request.agent_id,
        #         change_summary=request.change_summary,
        #         previous_data=current_memory,
        #         new_data=request.data,
        #     )

        # Update memory
        updated_data = await memory_service.update_memory(
            project_id=project_id,
            updates=request.data,
            merge=True,
        )

        # Get updated record for metadata
        response = (
            supabase.table("project_memory")
            .select("*")
            .eq("project_id", str(project_id))
            .execute()
        )

        if not response.data:
            raise Exception("Failed to retrieve updated memory")

        memory_record = response.data[0]

        logger.info(
            f"Updated memory for project {project_id} "
            f"(agent: {request.agent_id or 'user'})"
        )

        return ProjectMemoryResponse(
            id=memory_record["id"],
            project_id=memory_record["project_id"],
            data=updated_data,
            updated_at=memory_record["updated_at"],
        )

    except Exception as e:
        logger.error(
            f"Error updating memory for project {project_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.get(
    "/audit",
    response_model=MemoryAuditListResponse,
    summary="Get memory audit trail",
    description="Retrieve paginated audit trail of memory changes (TODO)",
)
async def get_memory_audit_trail(
    project_id: UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    supabase: Client = Depends(get_supabase),
):
    """
    Get memory audit trail.

    TODO: Implement audit trail retrieval

    Returns paginated list of memory changes with:
    - Agent ID that made the change
    - Change summary description
    - Previous and new data states
    - Timestamp

    Requires authentication and project ownership.

    Raises:
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project not found
        501: Not implemented yet
    """
    # TODO: Implement audit trail retrieval
    # This requires extending project_memory_service with get_audit_trail method

    logger.warning(
        f"Audit trail endpoint called for project {project_id} but not implemented"
    )

    raise HTTPException(
        status_code=501,
        detail="Audit trail not implemented yet"
    )

    # Implementation would look like:
    # try:
    #     offset = (page - 1) * limit
    #
    #     response = (
    #         supabase.table("memory_audit_trail")
    #         .select("*", count="exact")
    #         .eq("project_id", str(project_id))
    #         .order("created_at", desc=True)
    #         .range(offset, offset + limit - 1)
    #         .execute()
    #     )
    #
    #     audit_entries = [
    #         MemoryAuditItem(**entry) for entry in response.data
    #     ]
    #
    #     total_count = response.count if response.count is not None else 0
    #     total_pages = (total_count + limit - 1) // limit
    #
    #     return MemoryAuditListResponse(
    #         data=audit_entries,
    #         pagination=PaginationInfo(
    #             page=page,
    #             limit=limit,
    #             total_items=total_count,
    #             total_pages=total_pages,
    #         ),
    #     )
    # except Exception as e:
    #     logger.error(f"Error getting audit trail: {e}", exc_info=True)
    #     raise HTTPException(status_code=500, detail="Internal server error")
