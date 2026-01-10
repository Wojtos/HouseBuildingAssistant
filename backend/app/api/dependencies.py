"""
FastAPI Dependencies

Reusable dependencies for authentication, authorization, and resource verification.
"""

import logging
import os
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Header
from supabase import Client

from app.db import get_supabase, Project
from app.clients.openrouter_service import OpenRouterService, get_openrouter_service as _get_openrouter_service
from app.core.config import settings

logger = logging.getLogger(__name__)

# Mock user ID for development (when MOCK_AUTH=true)
MOCK_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


async def get_current_user(
    authorization: str = Header(None, description="Bearer token for authentication"),
    supabase: Client = Depends(get_supabase)
) -> UUID:
    """
    Extract and validate user ID from JWT token using Supabase Auth.
    
    For development/testing, set MOCK_AUTH=true environment variable to bypass
    authentication and use a mock user ID.
    
    This verifies the JWT token with Supabase and extracts the user_id from
    the token claims.
    
    Args:
        authorization: Authorization header with Bearer token
        supabase: Supabase client for auth verification
        
    Returns:
        User ID extracted from token
        
    Raises:
        HTTPException: 401 if token is missing, invalid, or expired
    """
    # DEVELOPMENT MODE: Mock authentication
    if os.getenv("MOCK_AUTH", "").lower() == "true":
        logger.warning(f"⚠️  MOCK AUTH ENABLED - Using mock user: {MOCK_USER_ID}")
        return MOCK_USER_ID
    
    # PRODUCTION MODE: Real authentication
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    # Extract token from "Bearer <token>" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format"
        )
    
    token = parts[1]
    
    try:
        # Verify JWT token with Supabase and get user
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )
        
        user_id = UUID(user_response.user.id)
        logger.debug(f"Authenticated user: {user_id}")
        return user_id
        
    except ValueError:
        # UUID conversion failed
        raise HTTPException(
            status_code=401,
            detail="Invalid user ID in token"
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}", exc_info=True)
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


async def verify_project_ownership(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> Project:
    """
    Verify that the authenticated user owns the specified project.
    
    This dependency performs authorization checks to ensure users can only
    access their own projects.
    
    Args:
        project_id: Project identifier from path parameter
        user_id: Authenticated user ID from token
        supabase: Supabase client for database queries
        
    Returns:
        Project instance if ownership is verified
        
    Raises:
        HTTPException: 404 if project doesn't exist, 403 if user doesn't own it
    """
    try:
        # Query project by ID
        response = (
            supabase.table("projects")
            .select("*")
            .eq("id", str(project_id))
            .execute()
        )
        
        if not response.data:
            logger.warning(f"Project {project_id} not found")
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        project_data = response.data[0]
        project = Project(**project_data)
        
        # Verify ownership
        if project.user_id != user_id:
            logger.warning(
                f"User {user_id} attempted to access project {project_id} "
                f"owned by {project.user_id}"
            )
            raise HTTPException(
                status_code=403,
                detail="Access denied to this project"
            )
        
        logger.debug(f"Verified ownership of project {project_id} by user {user_id}")
        return project
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(
            f"Error verifying project ownership for {project_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


# Singleton instance for OpenRouterService (reused across requests)
_openrouter_service_instance: Optional[OpenRouterService] = None


def get_openrouter_service() -> OpenRouterService:
    """
    Get OpenRouterService instance as a FastAPI dependency.
    
    Uses singleton pattern to reuse HTTP client across requests.
    
    Returns:
        OpenRouterService instance
    """
    global _openrouter_service_instance
    
    if _openrouter_service_instance is None:
        _openrouter_service_instance = _get_openrouter_service(settings=settings)
        logger.info(
            f"OpenRouterService initialized "
            f"(mock_mode={_openrouter_service_instance.mock_mode})"
        )
    
    return _openrouter_service_instance

