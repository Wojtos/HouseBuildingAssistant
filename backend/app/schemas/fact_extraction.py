"""
Schemas for fact extraction and confirmation (UC-3).

Defines data structures for:
- Extracted facts from conversations and documents
- Fact confirmation requests and responses
- JSON schemas for LLM structured output
"""

from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.memory_domains import MEMORY_DOMAINS


# Type for memory domains
MemoryDomain = Literal[
    "LAND_FEASIBILITY",
    "REGULATORY_PERMITTING",
    "ARCHITECTURAL_DESIGN",
    "FINANCE_LEGAL",
    "SITE_PREP_FOUNDATION",
    "SHELL_SYSTEMS",
    "PROCUREMENT_QUALITY",
    "FINISHES_FURNISHING",
    "GENERAL",
]


class ExtractedFact(BaseModel):
    """A single fact extracted from conversation or document."""
    
    id: str = Field(..., description="Unique identifier for this fact")
    domain: MemoryDomain = Field(..., description="Memory domain this fact belongs to")
    key: str = Field(..., description="Fact key/name (e.g., 'total_budget', 'general_contractor')")
    value: str = Field(..., description="Fact value")
    confidence: float = Field(..., ge=0, le=1, description="Extraction confidence (0-1)")
    source: str = Field(..., description="Source: 'conversation' or document filename")
    reasoning: Optional[str] = Field(None, description="Why this fact was extracted")


class FactExtractionResult(BaseModel):
    """Result of fact extraction from content."""
    
    facts: List[ExtractedFact] = Field(default_factory=list)
    has_facts: bool = Field(default=False)


class FactConfirmationRequest(BaseModel):
    """Request to confirm and store extracted facts."""
    
    confirmed_fact_ids: List[str] = Field(..., description="IDs of facts user confirmed")
    rejected_fact_ids: List[str] = Field(default_factory=list, description="IDs user rejected")
    facts: List[ExtractedFact] = Field(..., description="Full list of extracted facts")


class FactConfirmationResponse(BaseModel):
    """Response after storing confirmed facts."""
    
    stored_count: int = Field(..., description="Number of facts stored")
    rejected_count: int = Field(..., description="Number of facts rejected")
    updated_domains: List[str] = Field(default_factory=list, description="Domains that were updated")


# JSON Schema for LLM structured output
FACT_EXTRACTION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "facts": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "domain": {
                        "type": "string",
                        "enum": MEMORY_DOMAINS,
                        "description": "Memory domain this fact belongs to",
                    },
                    "key": {
                        "type": "string",
                        "description": "Short descriptive key for the fact",
                    },
                    "value": {
                        "type": "string",
                        "description": "The actual value of the fact",
                    },
                    "confidence": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1,
                        "description": "Confidence score (0-1)",
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Why this fact was extracted",
                    },
                },
                "required": ["domain", "key", "value", "confidence"],
            },
        },
    },
    "required": ["facts"],
}


class ChatResponseWithFacts(BaseModel):
    """Extended chat response that may include extracted facts."""
    
    id: UUID = Field(..., description="Message ID")
    role: Literal["assistant"] = Field(default="assistant")
    content: str = Field(..., description="Assistant's response")
    agent_id: str = Field(..., description="Agent that generated the response")
    routing_metadata: dict = Field(default_factory=dict)
    created_at: str = Field(..., description="Creation timestamp")
    
    # Fact extraction fields (UC-3)
    extracted_facts: Optional[List[ExtractedFact]] = Field(
        None, description="Facts extracted from this exchange (pending confirmation)"
    )
    
    # Context metadata (UC-0, UC-1, UC-2, UC-4)
    context_metadata: Optional[dict] = Field(
        None, description="Metadata about context used in response"
    )
