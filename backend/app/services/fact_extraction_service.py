"""
Fact Extraction Service (UC-3)

Extracts structured facts from conversations and documents using LLM,
with user confirmation before storing in project memory.

Key features:
- Uses structured JSON output for reliable fact extraction
- Always requires user confirmation before storing
- Organizes facts by memory domain
- Tracks extraction source and confidence
"""

import logging
import uuid
from typing import List, Optional
from uuid import UUID

from app.clients.openrouter_service import OpenRouterService
from app.core.prompt_templates import build_fact_extraction_prompt
from app.schemas.fact_extraction import (
    FACT_EXTRACTION_SCHEMA,
    ExtractedFact,
    FactExtractionResult,
)
from app.schemas.openrouter import ModelParams
from app.services.project_memory_service import ProjectMemoryService

logger = logging.getLogger(__name__)


class FactExtractionService:
    """
    Extracts facts from conversations and documents.

    All extracted facts require user confirmation before being stored
    in project memory. This ensures data quality and user control.
    """

    def __init__(
        self,
        openrouter_service: OpenRouterService,
        memory_service: ProjectMemoryService,
    ):
        """
        Initialize fact extraction service.

        Args:
            openrouter_service: OpenRouter service for LLM calls
            memory_service: Project memory service for storing confirmed facts
        """
        self.openrouter_service = openrouter_service
        self.memory_service = memory_service

    async def extract_facts(
        self,
        user_message: str,
        assistant_response: str,
        source: str = "conversation",
    ) -> FactExtractionResult:
        """
        Extract facts from a conversation exchange.

        Args:
            user_message: The user's message
            assistant_response: The assistant's response
            source: Source identifier (e.g., "conversation" or document filename)

        Returns:
            FactExtractionResult with extracted facts (not yet stored)
        """
        logger.info(f"Extracting facts from {source}")

        content_to_analyze = f"""User message:
{user_message}

Assistant response:
{assistant_response}"""

        try:
            # Use simple chat completion with JSON instruction in prompt
            # (Strict JSON schema mode fails with some OpenRouter providers)
            json_prompt = build_fact_extraction_prompt() + """

IMPORTANT: You MUST respond ONLY with valid JSON in this exact format:
{
  "facts": [
    {
      "domain": "DOMAIN_NAME",
      "key": "short_descriptive_key",
      "value": "the actual value",
      "confidence": 0.9,
      "reasoning": "why this fact was extracted"
    }
  ]
}

Valid domains: LAND_FEASIBILITY, REGULATORY_PERMITTING, ARCHITECTURAL_DESIGN, FINANCE_LEGAL, SITE_PREP_FOUNDATION, SHELL_SYSTEMS, PROCUREMENT_QUALITY, FINISHES_FURNISHING, GENERAL

If no facts can be extracted, respond with: {"facts": []}
"""

            logger.info(
                f"Calling OpenRouter for fact extraction, content length: {len(content_to_analyze)}"
            )
            response = await self.openrouter_service.chat_completion(
                user_message=content_to_analyze,
                system_message=json_prompt,
                params=ModelParams(temperature=0.1, max_tokens=1000),
            )
            logger.info(
                f"Fact extraction response: {response.content[:200] if response.content else 'empty'}"
            )

            # Parse JSON from response
            import json

            try:
                result = json.loads(response.content)
            except json.JSONDecodeError:
                # Try to extract JSON from response if it contains extra text
                import re

                json_match = re.search(r"\{[\s\S]*\}", response.content)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    logger.warning(
                        f"Could not parse JSON from fact extraction response: {response.content[:200]}"
                    )
                    return FactExtractionResult(facts=[], has_facts=False)

            # Add IDs and source to extracted facts
            facts = []
            for fact_data in result.get("facts", []):
                fact = ExtractedFact(
                    id=str(uuid.uuid4()),
                    domain=fact_data["domain"],
                    key=fact_data["key"],
                    value=fact_data["value"],
                    confidence=fact_data["confidence"],
                    source=source,
                    reasoning=fact_data.get("reasoning"),
                )
                facts.append(fact)

            logger.info(f"Extracted {len(facts)} facts from {source}")

            return FactExtractionResult(
                facts=facts,
                has_facts=len(facts) > 0,
            )

        except Exception as e:
            logger.error(f"Fact extraction failed: {e}", exc_info=True)
            return FactExtractionResult(facts=[], has_facts=False)

    async def extract_facts_from_document(
        self,
        document_content: str,
        document_name: str,
    ) -> FactExtractionResult:
        """
        Extract facts from a document.

        Args:
            document_content: The document's text content
            document_name: Name of the document

        Returns:
            FactExtractionResult with extracted facts (not yet stored)
        """
        logger.info(f"Extracting facts from document: {document_name}")

        # Truncate if too long
        max_chars = 8000  # Limit for fact extraction
        if len(document_content) > max_chars:
            document_content = document_content[:max_chars] + "\n... (truncated)"

        content_to_analyze = f"""Document: {document_name}

Content:
{document_content}"""

        try:
            result, _ = await self.openrouter_service.chat_completion_json(
                user_message=content_to_analyze,
                system_message=build_fact_extraction_prompt(),
                schema_name="fact_extraction",
                schema=FACT_EXTRACTION_SCHEMA,
                params=ModelParams(temperature=0.1, max_tokens=1500),
            )

            facts = []
            for fact_data in result.get("facts", []):
                fact = ExtractedFact(
                    id=str(uuid.uuid4()),
                    domain=fact_data["domain"],
                    key=fact_data["key"],
                    value=fact_data["value"],
                    confidence=fact_data["confidence"],
                    source=document_name,
                    reasoning=fact_data.get("reasoning"),
                )
                facts.append(fact)

            logger.info(f"Extracted {len(facts)} facts from document {document_name}")

            return FactExtractionResult(
                facts=facts,
                has_facts=len(facts) > 0,
            )

        except Exception as e:
            logger.error(f"Document fact extraction failed: {e}")
            return FactExtractionResult(facts=[], has_facts=False)

    async def store_confirmed_facts(
        self,
        project_id: UUID,
        facts: List[ExtractedFact],
    ) -> dict:
        """
        Store user-confirmed facts in project memory.

        Args:
            project_id: Project to update
            facts: List of confirmed facts to store

        Returns:
            Dict with storage results
        """
        if not facts:
            return {"stored_count": 0, "updated_domains": []}

        # Group facts by domain
        updates_by_domain = {}
        for fact in facts:
            if fact.domain not in updates_by_domain:
                updates_by_domain[fact.domain] = {}
            updates_by_domain[fact.domain][fact.key] = fact.value

        # Update memory
        await self.memory_service.update_memory(
            project_id=project_id,
            updates=updates_by_domain,
            merge=True,
        )

        logger.info(f"Stored {len(facts)} facts in domains: {list(updates_by_domain.keys())}")

        return {
            "stored_count": len(facts),
            "updated_domains": list(updates_by_domain.keys()),
        }


def get_fact_extraction_service(
    openrouter_service: OpenRouterService,
    memory_service: ProjectMemoryService,
) -> FactExtractionService:
    """
    Factory function for creating FactExtractionService instances.

    Args:
        openrouter_service: OpenRouter service for LLM calls
        memory_service: Project memory service for storage

    Returns:
        FactExtractionService instance
    """
    return FactExtractionService(
        openrouter_service=openrouter_service,
        memory_service=memory_service,
    )
