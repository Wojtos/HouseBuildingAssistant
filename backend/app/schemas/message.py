"""
Chat/Message API Schemas

DTOs and Command Models for chat and message endpoints (Section 2.5 of API plan).
Derived from: Message, MessageBase, MessageInsert, MessageUpdate,
              RoutingAudit, RoutingAuditBase models in app/db/models.py
"""

from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import PaginationInfo, PaginationParams


# =============================================================================
# ENUMS
# =============================================================================

class MessageRole(str, Enum):
    """Message role in chat history"""
    USER = "user"
    ASSISTANT = "assistant"


# =============================================================================
# QUERY PARAMETERS
# =============================================================================

class MessageListParams(PaginationParams):
    """
    Message list query parameters.
    
    GET /api/projects/{project_id}/messages query params
    Extends common pagination with time-based filters.
    """
    limit: int = Field(
        default=50, ge=1, le=100, description="Items per page (max 100)"
    )
    before: Optional[datetime] = Field(
        default=None,
        description="Get messages before this timestamp",
    )
    after: Optional[datetime] = Field(
        default=None,
        description="Get messages after this timestamp",
    )


# =============================================================================
# RESPONSE DTOs
# =============================================================================

class MessageItem(BaseModel):
    """
    Message item DTO.
    
    Individual message in chat history.
    Derived from: Message model (excludes user_id, routing_metadata for list view)
    """
    id: UUID = Field(description="Message unique identifier")
    project_id: UUID = Field(description="Associated project ID")
    role: MessageRole = Field(description="Message author role (user/assistant)")
    content: str = Field(description="Message text content")
    agent_id: Optional[str] = Field(
        default=None,
        description="AI agent that generated the response (null for user messages)",
    )
    csat_rating: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="User satisfaction rating (1-5, null if not rated)",
    )
    created_at: datetime = Field(description="Message timestamp")

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """
    Paginated message list response.
    
    GET /api/projects/{project_id}/messages response
    """
    data: list[MessageItem] = Field(description="List of messages")
    pagination: PaginationInfo = Field(description="Pagination metadata")


class RoutingMetadata(BaseModel):
    """
    Routing metadata included in chat response.
    
    Derived from: routing_metadata in Message model
    Provides transparency about agent selection.
    """
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Orchestrator confidence in agent selection (0-1)",
    )
    reasoning: str = Field(
        description="Explanation for why this agent was selected",
    )


class ChatResponse(BaseModel):
    """
    Chat response DTO.
    
    POST /api/projects/{project_id}/chat response
    Returns only the assistant message (user message not echoed back).
    
    Notes:
    - Only the assistant message is returned
    - Frontend already has the user's message content from the request
    """
    id: UUID = Field(description="Message unique identifier")
    role: Literal["assistant"] = Field(
        default="assistant",
        description="Always 'assistant' for chat responses",
    )
    content: str = Field(description="AI-generated response text")
    agent_id: str = Field(
        description="AI agent that generated the response",
    )
    routing_metadata: RoutingMetadata = Field(
        description="Information about agent routing decision",
    )
    created_at: datetime = Field(description="Response timestamp")


class MessageFeedbackResponse(BaseModel):
    """
    Message feedback response DTO.
    
    POST /api/projects/{project_id}/messages/{message_id}/feedback response
    """
    id: UUID = Field(description="Message unique identifier")
    csat_rating: int = Field(
        ge=1,
        le=5,
        description="Updated satisfaction rating (1-5)",
    )
    updated_at: datetime = Field(description="Feedback submission timestamp")


# =============================================================================
# REQUEST COMMAND MODELS
# =============================================================================

class ChatRequest(BaseModel):
    """
    Chat command model.
    
    POST /api/projects/{project_id}/chat request
    
    Validation:
    - content is required and must be non-empty
    - Maximum content length: 4000 characters
    
    Side Effects:
    - Creates messages records for both user and assistant
    - Creates routing_audits record for the assistant message
    - May update project_memory if agent extracts new facts
    - Creates usage_logs record for token consumption
    - Performs vector search on document chunks for context
    
    Performance:
    - Maximum response time: 10 seconds (as per PRD)
    """
    content: str = Field(
        min_length=1,
        max_length=4000,
        description="User's message content",
    )


class MessageFeedbackRequest(BaseModel):
    """
    Message feedback command model.
    
    POST /api/projects/{project_id}/messages/{message_id}/feedback request
    Derived from: MessageUpdate model
    
    Validation:
    - csat_rating must be an integer between 1 and 5
    - Can only rate assistant messages (role = 'assistant')
    """
    csat_rating: Literal[1, 2, 3, 4, 5] = Field(
        description="Satisfaction rating from 1 (poor) to 5 (excellent)",
    )

