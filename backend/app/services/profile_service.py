"""
Profile Service Layer

Handles business logic for user profile operations including:
- Retrieving user profile information
- Updating user preferences (units, language, display name)
"""

import logging
from uuid import UUID

from fastapi import Depends
from supabase import Client

from app.db import Profile, ProfileInsert, get_supabase
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest

logger = logging.getLogger(__name__)


class ProfileService:
    """Service for managing user profiles."""

    def __init__(self, supabase: Client):
        """
        Initialize profile service.

        Args:
            supabase: Supabase client instance for database operations
        """
        self.supabase = supabase

    async def get_profile(self, user_id: UUID) -> Profile:
        """
        Retrieve user profile by user ID.

        Args:
            user_id: User identifier (from Supabase Auth)

        Returns:
            Profile instance

        Raises:
            Exception: If profile not found or database query fails
        """
        try:
            response = self.supabase.table("profiles").select("*").eq("id", str(user_id)).execute()

            if not response.data:
                logger.error(f"Profile not found for user {user_id}")
                raise Exception(f"Profile not found for user {user_id}")

            profile_data = response.data[0]

            logger.info(f"Retrieved profile for user {user_id}")

            return Profile(**profile_data)

        except Exception as e:
            logger.error(f"Error retrieving profile for user {user_id}: {e}", exc_info=True)
            raise

    async def update_profile(
        self,
        user_id: UUID,
        updates: ProfileUpdateRequest,
    ) -> Profile:
        """
        Update user profile with partial updates.

        Only fields provided in the request are updated.

        Args:
            user_id: User identifier
            updates: Profile update request with optional fields

        Returns:
            Updated Profile instance

        Raises:
            Exception: If update fails or profile not found
        """
        try:
            # Build update dict with only provided fields
            update_data = updates.model_dump(exclude_unset=True, mode="json")

            if not update_data:
                # No fields to update, return current profile
                logger.info(f"No fields to update for user {user_id}")
                return await self.get_profile(user_id)

            response = (
                self.supabase.table("profiles").update(update_data).eq("id", str(user_id)).execute()
            )

            if not response.data:
                raise Exception(f"Failed to update profile for user {user_id}")

            updated_profile = response.data[0]

            logger.info(
                f"Updated profile for user {user_id} " f"(fields: {list(update_data.keys())})"
            )

            return Profile(**updated_profile)

        except Exception as e:
            logger.error(f"Error updating profile for user {user_id}: {e}", exc_info=True)
            raise


def get_profile_service(supabase: Client = Depends(get_supabase)) -> ProfileService:
    """
    Factory function for creating ProfileService instances.

    Used as a FastAPI dependency.

    Args:
        supabase: Supabase client from dependency injection

    Returns:
        ProfileService instance
    """
    return ProfileService(supabase)
