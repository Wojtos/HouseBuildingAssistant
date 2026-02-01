"""
Messages API Router

Endpoints for chat/message functionality:
- GET /api/projects/{project_id}/messages - List messages with pagination
- POST /api/projects/{project_id}/chat - Send message and get AI response
- POST /api/projects/{project_id}/messages/{message_id}/feedback - Submit CSAT rating
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.api.dependencies import get_current_user, get_openrouter_service, verify_project_ownership
from app.clients.ai_client import AIServiceError
from app.clients.openrouter_service import OpenRouterError, OpenRouterService
from app.db import Project, get_supabase
from app.schemas.common import PaginationInfo
from app.schemas.message import (
    ChatRequest,
    ChatResponse,
    MessageFeedbackRequest,
    MessageFeedbackResponse,
    MessageListResponse,
    MessageRole,
)
from app.services.chat_orchestration_service import (
    ChatOrchestrationService,
    get_chat_orchestration_service,
)
from app.services.document_retrieval_service import (
    DocumentRetrievalService,
    get_document_retrieval_service,
)
from app.services.fact_extraction_service import (
    FactExtractionService,
    get_fact_extraction_service,
)
from app.services.message_service import MessageService, get_message_service
from app.services.project_context_service import (
    ProjectContextService,
    get_project_context_service,
)
from app.services.project_memory_service import (
    ProjectMemoryService,
    get_project_memory_service,
)
from app.services.web_search_service import (
    WebSearchService,
    get_web_search_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["messages"])


@router.get(
    "/{project_id}/messages",
    response_model=MessageListResponse,
    summary="Get chat history",
    description="Retrieve paginated chat history for a project",
    responses={
        200: {
            "description": "Messages retrieved successfully",
            "model": MessageListResponse,
        },
        401: {"description": "Authentication required"},
        403: {"description": "User does not own this project"},
        404: {"description": "Project not found"},
    },
)
async def list_messages(
    project_id: UUID,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(default=50, ge=1, le=100, description="Items per page (max 100)"),
    before: Optional[datetime] = Query(
        default=None,
        description="Get messages created before this timestamp",
    ),
    after: Optional[datetime] = Query(
        default=None,
        description="Get messages created after this timestamp",
    ),
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    message_service: MessageService = Depends(get_message_service),
):
    """
    Get paginated chat history for a project.

    **Authentication:** Required (Bearer token in Authorization header)

    **Authorization:** User must own the project

    **Returns:**
    - User and assistant messages
    - Ordered by created_at (descending - most recent first)
    - Pagination metadata

    **Query Parameters:**
    - `page`: Page number (default: 1)
    - `limit`: Items per page (default: 50, max: 100)
    - `before`: Optional timestamp filter (ISO 8601 format)
    - `after`: Optional timestamp filter (ISO 8601 format)

    **Example:**
    ```
    GET /api/projects/{project_id}/messages?page=1&limit=50
    ```
    """
    try:
        # Retrieve messages with pagination
        messages, total_count = await message_service.list_messages(
            project_id=project_id,
            page=page,
            limit=limit,
            before=before,
            after=after,
        )

        # Calculate pagination metadata
        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1

        # Build response
        response = MessageListResponse(
            data=messages,
            pagination=PaginationInfo(
                page=page,
                limit=limit,
                total_items=total_count,
                total_pages=total_pages,
            ),
        )

        logger.info(
            f"User {user_id} retrieved {len(messages)} messages for project {project_id} "
            f"(page {page}/{total_pages})"
        )

        return response

    except HTTPException:
        # Re-raise HTTP exceptions (from dependencies)
        raise

    except Exception as e:
        logger.error(f"Error listing messages for project {project_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post(
    "/{project_id}/chat",
    response_model=ChatResponse,
    summary="Send chat message",
    description="Send a message and receive an AI-generated response",
    responses={
        200: {
            "description": "Message processed and response generated",
            "model": ChatResponse,
        },
        400: {"description": "Missing or empty content"},
        401: {"description": "Authentication required"},
        403: {"description": "User does not own this project"},
        404: {"description": "Project not found"},
        422: {"description": "Content too long"},
        503: {"description": "AI service temporarily unavailable"},
    },
)
async def send_message(
    project_id: UUID,
    request: ChatRequest,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    openrouter_service: OpenRouterService = Depends(get_openrouter_service),
    message_service: MessageService = Depends(get_message_service),
    supabase: Client = Depends(get_supabase),
):
    """
    Send a user message and receive an AI-generated response.

    **Authentication:** Required (Bearer token in Authorization header)

    **Authorization:** User must own the project

    **Processing (with RAG):**
    1. Stores user message
    2. Retrieves context:
       - Project memory (structured facts)
       - Chat history (recent messages)
       - Relevant documents (vector search)
    3. Routes to appropriate specialized agent
    4. Generates AI response with full context
    5. Stores assistant message
    6. Returns response with routing metadata

    **RAG Features:**
    - Semantic document search for relevant information
    - Project memory retrieval for context awareness
    - Chat history for conversation continuity

    **Constraints:**
    - Maximum content length: 4000 characters
    - Maximum response time: 30 seconds

    **Example:**
    ```
    POST /api/projects/{project_id}/chat
    {
      "content": "What permits do I need for a single-family home?"
    }
    ```
    """
    try:
        # Initialize RAG services
        document_service = get_document_retrieval_service()
        memory_service = get_project_memory_service(supabase)
        project_context_service = get_project_context_service(supabase)  # UC-0
        fact_extraction_service = get_fact_extraction_service(  # UC-3
            openrouter_service=openrouter_service,
            memory_service=memory_service,
        )
        web_search_service = get_web_search_service(  # UC-2
            openrouter_service=openrouter_service,
        )

        # Create orchestration service with OpenRouterService
        chat_service = get_chat_orchestration_service(
            openrouter_service=openrouter_service,
            message_service=message_service,
            document_service=document_service,
            memory_service=memory_service,
            project_context_service=project_context_service,  # UC-0
            fact_extraction_service=fact_extraction_service,  # UC-3
            web_search_service=web_search_service,  # UC-2
        )

        # Process chat with timeout (30 seconds max to allow for retries)
        response = await asyncio.wait_for(
            chat_service.process_chat(
                project_id=project_id,
                user_id=user_id,
                content=request.content,
            ),
            timeout=30.0,
        )

        logger.info(
            f"Chat processed for project {project_id}, " f"agent: {response['agent_id']} (with RAG)"
        )

        return ChatResponse(**response)

    except asyncio.TimeoutError:
        logger.error(f"Chat timeout for project {project_id}")
        raise HTTPException(
            status_code=503,
            detail="AI service timeout, please try again",
        )

    except (AIServiceError, OpenRouterError) as e:
        logger.error(f"AI service error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="AI service temporarily unavailable",
        )

    except HTTPException:
        # Re-raise HTTP exceptions (from dependencies)
        raise

    except Exception as e:
        logger.error(f"Error processing chat for project {project_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post(
    "/{project_id}/messages/{message_id}/feedback",
    response_model=MessageFeedbackResponse,
    summary="Submit message feedback",
    description="Submit CSAT rating for an assistant message",
    responses={
        200: {
            "description": "Feedback submitted successfully",
            "model": MessageFeedbackResponse,
        },
        400: {"description": "Invalid rating value"},
        401: {"description": "Authentication required"},
        403: {"description": "User does not own this project"},
        404: {"description": "Project or message not found"},
        422: {"description": "Cannot rate user messages"},
    },
)
async def submit_feedback(
    project_id: UUID,
    message_id: UUID,
    request: MessageFeedbackRequest,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    message_service: MessageService = Depends(get_message_service),
):
    """
    Submit CSAT feedback for an assistant message.

    **Authentication:** Required (Bearer token in Authorization header)

    **Authorization:** User must own the project

    **Validation:**
    - Can only rate assistant messages (not user messages)
    - Rating must be between 1-5

    **Example:**
    ```
    POST /api/projects/{project_id}/messages/{message_id}/feedback
    {
      "csat_rating": 5
    }
    ```
    """
    try:
        # Verify message exists and belongs to project
        message = await message_service.get_message(
            message_id=message_id,
            project_id=project_id,
        )

        if not message:
            logger.warning(f"Message {message_id} not found in project {project_id}")
            raise HTTPException(status_code=404, detail="Message not found")

        # Verify message is from assistant (cannot rate user messages)
        if message.role != MessageRole.ASSISTANT.value:
            logger.warning(f"Attempt to rate user message {message_id} by user {user_id}")
            raise HTTPException(status_code=422, detail="Cannot rate user messages")

        # Update CSAT rating
        updated_message = await message_service.update_csat_rating(
            message_id=message_id,
            csat_rating=request.csat_rating,
        )

        logger.info(f"User {user_id} rated message {message_id} with score {request.csat_rating}")

        return MessageFeedbackResponse(
            id=updated_message.id,
            csat_rating=updated_message.csat_rating,
            updated_at=datetime.utcnow(),
        )

    except HTTPException:
        # Re-raise HTTP exceptions (from dependencies or validation)
        raise

    except Exception as e:
        logger.error(f"Error submitting feedback for message {message_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
