"""
Project Context Service

Fetches and formats project information for prompt injection (UC-0).
Ensures every agent prompt includes core project metadata for context awareness.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


@dataclass
class ProjectContext:
    """Project context data for prompt injection."""

    project_id: UUID
    project_name: str
    description: Optional[str]
    location: Optional[str]
    current_phase: str
    status: str  # ACTIVE, PAUSED, COMPLETED, DELETED
    created_at: datetime
    updated_at: datetime


class ProjectContextService:
    """
    Fetches and formats project info for prompt injection.

    This service provides project context to all agent interactions,
    ensuring AI responses are grounded in the specific project's details.
    """

    def __init__(self, supabase: Client):
        """
        Initialize project context service.

        Args:
            supabase: Supabase client for database access
        """
        self.supabase = supabase

    async def get_project_context(self, project_id: UUID) -> ProjectContext:
        """
        Fetch project details from database.

        Args:
            project_id: Project identifier

        Returns:
            ProjectContext with project details

        Raises:
            ValueError: If project not found
        """
        logger.debug(f"Fetching project context for {project_id}")

        try:
            response = (
                self.supabase.table("projects")
                .select("*")
                .eq("id", str(project_id))
                .single()
                .execute()
            )

            if not response.data:
                raise ValueError(f"Project {project_id} not found")

            data = response.data

            # Determine status based on deleted_at
            if data.get("deleted_at"):
                status = "DELETED"
            else:
                status = "ACTIVE"

            # Parse timestamps
            created_at = self._parse_timestamp(data["created_at"])
            updated_at = self._parse_timestamp(data["updated_at"])

            context = ProjectContext(
                project_id=UUID(data["id"]) if isinstance(data["id"], str) else data["id"],
                project_name=data["name"],
                description=data.get("description"),
                location=data.get("location"),
                current_phase=data["current_phase"],
                status=status,
                created_at=created_at,
                updated_at=updated_at,
            )

            logger.info(f"Retrieved project context for '{context.project_name}' ({project_id})")
            return context

        except Exception as e:
            if "not found" in str(e).lower():
                raise ValueError(f"Project {project_id} not found")
            logger.error(f"Error fetching project context: {e}", exc_info=True)
            raise

    def format_context_block(self, ctx: ProjectContext) -> str:
        """
        Format project info as specified in UC-0 for prompt injection.

        Args:
            ctx: ProjectContext object with project details

        Returns:
            Formatted string block for inclusion in prompts
        """
        # Format timestamps nicely
        created = self._format_date(ctx.created_at)
        updated = self._format_date(ctx.updated_at)

        # Format phase for readability
        phase_display = ctx.current_phase.replace("_", " ").title()

        return f"""=== PROJECT CONTEXT ===
Project ID: {ctx.project_id}
Project Name: {ctx.project_name}
Description: {ctx.description or 'Not specified'}
Location: {ctx.location or 'Not specified'}
Current Phase: {phase_display}
Status: {ctx.status}
Created: {created}
Last Updated: {updated}
======================="""

    def _parse_timestamp(self, value: any) -> datetime:
        """Parse timestamp from various formats."""
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            # Handle ISO format with or without timezone
            try:
                # Try with timezone
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                # Try without timezone
                return datetime.fromisoformat(value)
        return datetime.now()

    def _format_date(self, dt: datetime) -> str:
        """Format datetime for display."""
        if isinstance(dt, datetime):
            return dt.strftime("%B %d, %Y")
        return str(dt)


def get_project_context_service(supabase: Client) -> ProjectContextService:
    """
    Factory function for creating ProjectContextService instances.

    Used as a FastAPI dependency.

    Args:
        supabase: Supabase client

    Returns:
        ProjectContextService instance
    """
    return ProjectContextService(supabase)
