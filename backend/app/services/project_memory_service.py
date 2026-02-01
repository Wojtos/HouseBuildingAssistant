"""
Project Memory Service

Handles project memory (JSONB) operations for storing and retrieving
structured project facts used in RAG context.

Project memory stores domain-specific facts organized by agent areas:
- LAND_FEASIBILITY: Land selection, site analysis, soil reports
- REGULATORY_PERMITTING: Permits, zoning, regulations
- ARCHITECTURAL_DESIGN: Design, layouts, materials
- FINANCE_LEGAL: Budget, loans, contracts, insurance
- SITE_PREP_FOUNDATION: Excavation, grading, foundation
- SHELL_SYSTEMS: Framing, roofing, HVAC, plumbing, electrical
- PROCUREMENT_QUALITY: Materials, scheduling, quality control
- FINISHES_FURNISHING: Interior finishes, fixtures
- GENERAL: General project information
"""

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from supabase import Client

from app.core.memory_domains import get_default_memory_structure

logger = logging.getLogger(__name__)


class ProjectMemoryService:
    """
    Service for managing structured project memory (JSONB storage).

    Project memory stores extracted facts from conversations and documents,
    organized by domain for efficient retrieval by specialized agents.
    """

    def __init__(self, supabase: Client):
        """
        Initialize project memory service.

        Args:
            supabase: Supabase client for database access
        """
        self.supabase = supabase

    async def get_memory(self, project_id: UUID) -> Dict[str, Any]:
        """
        Retrieve complete project memory for a project.

        Args:
            project_id: Project identifier

        Returns:
            Dictionary containing project memory data (JSONB)
            Returns empty dict if no memory exists
        """
        logger.debug(f"Retrieving project memory for {project_id}")

        try:
            response = (
                self.supabase.table("project_memory")
                .select("data")
                .eq("project_id", str(project_id))
                .execute()
            )

            if not response.data:
                logger.info(f"No project memory found for {project_id}, initializing empty")
                # Initialize empty memory for new projects
                await self._initialize_memory(project_id)
                return self._get_default_memory()

            memory_data = response.data[0].get("data", {})
            logger.info(
                f"Retrieved project memory for {project_id} " f"({len(memory_data)} top-level keys)"
            )

            return memory_data

        except Exception as e:
            logger.error(f"Error retrieving project memory: {e}", exc_info=True)
            return self._get_default_memory()

    async def update_memory(
        self,
        project_id: UUID,
        updates: Dict[str, Any],
        merge: bool = True,
    ) -> Dict[str, Any]:
        """
        Update project memory with new data.

        Args:
            project_id: Project identifier
            updates: Dictionary of updates to apply
            merge: If True, merge with existing data; if False, replace completely

        Returns:
            Updated memory data
        """
        logger.info(f"Updating project memory for {project_id}")

        try:
            if merge:
                # Get current memory
                current_memory = await self.get_memory(project_id)

                # Merge updates (deep merge for nested dicts)
                updated_memory = self._deep_merge(current_memory, updates)
            else:
                updated_memory = updates

            # Update in database
            response = (
                self.supabase.table("project_memory")
                .update({"data": updated_memory})
                .eq("project_id", str(project_id))
                .execute()
            )

            if not response.data:
                logger.warning(f"No project memory to update for {project_id}, creating new")
                await self._initialize_memory(project_id, updated_memory)

            logger.info(f"Updated project memory for {project_id}")
            return updated_memory

        except Exception as e:
            logger.error(f"Error updating project memory: {e}", exc_info=True)
            raise

    async def get_domain_memory(
        self,
        project_id: UUID,
        domain: str,
    ) -> Dict[str, Any]:
        """
        Get memory for a specific domain (e.g., FINANCE, PERMITTING).

        Args:
            project_id: Project identifier
            domain: Domain key (LAND, PERMITTING, DESIGN, etc.)

        Returns:
            Dictionary containing domain-specific memory
        """
        logger.debug(f"Retrieving {domain} memory for {project_id}")

        memory = await self.get_memory(project_id)
        domain_data = memory.get(domain, {})

        logger.info(f"Retrieved {domain} memory for {project_id} " f"({len(domain_data)} keys)")

        return domain_data

    async def update_domain_memory(
        self,
        project_id: UUID,
        domain: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Update memory for a specific domain.

        Args:
            project_id: Project identifier
            domain: Domain key
            data: Data to set for this domain

        Returns:
            Complete updated memory
        """
        logger.info(f"Updating {domain} memory for {project_id}")

        updates = {domain: data}
        return await self.update_memory(project_id, updates, merge=True)

    async def _initialize_memory(
        self,
        project_id: UUID,
        initial_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize project memory record with default structure.

        Args:
            project_id: Project identifier
            initial_data: Optional initial data (defaults to empty structure)
        """
        logger.info(f"Initializing project memory for {project_id}")

        data = initial_data if initial_data is not None else self._get_default_memory()

        try:
            response = (
                self.supabase.table("project_memory")
                .insert(
                    {
                        "project_id": str(project_id),
                        "data": data,
                    }
                )
                .execute()
            )

            if response.data:
                logger.info(f"Initialized project memory for {project_id}")
            else:
                logger.warning(f"Failed to initialize project memory for {project_id}")

        except Exception as e:
            # Memory might already exist (race condition), that's ok
            logger.debug(f"Could not initialize memory (may already exist): {e}")

    def _get_default_memory(self) -> Dict[str, Any]:
        """
        Get default memory structure with empty domains.

        Uses canonical domain names from memory_domains module.

        Returns:
            Dictionary with domain keys initialized to empty dicts
        """
        return get_default_memory_structure()

    def _deep_merge(self, base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deep merge two dictionaries.

        Updates are merged into base, with updates taking precedence.
        Nested dictionaries are merged recursively.

        Args:
            base: Base dictionary
            updates: Updates to merge in

        Returns:
            Merged dictionary
        """
        result = base.copy()

        for key, value in updates.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Recursively merge nested dicts
                result[key] = self._deep_merge(result[key], value)
            else:
                # Overwrite or add new key
                result[key] = value

        return result


def get_project_memory_service(supabase: Client) -> ProjectMemoryService:
    """
    Factory function for creating ProjectMemoryService instances.

    Used as a FastAPI dependency.
    """
    return ProjectMemoryService(supabase)
