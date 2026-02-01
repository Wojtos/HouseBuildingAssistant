"""
Chat Orchestration Service

Handles the complex multi-stage workflow for processing chat messages:
1. Store user message
2. Retrieve context (project context, project memory, chat history, documents) - RAG
3. Route to appropriate agent (triage)
4. Execute specialized agent with full context
5. Store assistant response
6. Return response

Enhanced with:
- UC-0: Project context injection
- UC-1: Enhanced memory formatting with domain prioritization
- UC-4: Enhanced document formatting with metadata
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field

from app.clients.ai_client import AIClient, AIServiceError
from app.clients.openrouter_service import (
    OpenRouterError,
    OpenRouterService,
)
from app.core.memory_domains import AGENT_TO_DOMAIN, MEMORY_DOMAINS
from app.core.prompt_templates import CONTEXT_USAGE_INSTRUCTIONS, LEGAL_DISCLAIMER, get_agent_prompt
from app.db.models import Message
from app.schemas.message import ChatResponse, MessageRole, RoutingMetadata
from app.schemas.openrouter import ModelParams
from app.services.document_retrieval_service import DocumentChunk, DocumentRetrievalService
from app.services.fact_extraction_service import FactExtractionService
from app.services.message_service import MessageService
from app.services.project_context_service import ProjectContextService
from app.services.project_memory_service import ProjectMemoryService
from app.services.web_search_service import WebSearchService

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

    Enhanced with:
    - UC-0: Project context injection for every interaction
    - UC-1: Structured memory with domain prioritization
    - UC-4: Enhanced document formatting with full metadata
    """

    # Document search trigger keywords
    DOCUMENT_SEARCH_TRIGGERS = [
        "contract",
        "permit",
        "quote",
        "estimate",
        "agreement",
        "according to",
        "what does my",
        "document",
        "uploaded",
        "in the file",
        "says about",
        "my documents",
        "check if",
    ]

    def __init__(
        self,
        openrouter_service: OpenRouterService,
        message_service: MessageService,
        document_service: Optional[DocumentRetrievalService] = None,
        memory_service: Optional[ProjectMemoryService] = None,
        project_context_service: Optional[ProjectContextService] = None,
        fact_extraction_service: Optional[FactExtractionService] = None,
        web_search_service: Optional[WebSearchService] = None,
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
            project_context_service: Optional project context service (UC-0)
            fact_extraction_service: Optional fact extraction service (UC-3)
            web_search_service: Optional web search service (UC-2)
            ai_client: Legacy AI client (deprecated, use openrouter_service)
        """
        self.openrouter_service = openrouter_service
        self.message_service = message_service
        self.document_service = document_service
        self.memory_service = memory_service
        self.project_context_service = project_context_service
        self.fact_extraction_service = fact_extraction_service
        self.web_search_service = web_search_service
        # Keep legacy ai_client for backward compatibility (if needed)
        self.ai_client = ai_client

        logger.info(
            f"ChatOrchestrationService initialized: "
            f"web_search={'enabled' if self.web_search_service else 'disabled'}, "
            f"mock_mode={self.openrouter_service.mock_mode}"
        )

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

            # Step 5: Extract facts (UC-3)
            extracted_facts = None
            logger.info(
                f"=== UC-3 FACT EXTRACTION === service={'present' if self.fact_extraction_service else 'NONE'}"
            )
            if self.fact_extraction_service:
                try:
                    extraction_result = await self.fact_extraction_service.extract_facts(
                        user_message=content,
                        assistant_response=assistant_content,
                        source="conversation",
                    )
                    if extraction_result.has_facts:
                        extracted_facts = [
                            {
                                "id": f.id,
                                "domain": f.domain,
                                "key": f.key,
                                "value": f.value,
                                "confidence": f.confidence,
                                "source": f.source,
                                "reasoning": f.reasoning,
                            }
                            for f in extraction_result.facts
                        ]
                        logger.info(f"Extracted {len(extracted_facts)} facts for confirmation")
                except Exception as e:
                    logger.warning(f"Fact extraction failed: {e}")

            # Step 6: Store assistant message
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

            # Step 7: Build context metadata
            context_metadata = {
                "used_project_context": bool(context.get("project_context")),
                "used_memory": bool(context.get("project_memory")),
                "used_documents": bool(context.get("relevant_documents")),
                "used_web_search": bool(context.get("web_search_results")),
                "document_count": len(context.get("relevant_documents", [])),
            }

            # Step 8: Build and return response
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
                "extracted_facts": extracted_facts,
                "context_metadata": context_metadata,
            }

            logger.info(
                f"Chat processed successfully: {agent_id} "
                f"(confidence: {confidence:.2f}, facts: {len(extracted_facts) if extracted_facts else 0})"
            )

            return response

        except (AIServiceError, OpenRouterError):
            # Re-raise AI service errors
            raise

        except Exception as e:
            logger.error(f"Error processing chat for project {project_id}: {e}", exc_info=True)
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

        Retrieves four types of context (UC-0, UC-1, UC-4):
        1. Project context (UC-0) - Core project metadata
        2. Project memory (UC-1, JSONB) - Structured facts
        3. Chat history - Conversation context
        4. Document search (UC-4, vector similarity) - Relevant document chunks

        This is the core RAG (Retrieval-Augmented Generation) functionality.
        """
        logger.debug(f"Retrieving RAG context for project {project_id}")

        # UC-0: Get project context
        project_context = None
        if self.project_context_service:
            try:
                ctx = await self.project_context_service.get_project_context(project_id)
                project_context = self.project_context_service.format_context_block(ctx)
                logger.info(f"Retrieved project context for '{ctx.project_name}'")
            except Exception as e:
                logger.warning(f"Could not retrieve project context: {e}")

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

        # UC-1: Get project memory if service available
        project_memory = {}
        if self.memory_service:
            try:
                project_memory = await self.memory_service.get_memory(project_id)
                logger.info(f"Retrieved project memory with {len(project_memory)} domains")
            except Exception as e:
                logger.warning(f"Could not retrieve project memory: {e}")

        # UC-4: Search relevant documents if service available
        # Only search if query seems document-related (optimization)
        relevant_documents = []
        should_search = self._should_search_documents(user_message)

        if self.document_service and should_search:
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
                        "chunk_index": chunk.chunk_index,
                        "document_id": str(chunk.document_id),
                        "upload_date": chunk.metadata.get("upload_date", "Unknown"),
                    }
                    for chunk in chunks
                ]

                logger.info(f"Retrieved {len(relevant_documents)} relevant document chunks")
            except Exception as e:
                logger.warning(f"Could not retrieve documents: {e}")
        elif self.document_service:
            logger.debug("Skipped document search (no trigger keywords)")

        # UC-2: Web search if query requires current information
        web_search_results = None
        location = None

        # Extract location from project context for location-aware search
        if project_context:
            import re

            match = re.search(r"Location: ([^\n]+)", project_context)
            if match and match.group(1) != "Not specified":
                location = match.group(1)

        if self.web_search_service:
            should_search = self.web_search_service.should_search(user_message, location)
            logger.info(f"Web search check: should_search={should_search}")

            if should_search:
                logger.info("Executing web search for current information")
                try:
                    search_response = await self.web_search_service.search_and_respond(
                        query=user_message,
                        project_context=project_context,
                        location=location,
                    )
                    if search_response:
                        citations = self.web_search_service.extract_citations(search_response)
                        web_search_results = self.web_search_service.format_search_results(
                            search_response, citations
                        )
                        logger.info(f"Web search completed with {len(citations)} citations")
                    else:
                        logger.warning("Web search returned empty response")
                except Exception as e:
                    logger.warning(f"Web search failed, continuing without: {e}", exc_info=True)
        else:
            logger.debug("Web search service not available")

        context = {
            "project_context": project_context,  # UC-0
            "chat_history": history_messages,
            "project_memory": project_memory,
            "relevant_documents": relevant_documents,
            "web_search_results": web_search_results,  # UC-2
        }

        logger.info(
            f"RAG context assembled: "
            f"project_context={'yes' if project_context else 'no'}, "
            f"{len(history_messages)} history messages, "
            f"{len(project_memory)} memory domains, "
            f"{len(relevant_documents)} document chunks, "
            f"web_search={'yes' if web_search_results else 'no'}"
        )

        return context

    def _should_search_documents(self, user_message: str) -> bool:
        """
        Determine if document search is relevant for this query.

        Optimization to avoid unnecessary vector searches for queries
        that are unlikely to benefit from document context.
        """
        message_lower = user_message.lower()
        return any(trigger in message_lower for trigger in self.DOCUMENT_SEARCH_TRIGGERS)

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

        Uses full RAG context including (UC-0, UC-1, UC-4):
        - Project context (UC-0)
        - Project memory (UC-1, structured facts with domain prioritization)
        - Relevant document chunks (UC-4, semantic search with metadata)
        - Chat history

        Args:
            agent_id: Selected agent identifier
            user_message: User's query
            context: Retrieved RAG context (project_context, history, memory, documents)

        Returns:
            Agent's response content
        """
        logger.debug(f"Executing {agent_id} with full RAG context")

        # Build agent-specific system prompt using unified templates
        base_prompt = get_agent_prompt(agent_id)

        # Build enriched context from RAG
        context_parts = []

        # UC-0: Add project context first (most important)
        if context.get("project_context"):
            context_parts.append(context["project_context"])

        # UC-1: Add project memory with domain prioritization
        if context.get("project_memory"):
            # Get priority domain for this agent
            priority_domain = AGENT_TO_DOMAIN.get(agent_id)
            priority_domains = [priority_domain] if priority_domain else None

            memory_str = self._format_project_memory(
                context["project_memory"],
                max_tokens=2000,
                priority_domains=priority_domains,
            )
            if memory_str:
                context_parts.append(memory_str)

        # UC-4: Add relevant documents with enhanced formatting
        if context.get("relevant_documents"):
            docs_str = self._format_documents(context["relevant_documents"])
            if docs_str:
                context_parts.append(docs_str)

        # UC-2: Add web search results
        if context.get("web_search_results"):
            context_parts.append(context["web_search_results"])

        # Add chat history
        if context.get("chat_history"):
            history_str = self._format_chat_history(context["chat_history"][-3:])
            if history_str:
                context_parts.append(f"=== RECENT CONVERSATION ===\n{history_str}")

        # Combine base prompt with context
        prompt_parts = [base_prompt, LEGAL_DISCLAIMER]

        # Add context usage instructions if any context is present
        if context_parts:
            prompt_parts.append(CONTEXT_USAGE_INSTRUCTIONS)

            # Add special instruction if web search results are present
            if context.get("web_search_results"):
                prompt_parts.append(
                    "IMPORTANT: Web search was already performed for this query. "
                    "The results are included below. Use this information to answer "
                    "the user's question with current data. Do NOT say you cannot "
                    "search the internet - the search was already done for you."
                )

            combined_context = "\n\n".join(context_parts)
            prompt_parts.append(f"Context for this query:\n\n{combined_context}")

            logger.debug(
                f"Added RAG context: {len(context_parts)} sections, "
                f"{len(combined_context)} characters"
            )

        system_message = "\n\n".join(prompt_parts)

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

    def _format_project_memory(
        self,
        memory: Dict[str, Any],
        max_tokens: int = 2000,
        priority_domains: Optional[List[str]] = None,
    ) -> str:
        """
        Format project memory as structured JSON block per UC-1 spec.

        Args:
            memory: Full project memory dict
            max_tokens: Maximum tokens for memory context
            priority_domains: Domains to prioritize (e.g., current agent's domain)

        Returns:
            Formatted memory block for prompt injection
        """
        if not memory:
            return ""

        # Filter out empty domains
        non_empty = {k: v for k, v in memory.items() if v}

        if not non_empty:
            return ""

        # Smart truncation: prioritize certain domains
        if priority_domains:
            # Put priority domains first
            ordered = {}
            for domain in priority_domains:
                if domain in non_empty:
                    ordered[domain] = non_empty[domain]
            for domain, data in non_empty.items():
                if domain not in ordered:
                    ordered[domain] = data
            non_empty = ordered

        # Format as JSON for structured context
        memory_json = json.dumps(non_empty, indent=2, default=str)

        # Truncate if too long (rough estimate: 4 chars per token)
        max_chars = max_tokens * 4
        if len(memory_json) > max_chars:
            memory_json = memory_json[:max_chars] + "\n... (truncated)"

        return f"""=== PROJECT MEMORY ===
{memory_json}
======================"""

    def _format_documents(self, documents: List[Dict[str, Any]]) -> str:
        """
        Format document chunks per UC-4 spec with full metadata.

        Enhanced formatting includes:
        - Document source and upload date
        - Chunk index information
        - Relevance score
        - Citation instructions
        """
        if not documents:
            return ""

        lines = ["=== RETRIEVED DOCUMENTS ==="]

        for i, doc in enumerate(documents, 1):
            source = doc.get("source", "Unknown")
            content = doc.get("content", "")
            similarity = doc.get("similarity", 0)
            chunk_index = doc.get("chunk_index", "?")
            upload_date = doc.get("upload_date", "Unknown date")

            lines.append(f"""
---
Document {i}: "{source}" (uploaded {upload_date})
Chunk {chunk_index}, Relevance: {similarity:.2f}

"{content}"
---""")

        lines.append("===========================")
        lines.append("Note: Cite document sources when referencing this information.")

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
    project_context_service: Optional[ProjectContextService] = None,
    fact_extraction_service: Optional[FactExtractionService] = None,
    web_search_service: Optional[WebSearchService] = None,
) -> ChatOrchestrationService:
    """
    Factory function for creating ChatOrchestrationService instances.

    Used as a FastAPI dependency.

    Args:
        openrouter_service: OpenRouter service for LLM calls
        message_service: Service for message persistence
        document_service: Optional document retrieval service for RAG
        memory_service: Optional project memory service for RAG
        project_context_service: Optional project context service (UC-0)
        fact_extraction_service: Optional fact extraction service (UC-3)
        web_search_service: Optional web search service (UC-2)

    Returns:
        ChatOrchestrationService instance
    """
    return ChatOrchestrationService(
        openrouter_service=openrouter_service,
        message_service=message_service,
        document_service=document_service,
        memory_service=memory_service,
        project_context_service=project_context_service,
        fact_extraction_service=fact_extraction_service,
        web_search_service=web_search_service,
    )
