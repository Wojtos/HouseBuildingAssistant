"""
FastAPI Dependencies

Reusable dependencies for authentication, authorization, and resource verification.
"""

import logging
from uuid import UUID

from fastapi import Depends, HTTPException, Header
from supabase import Client

from app.db import get_supabase, Project

logger = logging.getLogger(__name__)


async def get_current_user(
    authorization: str = Header(None, description="Bearer token for authentication")
) -> UUID:
    """
    Extract and validate user ID from JWT token.
    
    This is a simplified implementation. In production, this should:
    1. Verify JWT signature using Supabase Auth
    2. Check token expiration
    3. Extract user_id from token claims
    
    Args:
        authorization: Authorization header with Bearer token
        
    Returns:
        User ID extracted from token
        
    Raises:
        HTTPException: 401 if token is missing, invalid, or expired
    """
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
    
    # TODO: Implement proper JWT validation using Supabase Auth
    # For now, we'll use a placeholder that extracts user_id from token
    # This should be replaced with actual Supabase JWT verification:
    #
    # try:
    #     user = await supabase.auth.get_user(token)
    #     return UUID(user.id)
    # except Exception:
    #     raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    try:
        # Placeholder: In development, accept any valid UUID as token
        # WARNING: This is NOT secure and must be replaced with proper auth
        user_id = UUID(token)
        logger.debug(f"Authenticated user: {user_id}")
        return user_id
    except ValueError:
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

