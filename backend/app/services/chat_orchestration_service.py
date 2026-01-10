"""
Chat Orchestration Service

Handles the complex multi-stage workflow for processing chat messages:
1. Store user message
2. Retrieve context (project memory, chat history, documents) - RAG
3. Route to appropriate agent (triage)
4. Execute specialized agent with full context
5. Store assistant response
6. Return response
"""

import logging
from datetime import datetime
from typing import Dict, Any, List, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field

from app.clients.openrouter_service import (
    OpenRouterService,
    OpenRouterError,
)
from app.clients.ai_client import AIClient, AIServiceError
from app.db.models import Message
from app.schemas.message import MessageRole, ChatResponse, RoutingMetadata
from app.schemas.openrouter import ModelParams
from app.services.message_service import MessageService
from app.services.document_retrieval_service import DocumentRetrievalService, DocumentChunk
from app.services.project_memory_service import ProjectMemoryService

logger = logging.getLogger(__name__)


# ============================================================================
# Routing Schema for Structured Output
# ============================================================================

VALID_AGENTS = [
    "LAND_FEASIBILITY_AGENT",
    "REGULATORY_PERMITTING_AGENT",
    "ARCHITECTURAL_DESIGN_AGENT",
    "FINANCE_LEGAL_AGENT",
    "SITE_PREP_FOUNDATION_AGENT",
    "SHELL_SYSTEMS_AGENT",
    "PROCUREMENT_QUALITY_AGENT",
    "FINISHES_FURNISHING_AGENT",
    "TRIAGE_MEMORY_AGENT",
]

AgentId = Literal[
    "LAND_FEASIBILITY_AGENT",
    "REGULATORY_PERMITTING_AGENT",
    "ARCHITECTURAL_DESIGN_AGENT",
    "FINANCE_LEGAL_AGENT",
    "SITE_PREP_FOUNDATION_AGENT",
    "SHELL_SYSTEMS_AGENT",
    "PROCUREMENT_QUALITY_AGENT",
    "FINISHES_FURNISHING_AGENT",
    "TRIAGE_MEMORY_AGENT",
]


class AgentRoutingResponse(BaseModel):
    """Structured response from the routing agent."""
    
    agent_id: AgentId = Field(..., description="Selected agent identifier")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")
    reasoning: str = Field(..., description="Brief explanation of routing decision")


AGENT_ROUTING_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "agent_id": {
            "type": "string",
            "enum": VALID_AGENTS,
        },
        "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
        },
        "reasoning": {
            "type": "string",
        },
    },
    "required": ["agent_id", "confidence", "reasoning"],
}


