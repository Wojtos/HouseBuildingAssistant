"""
Database Models
Pydantic models matching the Supabase database schema.
Equivalent to database.types.ts in TypeScript projects.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.enums import ConstructionPhase, MeasurementUnit, ProcessingState

# =============================================================================
# CORE MODELS
# =============================================================================


class ProfileBase(BaseModel):
    """Base model for user profiles"""

    full_name: Optional[str] = None
    preferred_units: MeasurementUnit = MeasurementUnit.METRIC
    language: str = Field(default="en", max_length=2)


class Profile(ProfileBase):
    """User profile extending Supabase Auth with application-specific preferences"""

    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfileInsert(ProfileBase):
    """Model for inserting new profiles"""

    id: UUID


class ProjectBase(BaseModel):
    """Base model for construction projects"""

    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    current_phase: ConstructionPhase = ConstructionPhase.LAND_SELECTION


class Project(ProjectBase):
    """Construction project managed by a user"""

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectInsert(ProjectBase):
    """Model for inserting new projects"""

    user_id: UUID


class ProjectUpdate(BaseModel):
    """Model for updating projects"""

    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    current_phase: Optional[ConstructionPhase] = None


class ProjectMemoryBase(BaseModel):
    """Base model for project memory"""

    data: dict = Field(default_factory=dict)


class ProjectMemory(ProjectMemoryBase):
    """Unified structured memory store for project facts and context"""

    id: UUID
    project_id: UUID
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectMemoryInsert(ProjectMemoryBase):
    """Model for inserting project memory"""

    project_id: UUID


class ProjectMemoryUpdate(BaseModel):
    """Model for updating project memory"""

    data: dict


class DocumentBase(BaseModel):
    """Base model for documents"""

    name: str
    storage_path: str
    file_type: Optional[str] = None
    processing_state: ProcessingState = ProcessingState.UPLOADED
    error_message: Optional[str] = None


class Document(DocumentBase):
    """Metadata for documents uploaded to Supabase Storage"""

    id: UUID
    project_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentInsert(DocumentBase):
    """Model for inserting new documents"""

    project_id: UUID


class DocumentUpdate(BaseModel):
    """Model for updating documents"""

    name: Optional[str] = None
    processing_state: Optional[ProcessingState] = None
    error_message: Optional[str] = None


class DocumentChunkBase(BaseModel):
    """Base model for document chunks"""

    content: str
    embedding: Optional[list[float]] = None
    embedding_model: Optional[str] = None
    chunk_index: int
    metadata: dict = Field(default_factory=dict)


class DocumentChunk(DocumentChunkBase):
    """Text chunks extracted from documents with vector embeddings for semantic search"""

    id: UUID
    document_id: UUID
    project_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentChunkInsert(DocumentChunkBase):
    """Model for inserting document chunks"""

    document_id: UUID
    project_id: UUID


class MessageBase(BaseModel):
    """Base model for messages"""

    role: str = Field(pattern="^(user|assistant)$")
    content: str
    agent_id: Optional[str] = None
    routing_metadata: dict = Field(default_factory=dict)
    csat_rating: Optional[int] = Field(default=None, ge=1, le=5)


class Message(MessageBase):
    """Chat history between users and AI agents"""

    id: UUID
    project_id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class MessageInsert(MessageBase):
    """Model for inserting new messages"""

    project_id: UUID
    user_id: UUID


class MessageUpdate(BaseModel):
    """Model for updating messages"""

    csat_rating: Optional[int] = Field(default=None, ge=1, le=5)


# =============================================================================
# AUDIT AND UTILITY MODELS
# =============================================================================


class MemoryAuditTrailBase(BaseModel):
    """Base model for memory audit trail"""

    agent_id: Optional[str] = None
    change_summary: Optional[str] = None
    previous_data: Optional[dict] = None
    new_data: Optional[dict] = None


class MemoryAuditTrail(MemoryAuditTrailBase):
    """Audit log for all changes to project_memory table"""

    id: UUID
    project_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class MemoryAuditTrailInsert(MemoryAuditTrailBase):
    """Model for inserting memory audit trail entries"""

    project_id: UUID


class RoutingAuditBase(BaseModel):
    """Base model for routing audits"""

    orchestrator_decision: Optional[str] = None
    confidence_score: Optional[float] = None
    reasoning: Optional[str] = None


class RoutingAudit(RoutingAuditBase):
    """Audit log for AI orchestrator routing decisions"""

    id: UUID
    message_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RoutingAuditInsert(RoutingAuditBase):
    """Model for inserting routing audit entries"""

    message_id: UUID


class WebSearchCacheBase(BaseModel):
    """Base model for web search cache"""

    query: str
    results: dict
    expires_at: datetime


class WebSearchCache(WebSearchCacheBase):
    """Cache for external web search results to reduce API costs"""

    query_hash: str
    created_at: datetime

    class Config:
        from_attributes = True


class WebSearchCacheInsert(WebSearchCacheBase):
    """Model for inserting web search cache entries"""

    query_hash: str


class UsageLogBase(BaseModel):
    """Base model for usage logs"""

    token_count: Optional[int] = None
    estimated_cost: Optional[float] = None
    api_name: Optional[str] = None


class UsageLog(UsageLogBase):
    """Tracks API usage and costs per user and project"""

    id: UUID
    user_id: UUID
    project_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UsageLogInsert(UsageLogBase):
    """Model for inserting usage log entries"""

    user_id: UUID
    project_id: Optional[UUID] = None
