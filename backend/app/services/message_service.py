"""
Message Service Layer

Handles business logic for message operations including:
- Listing messages with pagination and filters
- Creating user and assistant messages
- Updating CSAT ratings
- Retrieving message history for context
"""

import logging
from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from fastapi import Depends
from supabase import Client

from app.db import get_supabase
from app.db.models import Message, MessageInsert, MessageUpdate
from app.schemas.message import MessageItem, MessageRole

logger = logging.getLogger(__name__)


class MessageService:
    """Service for managing chat messages."""
    
    def __init__(self, supabase: Client):
        """
        Initialize message service.
        
        Args:
            supabase: Supabase client instance for database operations
        """
        self.supabase = supabase
    
    async def list_messages(
        self,
        project_id: UUID,
        page: int,
        limit: int,
        before: Optional[datetime] = None,
        after: Optional[datetime] = None,
    ) -> Tuple[List[MessageItem], int]:
        """
        Retrieve paginated messages for a project.
        
        Messages are ordered by created_at descending (most recent first).
        Supports optional time-based filtering.
        
        Args:
            project_id: Project identifier
            page: Page number (1-indexed)
            limit: Items per page
            before: Optional filter for messages before this timestamp
            after: Optional filter for messages after this timestamp
            
        Returns:
            Tuple of (list of MessageItem DTOs, total count)
            
        Raises:
            Exception: If database query fails
        """
        try:
            # Calculate offset for pagination
            offset = (page - 1) * limit
            
            # Build base query
            query = (
                self.supabase.table("messages")
                .select("*", count="exact")
                .eq("project_id", str(project_id))
            )
            
            # Apply timestamp filters if provided
            if before:
                query = query.lt("created_at", before.isoformat())
            
            if after:
                query = query.gt("created_at", after.isoformat())
            
            # Apply ordering and pagination
            query = (
                query
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
            )
            
            # Execute query
            response = query.execute()
            
            # Extract data and count
            messages_data = response.data
            total_count = response.count if response.count is not None else 0
            
            # Transform to DTOs
            messages = [
                MessageItem(
                    id=msg["id"],
                    project_id=msg["project_id"],
                    role=MessageRole(msg["role"]),
                    content=msg["content"],
                    agent_id=msg.get("agent_id"),
                    csat_rating=msg.get("csat_rating"),
                    created_at=datetime.fromisoformat(msg["created_at"].replace("Z", "+00:00")),
                )
                for msg in messages_data
            ]
            
            logger.info(
                f"Listed {len(messages)} messages for project {project_id} "
                f"(page {page}, total {total_count})"
            )
            
            return messages, total_count
        
        except Exception as e:
            logger.error(
                f"Error listing messages for project {project_id}: {e}",
                exc_info=True
            )
            raise
    
    async def create_message(
        self,
        project_id: UUID,
        user_id: UUID,
        role: MessageRole,
        content: str,
        agent_id: Optional[str] = None,
        routing_metadata: Optional[dict] = None,
    ) -> Message:
        """
        Create a new message record.
        
        Used for both user messages and assistant responses.
        
        Args:
            project_id: Project identifier
            user_id: User identifier (message author or project owner)
            role: Message role (user or assistant)
            content: Message text content
            agent_id: Optional AI agent identifier (for assistant messages)
            routing_metadata: Optional routing decision metadata (for assistant messages)
            
        Returns:
            Created Message instance
            
        Raises:
            Exception: If database insertion fails
        """
        try:
            message_data = MessageInsert(
                project_id=project_id,
                user_id=user_id,
                role=role.value,
                content=content,
                agent_id=agent_id,
                routing_metadata=routing_metadata or {},
                csat_rating=None,
            )
            
            response = (
                self.supabase.table("messages")
                .insert(message_data.model_dump(mode="json"))
                .execute()
            )
            
            if not response.data:
                raise Exception("Failed to create message - no data returned")
            
            created_message = response.data[0]
            
            logger.info(
                f"Created {role.value} message {created_message['id']} "
                f"for project {project_id}"
            )
            
            return Message(**created_message)
        
        except Exception as e:
            logger.error(
                f"Error creating message for project {project_id}: {e}",
                exc_info=True
            )
            raise
    
    async def update_csat_rating(
        self,
        message_id: UUID,
        csat_rating: int,
    ) -> Message:
        """
        Update CSAT rating for a message.
        
        Should only be called for assistant messages (validated by caller).
        
        Args:
            message_id: Message identifier
            csat_rating: Satisfaction rating (1-5)
            
        Returns:
            Updated Message instance
            
        Raises:
            Exception: If database update fails
        """
        try:
            update_data = MessageUpdate(csat_rating=csat_rating)
            
            response = (
                self.supabase.table("messages")
                .update(update_data.model_dump(exclude_unset=True, mode="json"))
                .eq("id", str(message_id))
                .execute()
            )
            
            if not response.data:
                raise Exception(f"Failed to update message {message_id} - no data returned")
            
            updated_message = response.data[0]
            
            logger.info(
                f"Updated CSAT rating to {csat_rating} for message {message_id}"
            )
            
            return Message(**updated_message)
        
        except Exception as e:
            logger.error(
                f"Error updating CSAT rating for message {message_id}: {e}",
                exc_info=True
            )
            raise
    
    async def get_message(
        self,
        message_id: UUID,
        project_id: UUID,
    ) -> Optional[Message]:
        """
        Get a specific message by ID.
        
        Verifies the message belongs to the specified project.
        
        Args:
            message_id: Message identifier
            project_id: Project identifier (for verification)
            
        Returns:
            Message instance if found, None otherwise
            
        Raises:
            Exception: If database query fails
        """
        try:
            response = (
                self.supabase.table("messages")
                .select("*")
                .eq("id", str(message_id))
                .eq("project_id", str(project_id))
                .execute()
            )
            
            if not response.data:
                logger.warning(
                    f"Message {message_id} not found for project {project_id}"
                )
                return None
            
            return Message(**response.data[0])
        
        except Exception as e:
            logger.error(
                f"Error getting message {message_id} for project {project_id}: {e}",
                exc_info=True
            )
            raise
    
    async def get_recent_history(
        self,
        project_id: UUID,
        limit: int = 10,
    ) -> List[Message]:
        """
        Get recent chat history for context.
        
        Retrieves the most recent messages for use in AI prompts.
        Ordered by created_at descending (most recent first).
        
        Args:
            project_id: Project identifier
            limit: Maximum number of messages to retrieve
            
        Returns:
            List of Message instances (most recent first)
            
        Raises:
            Exception: If database query fails
        """
        try:
            response = (
                self.supabase.table("messages")
                .select("*")
                .eq("project_id", str(project_id))
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            
            messages = [Message(**msg) for msg in response.data]
            
            logger.info(
                f"Retrieved {len(messages)} recent messages for project {project_id}"
            )
            
            return messages
        
        except Exception as e:
            logger.error(
                f"Error getting recent history for project {project_id}: {e}",
                exc_info=True
            )
            raise


def get_message_service(supabase: Client = Depends(get_supabase)) -> MessageService:
    """
    Factory function for creating MessageService instances.
    
    Used as a FastAPI dependency.
    
    Args:
        supabase: Supabase client from dependency injection
        
    Returns:
        MessageService instance
    """
    return MessageService(supabase)

