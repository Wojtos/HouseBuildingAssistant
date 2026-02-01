"""
Profile API Endpoints

Implements endpoints for user profile management (Section 2.1 of API plan):
- GET /api/profiles/me - Retrieve current user's profile
- PUT /api/profiles/me - Update current user's profile
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest
from app.services.profile_service import ProfileService, get_profile_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get(
    "/me",
    response_model=ProfileResponse,
    summary="Get current user profile",
    description="Retrieve profile information for the authenticated user",
)
async def get_my_profile(
    user_id: UUID = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service),
):
    """
    Get current user's profile.

    Returns profile information including:
    - Display name
    - Preferred measurement units (METRIC/IMPERIAL)
    - Preferred language
    - Account timestamps

    Requires authentication via Bearer token.

    Raises:
        401: If authentication token is missing or invalid
        404: If profile record not found for the user
        500: If database error occurs
    """
    try:
        profile = await profile_service.get_profile(user_id)

        return ProfileResponse(
            id=profile.id,
            full_name=profile.full_name,
            preferred_units=profile.preferred_units,
            language=profile.language,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )

    except Exception as e:
        if "not found" in str(e).lower():
            logger.error(f"Profile not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Profile not found")

        logger.error(f"Error retrieving profile for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put(
    "/me",
    response_model=ProfileResponse,
    summary="Update current user profile",
    description="Update profile preferences for the authenticated user",
)
async def update_my_profile(
    updates: ProfileUpdateRequest,
    user_id: UUID = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service),
):
    """
    Update current user's profile.

    Supports partial updates - only provided fields are updated.

    Updatable fields:
    - full_name: Display name (max 255 chars)
    - preferred_units: METRIC or IMPERIAL
    - language: 2-character ISO 639-1 code (e.g., 'en', 'pl')

    Requires authentication via Bearer token.

    Raises:
        401: If authentication token is missing or invalid
        404: If profile record not found for the user
        422: If validation fails (invalid units, language format, etc.)
        500: If database error occurs
    """
    try:
        updated_profile = await profile_service.update_profile(user_id, updates)

        return ProfileResponse(
            id=updated_profile.id,
            full_name=updated_profile.full_name,
            preferred_units=updated_profile.preferred_units,
            language=updated_profile.language,
            created_at=updated_profile.created_at,
            updated_at=updated_profile.updated_at,
        )

    except Exception as e:
        if "not found" in str(e).lower():
            logger.error(f"Profile not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Profile not found")

        logger.error(f"Error updating profile for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
