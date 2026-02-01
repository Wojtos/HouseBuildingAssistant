"""
Database Module
Exports database models, enums, and FastAPI dependencies for Supabase integration.
"""

from typing import Generator

from supabase import Client

from app.db.enums import ConstructionPhase, MeasurementUnit, ProcessingState
from app.db.models import (
    Document,
    DocumentChunk,
    DocumentChunkInsert,
    DocumentInsert,
    DocumentUpdate,
    MemoryAuditTrail,
    MemoryAuditTrailInsert,
    Message,
    MessageInsert,
    MessageUpdate,
    Profile,
    ProfileInsert,
    Project,
    ProjectInsert,
    ProjectMemory,
    ProjectMemoryInsert,
    ProjectMemoryUpdate,
    ProjectUpdate,
    RoutingAudit,
    RoutingAuditInsert,
    UsageLog,
    UsageLogInsert,
    WebSearchCache,
    WebSearchCacheInsert,
)
from app.db.supabase import supabase_client

__all__ = [
    # Enums
    "ConstructionPhase",
    "MeasurementUnit",
    "ProcessingState",
    # Profile models
    "Profile",
    "ProfileInsert",
    # Project models
    "Project",
    "ProjectInsert",
    "ProjectUpdate",
    "ProjectMemory",
    "ProjectMemoryInsert",
    "ProjectMemoryUpdate",
    # Document models
    "Document",
    "DocumentInsert",
    "DocumentUpdate",
    "DocumentChunk",
    "DocumentChunkInsert",
    # Message models
    "Message",
    "MessageInsert",
    "MessageUpdate",
    # Audit and utility models
    "MemoryAuditTrail",
    "MemoryAuditTrailInsert",
    "RoutingAudit",
    "RoutingAuditInsert",
    "WebSearchCache",
    "WebSearchCacheInsert",
    "UsageLog",
    "UsageLogInsert",
    # Supabase client
    "supabase_client",
    # FastAPI dependency
    "get_supabase",
]


def get_supabase() -> Generator[Client, None, None]:
    """
    FastAPI dependency for injecting Supabase client into route handlers.

    Usage:
        @app.get("/projects")
        async def get_projects(supabase: Client = Depends(get_supabase)):
            response = supabase.table("projects").select("*").execute()
            return response.data

    This is the Python/FastAPI equivalent of Astro's middleware context.locals.supabase
    """
    yield supabase_client
