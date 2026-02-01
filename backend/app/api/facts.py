"""
Facts API Router (UC-3)

Endpoints for fact extraction and confirmation:
- POST /api/projects/{project_id}/facts/confirm - Confirm and store extracted facts
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from supabase import Client

from app.api.dependencies import get_current_user, get_openrouter_service, verify_project_ownership
from app.clients.openrouter_service import OpenRouterService
from app.db import Project, get_supabase
from app.schemas.fact_extraction import (
    FactConfirmationRequest,
    FactConfirmationResponse,
)
from app.services.fact_extraction_service import FactExtractionService, get_fact_extraction_service
from app.services.project_memory_service import get_project_memory_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/facts", tags=["facts"])


@router.post("/confirm-debug")
async def confirm_facts_debug(
    project_id: UUID,
    request: Request,
):
    """Debug endpoint to see raw request body."""
    body = await request.json()
    logger.error(f"DEBUG: Raw request body for facts/confirm: {body}")
    return {"received": body}


@router.post(
    "/confirm",
    response_model=FactConfirmationResponse,
    summary="Confirm and store extracted facts",
    description="Confirm and store user-approved facts in project memory",
    responses={
        200: {
            "description": "Facts stored successfully",
            "model": FactConfirmationResponse,
        },
        400: {"description": "Invalid request"},
        401: {"description": "Authentication required"},
        403: {"description": "User does not own this project"},
        404: {"description": "Project not found"},
    },
)
async def confirm_facts(
    project_id: UUID,
    raw_request: Request,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    openrouter_service: OpenRouterService = Depends(get_openrouter_service),
    supabase: Client = Depends(get_supabase),
):
    """
    Confirm and store user-approved facts in project memory.

    **Authentication:** Required (Bearer token in Authorization header)

    **Authorization:** User must own the project

    **Request Body:**
    - `confirmed_fact_ids`: List of fact IDs the user confirmed
    - `rejected_fact_ids`: List of fact IDs the user rejected
    - `facts`: Full list of extracted facts with all details

    **Processing:**
    1. Filter facts to only confirmed ones
    2. Group facts by memory domain
    3. Store in project memory
    4. Return summary of stored facts

    **Example:**
    ```
    POST /api/projects/{project_id}/facts/confirm
    {
      "confirmed_fact_ids": ["fact-1", "fact-3"],
      "rejected_fact_ids": ["fact-2"],
      "facts": [
        {"id": "fact-1", "domain": "FINANCE_LEGAL", "key": "total_budget", "value": "$450,000", ...},
        {"id": "fact-2", "domain": "GENERAL", "key": "start_date", "value": "March 2025", ...},
        {"id": "fact-3", "domain": "LAND_FEASIBILITY", "key": "lot_size", "value": "0.5 acres", ...}
      ]
    }
    ```
    """
    try:
        # Parse and validate request body with detailed logging
        body = await raw_request.json()
        logger.info(f"Received fact confirmation request: {body}")

        try:
            request = FactConfirmationRequest(**body)
        except Exception as validation_error:
            logger.error(f"Validation error for facts/confirm: {validation_error}")
            logger.error(f"Request body was: {body}")
            raise HTTPException(status_code=422, detail=str(validation_error))

        # Initialize services
        memory_service = get_project_memory_service(supabase)
        fact_service = get_fact_extraction_service(openrouter_service, memory_service)

        # Filter to only confirmed facts
        confirmed_fact_ids_set = set(request.confirmed_fact_ids)
        confirmed_facts = [f for f in request.facts if f.id in confirmed_fact_ids_set]

        if not confirmed_facts:
            return FactConfirmationResponse(
                stored_count=0,
                rejected_count=len(request.rejected_fact_ids),
                updated_domains=[],
            )

        # Store confirmed facts
        result = await fact_service.store_confirmed_facts(
            project_id=project_id,
            facts=confirmed_facts,
        )

        logger.info(
            f"User {user_id} confirmed {result['stored_count']} facts for project {project_id}"
        )

        return FactConfirmationResponse(
            stored_count=result["stored_count"],
            rejected_count=len(request.rejected_fact_ids),
            updated_domains=result["updated_domains"],
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error confirming facts for project {project_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to store facts")