class ChatOrchestrationService:
    """
    Orchestrates the chat processing pipeline with full RAG support.
    
    Coordinates between message storage, context retrieval (RAG),
    AI agent routing, and response generation.
    """
    
    def __init__(
        self,
        openrouter_service: OpenRouterService,
        message_service: MessageService,
        document_service: Optional[DocumentRetrievalService] = None,
        memory_service: Optional[ProjectMemoryService] = None,
        # Legacy support for AIClient
        ai_client: Optional[AIClient] = None,
    ):
        """
        Initialize chat orchestration service.
        
        Args:
            openrouter_service: OpenRouter service for LLM calls
            message_service: Service for message persistence
            document_service: Optional document retrieval service for RAG
            memory_service: Optional project memory service for RAG
            ai_client: Legacy AI client (deprecated, use openrouter_service)
        """
        self.openrouter_service = openrouter_service
        self.message_service = message_service
        self.document_service = document_service
        self.memory_service = memory_service
        # Keep legacy ai_client for backward compatibility (if needed)
        self.ai_client = ai_client
    
    async def process_chat(
        self,
        project_id: UUID,
        user_id: UUID,
        content: str,
    ) -> Dict[str, Any]:
        """
        Process a chat message through the full pipeline.
        
        Args:
            project_id: Project identifier
            user_id: User identifier
            content: User's message content
            
        Returns:
            Dict with assistant response data (ChatResponse compatible)
            
        Raises:
            AIServiceError: If AI service fails
            Exception: For other processing errors
        """
        logger.info(f"Processing chat for project {project_id}, user {user_id}")
        
        try:
            # Step 1: Store user message
            user_message = await self._store_user_message(
                project_id=project_id,
                user_id=user_id,
                content=content,
            )
            
            # Step 2: Retrieve context (simplified for now)
            context = await self._retrieve_context(
                project_id=project_id,
                user_message=content,
            )
            
            # Step 3: Route to appropriate agent (triage)
            agent_id, confidence, reasoning = await self._route_to_agent(
                user_message=content,
                context=context,
            )
            
            # Step 4: Execute specialized agent
            assistant_content = await self._execute_agent(
                agent_id=agent_id,
                user_message=content,
                context=context,
            )
            
            # Step 5: Store assistant message
            assistant_message = await self._store_assistant_message(
                project_id=project_id,
                user_id=user_id,
                content=assistant_content,
                agent_id=agent_id,
                routing_metadata={
                    "confidence": confidence,
                    "reasoning": reasoning,
                },
            )
            
            # Step 6: Build and return response
            response = {
                "id": assistant_message.id,
                "role": "assistant",
                "content": assistant_message.content,
                "agent_id": assistant_message.agent_id,
                "routing_metadata": {
                    "confidence": confidence,
                    "reasoning": reasoning,
                },
                "created_at": assistant_message.created_at,
            }
            
            logger.info(
                f"Chat processed successfully: {agent_id} "
                f"(confidence: {confidence:.2f})"
            )
            
            return response
        
        except (AIServiceError, OpenRouterError):
            # Re-raise AI service errors
            raise
        
        except Exception as e:
            logger.error(
                f"Error processing chat for project {project_id}: {e}",
                exc_info=True
            )
            raise
    
    async def _store_user_message(
        self,
        project_id: UUID,
        user_id: UUID,
        content: str,
    ) -> Message:
        """Store the user's message in database."""
        logger.debug(f"Storing user message for project {project_id}")
        
        return await self.message_service.create_message(
            project_id=project_id,
            user_id=user_id,
            role=MessageRole.USER,
            content=content,
            agent_id=None,
            routing_metadata=None,
        )
    
    async def _retrieve_context(
        self,
        project_id: UUID,
        user_message: str,
    ) -> Dict[str, Any]:
        """
        Retrieve full RAG context for the agent.
        
        Retrieves three types of context:
        1. Project memory (JSONB) - Structured facts
        2. Chat history (recent messages) - Conversation context
        3. Document search (vector similarity) - Relevant document chunks
        
        This is the core RAG (Retrieval-Augmented Generation) functionality.
        """
        logger.debug(f"Retrieving RAG context for project {project_id}")
        
        # Get recent chat history
        chat_history = await self.message_service.get_recent_history(
            project_id=project_id,
            limit=5,
        )
        
        # Format history for AI context
        history_messages = [
            {
                "role": msg.role,
                "content": msg.content,
            }
            for msg in chat_history
        ]
        
        # Get project memory if service available
        project_memory = {}
        if self.memory_service:
            try:
                project_memory = await self.memory_service.get_memory(project_id)
                logger.info(
                    f"Retrieved project memory with {len(project_memory)} domains"
                )
            except Exception as e:
                logger.warning(f"Could not retrieve project memory: {e}")
        
        # Search relevant documents if service available
        relevant_documents = []
        if self.document_service:
            try:
                chunks = await self.document_service.search_documents(
                    project_id=project_id,
                    query=user_message,
                    top_k=5,
                    similarity_threshold=0.7,
                )
                
                relevant_documents = [
                    {
                        "content": chunk.content,
                        "source": chunk.metadata.get("filename", "Unknown"),
                        "similarity": chunk.similarity,
                    }
                    for chunk in chunks
                ]
                
                logger.info(f"Retrieved {len(relevant_documents)} relevant document chunks")
            except Exception as e:
                logger.warning(f"Could not retrieve documents: {e}")
        
        context = {
            "chat_history": history_messages,
            "project_memory": project_memory,
            "relevant_documents": relevant_documents,
        }
        
        logger.info(
            f"RAG context assembled: "
            f"{len(history_messages)} history messages, "
            f"{len(project_memory)} memory domains, "
            f"{len(relevant_documents)} document chunks"
        )
        
        return context
    
    async def _route_to_agent(
        self,
        user_message: str,
        context: Dict[str, Any],
    ) -> tuple[str, float, str]:
        """
        Route the message to appropriate specialized agent.
        
        Uses structured JSON output for reliable routing.
        
        Returns:
            Tuple of (agent_id, confidence, reasoning)
        """
        logger.debug("Routing message to appropriate agent")
        
        # Build triage prompt
        system_prompt = """You are a triage agent for a home building assistant.
Your job is to route user queries to the most appropriate specialized agent.

Available agents:
- LAND_FEASIBILITY_AGENT: Land selection, site analysis, soil reports
- REGULATORY_PERMITTING_AGENT: Permits, zoning, regulations
- ARCHITECTURAL_DESIGN_AGENT: Design, layouts, materials
- FINANCE_LEGAL_AGENT: Budget, loans, contracts, insurance
- SITE_PREP_FOUNDATION_AGENT: Excavation, grading, foundation
- SHELL_SYSTEMS_AGENT: Framing, roofing, HVAC, plumbing, electrical
- PROCUREMENT_QUALITY_AGENT: Materials, scheduling, quality control
- FINISHES_FURNISHING_AGENT: Interior finishes, fixtures, furnishing
- TRIAGE_MEMORY_AGENT: General queries, greetings, summaries

Analyze the query and select the most appropriate agent. Provide your confidence level and reasoning."""
        
        try:
            # Use structured JSON output for reliable routing
            routing_params = ModelParams(temperature=0.0, max_tokens=150)
            
            routing_result, _ = await self.openrouter_service.chat_completion_json(
                user_message=f"Route this query: {user_message}",
                system_message=system_prompt,
                schema_name="agent_routing",
                schema=AGENT_ROUTING_SCHEMA,
                output_model=AgentRoutingResponse,
                params=routing_params,
            )
            
            agent_id = routing_result.agent_id
            confidence = routing_result.confidence
            reasoning = routing_result.reasoning
            
            logger.info(f"Routed to {agent_id} (confidence: {confidence:.2f})")
            
            return agent_id, confidence, reasoning
        
        except OpenRouterError as e:
            logger.error(f"Error in agent routing: {e}")
            # Fallback to general agent
            return "TRIAGE_MEMORY_AGENT", 0.50, "Fallback routing due to service error"
        
        except Exception as e:
            logger.error(f"Unexpected error in agent routing: {e}")
            return "TRIAGE_MEMORY_AGENT", 0.50, "Fallback routing due to unexpected error"
    
    async def _execute_agent(
        self,
        agent_id: str,
        user_message: str,
        context: Dict[str, Any],
    ) -> str:
        """
        Execute the specialized agent to generate response.
        
        Uses full RAG context including:
        - Chat history
        - Project memory (structured facts)
        - Relevant document chunks (semantic search)
        
        Args:
            agent_id: Selected agent identifier
            user_message: User's query
            context: Retrieved RAG context (history, memory, documents)
            
        Returns:
            Agent's response content
        """
        logger.debug(f"Executing {agent_id} with full RAG context")
        
        # Build agent-specific system prompt
        base_prompt = self._get_agent_prompt(agent_id)
        
        # Build enriched context from RAG
        context_parts = []
        
        # 1. Add project memory if available
        if context.get("project_memory"):
            memory_str = self._format_project_memory(context["project_memory"])
            if memory_str:
                context_parts.append(f"=== PROJECT FACTS ===\n{memory_str}")
        
        # 2. Add relevant documents if available
        if context.get("relevant_documents"):
            docs_str = self._format_documents(context["relevant_documents"])
            if docs_str:
                context_parts.append(f"=== RELEVANT DOCUMENTS ===\n{docs_str}")
        
        # 3. Add chat history
        if context.get("chat_history"):
            history_str = self._format_chat_history(context["chat_history"][-3:])
            if history_str:
                context_parts.append(f"=== RECENT CONVERSATION ===\n{history_str}")
        
        # Combine base prompt with context
        if context_parts:
            combined_context = "\n\n".join(context_parts)
            system_message = f"{base_prompt}\n\nContext for this query:\n\n{combined_context}"
            
            logger.debug(
                f"Added RAG context: {len(context_parts)} sections, "
                f"{len(combined_context)} characters"
            )
        else:
            system_message = base_prompt
        
        try:
            # Call OpenRouterService for agent response
            result = await self.openrouter_service.chat_completion(
                user_message=user_message,
                system_message=system_message,
            )
            
            return result.content
        
        except OpenRouterError as e:
            logger.error(f"Error executing agent {agent_id}: {e}")
            raise
    
    def _format_project_memory(self, memory: Dict[str, Any]) -> str:
        """Format project memory for inclusion in prompt."""
        if not memory:
            return ""
        
        # Filter out empty domains
        non_empty = {k: v for k, v in memory.items() if v}
        
        if not non_empty:
            return ""
        
        lines = []
        for domain, data in non_empty.items():
            lines.append(f"{domain}:")
            for key, value in data.items():
                lines.append(f"  - {key}: {value}")
        
        return "\n".join(lines)
    
    def _format_documents(self, documents: List[Dict[str, Any]]) -> str:
        """Format document chunks for inclusion in prompt."""
        if not documents:
            return ""
        
        lines = []
        for i, doc in enumerate(documents, 1):
            source = doc.get("source", "Unknown")
            content = doc.get("content", "")
            similarity = doc.get("similarity", 0)
            
            lines.append(
                f"Document {i} (from {source}, relevance: {similarity:.2f}):\n"
                f"{content}\n"
            )
        
        return "\n".join(lines)
    
    def _format_chat_history(self, history: List[Dict[str, str]]) -> str:
        """Format chat history for inclusion in prompt."""
        if not history:
            return ""
        
        lines = []
        for msg in history:
            role = msg.get("role", "unknown").capitalize()
            content = msg.get("content", "")
            lines.append(f"{role}: {content}")
        
        return "\n".join(lines)
    
    def _get_agent_prompt(self, agent_id: str) -> str:
        """Get specialized system prompt for each agent."""
        prompts = {
            "LAND_FEASIBILITY_AGENT": """You are a Land & Feasibility specialist for home building.
You help with land selection, site analysis, soil reports, and initial feasibility assessment.
Provide practical, actionable advice based on construction best practices.""",
            
            "REGULATORY_PERMITTING_AGENT": """You are a Regulatory & Permitting expert for home building.
You help with zoning codes, permits, regulations, and inspection requirements.
Always remind users to verify with local authorities as regulations vary by location.""",
            
            "ARCHITECTURAL_DESIGN_AGENT": """You are an Architectural Design consultant for home building.
You help with layouts, design concepts, material selection, and energy efficiency.
Focus on practical design solutions that balance aesthetics with functionality.""",
            
            "FINANCE_LEGAL_AGENT": """You are a Finance & Legal advisor for home construction.
You help with construction loans, budgeting, contracts, and insurance.
Always include disclaimers that users should consult licensed professionals for legal/financial decisions.""",
            
            "SITE_PREP_FOUNDATION_AGENT": """You are a Site Preparation & Foundation specialist.
You help with excavation, grading, drainage, and foundation types.
Emphasize the importance of proper site prep and soil analysis.""",
            
            "SHELL_SYSTEMS_AGENT": """You are a Structural Shell & Systems expert.
You help with framing, roofing, and MEP systems (HVAC, plumbing, electrical).
Focus on code compliance and proper installation sequences.""",
            
            "PROCUREMENT_QUALITY_AGENT": """You are a Procurement & Quality Control specialist.
You help with material selection, cost estimation, scheduling, and quality checks.
Emphasize the importance of quality materials and proper inspections.""",
            
            "FINISHES_FURNISHING_AGENT": """You are an Interior Finishes & Furnishing consultant.
You help with interior finishes, fixtures, cabinetry, and smart home integration.
Focus on practical choices that balance quality with budget.""",
            
            "TRIAGE_MEMORY_AGENT": """You are a helpful home building assistant.
You handle general queries, provide project summaries, and answer questions that don't fit specific domains.
Be friendly and guide users to more specific questions when appropriate.""",
        }
        
        return prompts.get(agent_id, prompts["TRIAGE_MEMORY_AGENT"])
    
    async def _store_assistant_message(
        self,
        project_id: UUID,
        user_id: UUID,
        content: str,
        agent_id: str,
        routing_metadata: Dict[str, Any],
    ) -> Message:
        """Store the assistant's response in database."""
        logger.debug(f"Storing assistant message from {agent_id}")
        
        return await self.message_service.create_message(
            project_id=project_id,
            user_id=user_id,
            role=MessageRole.ASSISTANT,
            content=content,
            agent_id=agent_id,
            routing_metadata=routing_metadata,
        )


def get_chat_orchestration_service(
    openrouter_service: OpenRouterService,
    message_service: MessageService,
    document_service: Optional[DocumentRetrievalService] = None,
    memory_service: Optional[ProjectMemoryService] = None,
) -> ChatOrchestrationService:
    """
    Factory function for creating ChatOrchestrationService instances.
    
    Used as a FastAPI dependency.
    
    Args:
        openrouter_service: OpenRouter service for LLM calls
        message_service: Service for message persistence
        document_service: Optional document retrieval service for RAG
        memory_service: Optional project memory service for RAG
        
    Returns:
        ChatOrchestrationService instance
    """
    return ChatOrchestrationService(
        openrouter_service=openrouter_service,
        message_service=message_service,
        document_service=document_service,
        memory_service=memory_service,
    )

