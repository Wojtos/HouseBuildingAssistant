# Agent Capabilities Implementation Plan

This plan implements the five use cases from `agent-capabilities-use-cases.md` to enable intelligent, context-aware AI assistance throughout the home-building journey.

## Implementation Decisions

| Decision | Choice |
|----------|--------|
| **Scope** | All 5 use cases (UC-0 through UC-4) |
| **Web Search** | OpenRouter `:online` model variants (no external API needed) |
| **Fact Confirmation** | Always require user confirmation before saving |
| **Frontend Scope** | Full UI enhancements (citations, dialogs, real-time updates) |

---

## Current State Analysis

### Already Implemented

| Component | File | Status |
|-----------|------|--------|
| OpenRouterService | `backend/app/clients/openrouter_service.py` | Full LLM integration with structured JSON output |
| ChatOrchestrationService | `backend/app/services/chat_orchestration_service.py` | Basic RAG pipeline with agent routing |
| ProjectMemoryService | `backend/app/services/project_memory_service.py` | JSONB memory get/update |
| DocumentRetrievalService | `backend/app/services/document_retrieval_service.py` | Vector similarity search |
| Frontend Views | `frontend/src/components/` | All 12 views complete |

### Gaps to Address

| Use Case | Gap |
|----------|-----|
| UC-0 | Project info NOT injected into prompts |
| UC-1 | Memory format doesn't match spec, no smart truncation |
| UC-2 | No web search capability |
| UC-3 | No agent-driven fact extraction with confirmation |
| UC-4 | Document formatting needs enhancement |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Request                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Context Assembly                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ UC-0: Project│ │ UC-1: Memory │ │UC-4: Documents│ │UC-2: Web Search│ │
│  │    Info      │ │              │ │               │ │  (if needed)   │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Agent Processing                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────────┐ │
│  │Triage Router │ │  Specialized │ │ UC-3: Fact Extractor              │ │
│  │              │─▶│    Agent     │─▶│ (extracts → confirms → stores)  │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Response                                       │
│  ┌──────────────────────┐ ┌──────────────────────────────────────────┐  │
│  │  Assistant Message   │ │  Fact Confirmation Dialog (if facts found)│  │
│  └──────────────────────┘ └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: UC-0 - Project Information Context Injection

**Goal:** Every agent prompt automatically includes core project metadata.

### Backend Changes

#### 1.1 Create ProjectContextService

**New file:** `backend/app/services/project_context_service.py`

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from supabase import Client

@dataclass
class ProjectContext:
    """Project context data for prompt injection."""
    project_id: UUID
    project_name: str
    description: Optional[str]
    location: Optional[str]
    current_phase: str
    status: str  # ACTIVE, PAUSED, COMPLETED
    created_at: datetime
    updated_at: datetime

class ProjectContextService:
    """Fetches and formats project info for prompt injection."""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def get_project_context(self, project_id: UUID) -> ProjectContext:
        """Fetch project details from database."""
        response = (
            self.supabase.table("projects")
            .select("*")
            .eq("id", str(project_id))
            .single()
            .execute()
        )
        
        if not response.data:
            raise ValueError(f"Project {project_id} not found")
        
        data = response.data
        return ProjectContext(
            project_id=data["id"],
            project_name=data["name"],
            description=data.get("description"),
            location=data.get("location"),
            current_phase=data["current_phase"],
            status="ACTIVE" if not data.get("deleted_at") else "DELETED",
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )
    
    def format_context_block(self, ctx: ProjectContext) -> str:
        """Format project info as specified in UC-0."""
        created = ctx.created_at.strftime("%B %d, %Y") if isinstance(ctx.created_at, datetime) else ctx.created_at
        updated = ctx.updated_at.strftime("%B %d, %Y") if isinstance(ctx.updated_at, datetime) else ctx.updated_at
        
        return f"""=== PROJECT CONTEXT ===
Project ID: {ctx.project_id}
Project Name: {ctx.project_name}
Description: {ctx.description or 'Not specified'}
Location: {ctx.location or 'Not specified'}
Current Phase: {ctx.current_phase}
Status: {ctx.status}
Created: {created}
Last Updated: {updated}
======================="""
```

#### 1.2 Update Database Schema (if needed)

Check if `projects` table has `description` field. If not, add migration:

**File:** `supabase/migrations/YYYYMMDD_add_project_description.sql`

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
```

#### 1.3 Update ChatOrchestrationService

**File:** `backend/app/services/chat_orchestration_service.py`

Add project context injection to `_retrieve_context()`:

```python
async def _retrieve_context(
    self,
    project_id: UUID,
    user_message: str,
) -> Dict[str, Any]:
    """Retrieve full RAG context including project info."""
    
    # NEW: Get project context
    project_context = None
    if self.project_context_service:
        try:
            ctx = await self.project_context_service.get_project_context(project_id)
            project_context = self.project_context_service.format_context_block(ctx)
        except Exception as e:
            logger.warning(f"Could not retrieve project context: {e}")
    
    # ... existing code for history, memory, documents ...
    
    return {
        "project_context": project_context,  # NEW
        "chat_history": history_messages,
        "project_memory": project_memory,
        "relevant_documents": relevant_documents,
    }
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `backend/app/services/project_context_service.py` | CREATE |
| `backend/app/services/chat_orchestration_service.py` | MODIFY |
| `backend/app/schemas/project.py` | MODIFY (add description) |
| `supabase/migrations/YYYYMMDD_add_project_description.sql` | CREATE (if needed) |

---

## Phase 2: UC-1 - Enhanced Memory Context Loading

**Goal:** Every agent interaction includes structured project memory with smart truncation.

### Backend Changes

#### 2.1 Define Memory Domain Constants

**New file:** `backend/app/core/memory_domains.py`

```python
"""Memory domain definitions aligned with agent specializations."""

MEMORY_DOMAINS = [
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

# Map agent IDs to their primary memory domains
AGENT_TO_DOMAIN = {
    "LAND_FEASIBILITY_AGENT": "LAND_FEASIBILITY",
    "REGULATORY_PERMITTING_AGENT": "REGULATORY_PERMITTING",
    "ARCHITECTURAL_DESIGN_AGENT": "ARCHITECTURAL_DESIGN",
    "FINANCE_LEGAL_AGENT": "FINANCE_LEGAL",
    "SITE_PREP_FOUNDATION_AGENT": "SITE_PREP_FOUNDATION",
    "SHELL_SYSTEMS_AGENT": "SHELL_SYSTEMS",
    "PROCUREMENT_QUALITY_AGENT": "PROCUREMENT_QUALITY",
    "FINISHES_FURNISHING_AGENT": "FINISHES_FURNISHING",
    "TRIAGE_MEMORY_AGENT": "GENERAL",
}
```

#### 2.2 Enhance Memory Formatting

**File:** `backend/app/services/chat_orchestration_service.py`

```python
import json

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
    
    # Format as JSON
    memory_json = json.dumps(non_empty, indent=2, default=str)
    
    # Truncate if too long (rough estimate: 4 chars per token)
    max_chars = max_tokens * 4
    if len(memory_json) > max_chars:
        memory_json = memory_json[:max_chars] + "\n... (truncated)"
    
    return f"""=== PROJECT MEMORY ===
{memory_json}
======================"""
```

#### 2.3 Update ProjectMemoryService

**File:** `backend/app/services/project_memory_service.py`

Update default memory structure to match new domain names:

```python
def _get_default_memory(self) -> Dict[str, Any]:
    """Get default memory structure with domain keys."""
    return {
        "LAND_FEASIBILITY": {},
        "REGULATORY_PERMITTING": {},
        "ARCHITECTURAL_DESIGN": {},
        "FINANCE_LEGAL": {},
        "SITE_PREP_FOUNDATION": {},
        "SHELL_SYSTEMS": {},
        "PROCUREMENT_QUALITY": {},
        "FINISHES_FURNISHING": {},
        "GENERAL": {},
    }
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `backend/app/core/memory_domains.py` | CREATE |
| `backend/app/services/chat_orchestration_service.py` | MODIFY |
| `backend/app/services/project_memory_service.py` | MODIFY |

---

## Phase 3: UC-2 - Web Search with OpenRouter :online Models

**Goal:** Agents can perform real-time web searches using OpenRouter's `:online` model variants.

### Implementation Approach

Instead of external search APIs, we'll use OpenRouter's `:online` model suffix which enables web search for supported models:
- `openai/gpt-4o:online`
- `anthropic/claude-3.5-sonnet:online`
- `perplexity/sonar-pro` (built-in search)

### Backend Changes

#### 3.1 Add Configuration

**File:** `backend/app/core/config.py`

```python
# Web Search settings (using OpenRouter :online models)
openrouter_web_search_model: str = "openai/gpt-4o-mini:online"
web_search_enabled: bool = True
web_search_max_results: int = 5
```

#### 3.2 Create WebSearchService

**New file:** `backend/app/services/web_search_service.py`

```python
"""
Web Search Service using OpenRouter :online models.

Uses OpenRouter's built-in web search capability via :online model suffix.
No external API keys required.
"""

import logging
from dataclasses import dataclass
from typing import List, Optional
from uuid import UUID

from app.clients.openrouter_service import OpenRouterService
from app.schemas.openrouter import ModelParams

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Represents a web search result."""
    title: str
    snippet: str
    url: str
    source: str


class WebSearchService:
    """
    Handles web searches using OpenRouter :online models.
    
    The :online suffix enables web search for compatible models,
    with results automatically integrated into the response.
    """
    
    # Keywords that trigger web search
    SEARCH_TRIGGERS = {
        "pricing": ["current price", "cost today", "rates in", "average cost", "how much does"],
        "regulations": ["building code", "permit requirement", "zoning", "regulation in", "legal requirement"],
        "contractors": ["contractor near", "builder in", "find a", "recommend a", "supplier in"],
        "market": ["market trend", "availability", "shortage", "current market"],
        "current_info": ["latest", "current", "2024", "2025", "2026", "recent", "now"],
    }
    
    def __init__(
        self,
        openrouter_service: OpenRouterService,
        search_model: str = "openai/gpt-4o-mini:online",
    ):
        self.openrouter_service = openrouter_service
        self.search_model = search_model
    
    def should_search(self, query: str, project_location: Optional[str] = None) -> bool:
        """Determine if web search would be helpful for this query."""
        query_lower = query.lower()
        
        for category, triggers in self.SEARCH_TRIGGERS.items():
            for trigger in triggers:
                if trigger in query_lower:
                    logger.info(f"Web search triggered by '{trigger}' (category: {category})")
                    return True
        
        return False
    
    async def search_and_respond(
        self,
        query: str,
        project_context: Optional[str] = None,
        location: Optional[str] = None,
    ) -> str:
        """
        Execute web search via :online model and return synthesized response.
        
        The :online model automatically searches the web and includes
        citations in its response.
        """
        # Build search-optimized prompt
        system_prompt = """You are a research assistant helping with home building questions.
Search the web for current, accurate information.
Always cite your sources with URLs when providing information from search results.
Focus on information relevant to the user's location if specified."""
        
        # Enhance query with location context
        enhanced_query = query
        if location:
            enhanced_query = f"{query} (Location: {location})"
        
        if project_context:
            enhanced_query = f"{project_context}\n\nQuestion: {enhanced_query}"
        
        try:
            result = await self.openrouter_service.chat_completion(
                user_message=enhanced_query,
                system_message=system_prompt,
                model=self.search_model,
                params=ModelParams(temperature=0.3, max_tokens=1000),
            )
            
            logger.info(f"Web search completed via {self.search_model}")
            return result.content
            
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            raise
    
    def extract_citations(self, response: str) -> List[str]:
        """Extract URLs from response for citation display."""
        import re
        url_pattern = r'https?://[^\s\)\]<>\"\']+(?=[^\s\)\]<>\"\']*)'
        urls = re.findall(url_pattern, response)
        return list(set(urls))  # Deduplicate
```

#### 3.3 Integrate into ChatOrchestrationService

**File:** `backend/app/services/chat_orchestration_service.py`

```python
async def _maybe_web_search(
    self,
    user_message: str,
    context: Dict[str, Any],
) -> Optional[str]:
    """Execute web search if query requires current information."""
    if not self.web_search_service:
        return None
    
    # Get location from project context
    location = None
    if context.get("project_context"):
        # Extract location from context string
        import re
        match = re.search(r"Location: ([^\n]+)", context["project_context"])
        if match:
            location = match.group(1)
    
    if self.web_search_service.should_search(user_message, location):
        logger.info("Executing web search for current information")
        try:
            search_result = await self.web_search_service.search_and_respond(
                query=user_message,
                project_context=context.get("project_context"),
                location=location,
            )
            return search_result
        except Exception as e:
            logger.warning(f"Web search failed, continuing without: {e}")
    
    return None
```

#### 3.4 Add Web Search Results to Context

Update `_execute_agent()` to include web search results:

```python
# In _execute_agent method, after building context_parts:

# 4. Add web search results if available
if context.get("web_search_results"):
    context_parts.append(
        f"=== WEB SEARCH RESULTS ===\n{context['web_search_results']}\n"
        "Note: Information above is from recent web search. Cite sources when using."
    )
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `backend/app/services/web_search_service.py` | CREATE |
| `backend/app/core/config.py` | MODIFY |
| `backend/app/services/chat_orchestration_service.py` | MODIFY |

---

## Phase 4: UC-3 - Fact Extraction with User Confirmation

**Goal:** Agents extract facts from conversations and documents, always requiring user confirmation before saving.

### Backend Changes

#### 4.1 Create Fact Extraction Schemas

**New file:** `backend/app/schemas/fact_extraction.py`

```python
"""Schemas for fact extraction and confirmation."""

from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.memory_domains import MEMORY_DOMAINS


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
    key: str = Field(..., description="Fact key/name")
    value: str = Field(..., description="Fact value")
    confidence: float = Field(..., ge=0, le=1, description="Extraction confidence")
    source: str = Field(..., description="Source: 'conversation' or document filename")
    reasoning: Optional[str] = Field(None, description="Why this fact was extracted")


class FactExtractionResult(BaseModel):
    """Result of fact extraction from content."""
    facts: List[ExtractedFact] = Field(default_factory=list)
    has_facts: bool = Field(default=False)


class FactConfirmationRequest(BaseModel):
    """Request to confirm and store extracted facts."""
    project_id: UUID
    confirmed_fact_ids: List[str] = Field(..., description="IDs of facts user confirmed")
    rejected_fact_ids: List[str] = Field(default_factory=list, description="IDs user rejected")


class FactConfirmationResponse(BaseModel):
    """Response after storing confirmed facts."""
    stored_count: int
    rejected_count: int
    updated_domains: List[str]


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
                    },
                    "key": {"type": "string"},
                    "value": {"type": "string"},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                    "reasoning": {"type": "string"},
                },
                "required": ["domain", "key", "value", "confidence"],
            },
        },
    },
    "required": ["facts"],
}
```

#### 4.2 Create FactExtractionService

**New file:** `backend/app/services/fact_extraction_service.py`

```python
"""
Fact Extraction Service

Extracts structured facts from conversations and documents using LLM,
with user confirmation before storing.
"""

import logging
import uuid
from typing import List, Optional
from uuid import UUID

from app.clients.openrouter_service import OpenRouterService
from app.schemas.fact_extraction import (
    ExtractedFact,
    FactExtractionResult,
    FACT_EXTRACTION_SCHEMA,
)
from app.schemas.openrouter import ModelParams
from app.services.project_memory_service import ProjectMemoryService

logger = logging.getLogger(__name__)


class FactExtractionService:
    """
    Extracts facts from conversations and documents.
    
    All extracted facts require user confirmation before being stored
    in project memory.
    """
    
    EXTRACTION_PROMPT = """You are a fact extraction assistant for a home building project.

Analyze the conversation and extract any concrete, actionable facts that should be remembered for this project.

Focus on extracting:
- Budget and financial information (amounts, loan details, payment terms)
- Contractor/vendor information (names, contacts, specialties, quotes)
- Location details (address, municipality, county, state)
- Timeline information (start dates, milestones, deadlines)
- Design decisions (materials, specifications, room counts)
- Permit/regulatory information (permit numbers, requirements, approvals)
- Technical specifications (lot size, square footage, setbacks)

Do NOT extract:
- General questions or hypotheticals
- Information that's clearly still being discussed/undecided
- Advice given by the assistant (extract user-provided facts only)

For each fact, specify:
- domain: The memory category it belongs to
- key: A short descriptive key (e.g., "general_contractor", "total_budget")
- value: The actual value (be specific)
- confidence: How confident you are this is a definite fact (0-1)
- reasoning: Why you extracted this fact

Return empty facts array if no concrete facts are found."""

    def __init__(
        self,
        openrouter_service: OpenRouterService,
        memory_service: ProjectMemoryService,
    ):
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
            result, _ = await self.openrouter_service.chat_completion_json(
                user_message=content_to_analyze,
                system_message=self.EXTRACTION_PROMPT,
                schema_name="fact_extraction",
                schema=FACT_EXTRACTION_SCHEMA,
                params=ModelParams(temperature=0.1, max_tokens=1000),
            )
            
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
            logger.error(f"Fact extraction failed: {e}")
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
        
        logger.info(
            f"Stored {len(facts)} facts in domains: {list(updates_by_domain.keys())}"
        )
        
        return {
            "stored_count": len(facts),
            "updated_domains": list(updates_by_domain.keys()),
        }
```

#### 4.3 Create Fact Confirmation API Endpoint

**New file:** `backend/app/api/facts.py`

```python
"""
Facts API Router

Endpoints for fact extraction and confirmation:
- POST /api/projects/{project_id}/facts/confirm - Confirm and store extracted facts
"""

import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.api.dependencies import get_current_user, verify_project_ownership, get_openrouter_service
from app.clients.openrouter_service import OpenRouterService
from app.db import Project, get_supabase
from app.schemas.fact_extraction import (
    ExtractedFact,
    FactConfirmationRequest,
    FactConfirmationResponse,
)
from app.services.fact_extraction_service import FactExtractionService
from app.services.project_memory_service import get_project_memory_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/facts", tags=["facts"])


@router.post(
    "/confirm",
    response_model=FactConfirmationResponse,
    summary="Confirm and store extracted facts",
)
async def confirm_facts(
    project_id: UUID,
    request: FactConfirmationRequest,
    facts: List[ExtractedFact],  # Passed from frontend state
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    openrouter_service: OpenRouterService = Depends(get_openrouter_service),
    supabase: Client = Depends(get_supabase),
):
    """
    Confirm and store user-approved facts in project memory.
    
    Frontend sends the full list of extracted facts along with
    IDs of confirmed/rejected facts. Only confirmed facts are stored.
    """
    memory_service = get_project_memory_service(supabase)
    fact_service = FactExtractionService(openrouter_service, memory_service)
    
    # Filter to only confirmed facts
    confirmed_facts = [f for f in facts if f.id in request.confirmed_fact_ids]
    
    result = await fact_service.store_confirmed_facts(
        project_id=project_id,
        facts=confirmed_facts,
    )
    
    return FactConfirmationResponse(
        stored_count=result["stored_count"],
        rejected_count=len(request.rejected_fact_ids),
        updated_domains=result["updated_domains"],
    )
```

#### 4.4 Update ChatOrchestrationService for Fact Extraction

**File:** `backend/app/services/chat_orchestration_service.py`

Add fact extraction after generating response:

```python
async def process_chat(self, ...) -> Dict[str, Any]:
    # ... existing code ...
    
    # Step 4: Execute specialized agent
    assistant_content = await self._execute_agent(...)
    
    # Step 5: Extract facts (NEW)
    extracted_facts = None
    if self.fact_extraction_service:
        try:
            extraction_result = await self.fact_extraction_service.extract_facts(
                user_message=content,
                assistant_response=assistant_content,
                source="conversation",
            )
            if extraction_result.has_facts:
                extracted_facts = [f.model_dump() for f in extraction_result.facts]
        except Exception as e:
            logger.warning(f"Fact extraction failed: {e}")
    
    # Step 6: Store assistant message (existing)
    # ...
    
    # Step 7: Return response with extracted facts
    response = {
        # ... existing fields ...
        "extracted_facts": extracted_facts,  # NEW: Facts for confirmation
    }
```

### Frontend Changes

#### 4.5 Create Fact Confirmation Dialog

**New file:** `frontend/src/components/chat/FactConfirmationDialog.tsx`

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface ExtractedFact {
  id: string;
  domain: string;
  key: string;
  value: string;
  confidence: number;
  reasoning?: string;
}

interface FactConfirmationDialogProps {
  facts: ExtractedFact[];
  open: boolean;
  onConfirm: (confirmedIds: string[], rejectedIds: string[]) => void;
  onClose: () => void;
}

export function FactConfirmationDialog({
  facts,
  open,
  onConfirm,
  onClose,
}: FactConfirmationDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(facts.map((f) => f.id)) // Default all selected
  );

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const confirmedIds = Array.from(selectedIds);
    const rejectedIds = facts
      .filter((f) => !selectedIds.has(f.id))
      .map((f) => f.id);
    onConfirm(confirmedIds, rejectedIds);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save Project Facts?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            I found some information that might be useful to remember.
            Select which facts to save to your project.
          </p>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="flex items-start gap-3 p-3 border rounded-lg"
            >
              <Checkbox
                checked={selectedIds.has(fact.id)}
                onCheckedChange={() => handleToggle(fact.id)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{fact.domain}</Badge>
                  <span className="font-medium">{fact.key}</span>
                </div>
                <p className="text-sm">{fact.value}</p>
                {fact.reasoning && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {fact.reasoning}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Skip
          </Button>
          <Button onClick={handleConfirm}>
            Save {selectedIds.size} Fact{selectedIds.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 4.6 Update Chat Response Handling

**File:** `frontend/src/hooks/useProjectChat.ts`

Add fact confirmation state and handlers:

```typescript
interface ChatResponse {
  // ... existing fields ...
  extracted_facts?: ExtractedFact[];
}

export function useProjectChat(projectId: string) {
  const [pendingFacts, setPendingFacts] = useState<ExtractedFact[] | null>(null);
  
  const sendMessage = async (content: string) => {
    // ... existing send logic ...
    
    const response = await api.post<ChatResponse>(`/projects/${projectId}/chat`, {
      content,
    });
    
    // Check for extracted facts
    if (response.data.extracted_facts?.length) {
      setPendingFacts(response.data.extracted_facts);
    }
    
    // ... rest of handling ...
  };
  
  const confirmFacts = async (confirmedIds: string[], rejectedIds: string[]) => {
    if (!pendingFacts) return;
    
    await api.post(`/projects/${projectId}/facts/confirm`, {
      confirmed_fact_ids: confirmedIds,
      rejected_fact_ids: rejectedIds,
    }, {
      // Include facts in request body
      facts: pendingFacts,
    });
    
    setPendingFacts(null);
  };
  
  return {
    // ... existing returns ...
    pendingFacts,
    confirmFacts,
    dismissFacts: () => setPendingFacts(null),
  };
}
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `backend/app/schemas/fact_extraction.py` | CREATE |
| `backend/app/services/fact_extraction_service.py` | CREATE |
| `backend/app/api/facts.py` | CREATE |
| `backend/app/services/chat_orchestration_service.py` | MODIFY |
| `backend/app/api/__init__.py` | MODIFY (register router) |
| `frontend/src/components/chat/FactConfirmationDialog.tsx` | CREATE |
| `frontend/src/hooks/useProjectChat.ts` | MODIFY |
| `frontend/src/components/chat/ProjectChatView.tsx` | MODIFY |

---

## Phase 5: UC-4 - Enhanced Document Reading

**Goal:** Improve document retrieval formatting and add fact extraction triggers.

### Backend Changes

#### 5.1 Enhance Document Formatting

**File:** `backend/app/services/chat_orchestration_service.py`

```python
def _format_documents(self, documents: List[Dict[str, Any]]) -> str:
    """Format document chunks per UC-4 spec with full metadata."""
    if not documents:
        return ""
    
    lines = ["=== RETRIEVED DOCUMENTS ==="]
    
    for i, doc in enumerate(documents, 1):
        source = doc.get("source", "Unknown")
        content = doc.get("content", "")
        similarity = doc.get("similarity", 0)
        chunk_index = doc.get("chunk_index", "?")
        total_chunks = doc.get("total_chunks", "?")
        upload_date = doc.get("upload_date", "Unknown date")
        
        lines.append(f"""
---
Document {i}: "{source}" (uploaded {upload_date})
Chunk {chunk_index} of {total_chunks}, Relevance: {similarity:.2f}

"{content}"
---""")
    
    lines.append("===========================")
    lines.append("Note: Cite document sources when referencing this information.")
    
    return "\n".join(lines)
```

#### 5.2 Add Document Metadata to Retrieval

**File:** `backend/app/services/document_retrieval_service.py`

Enhance `DocumentChunk` to include more metadata:

```python
@dataclass
class DocumentChunk:
    """Represents a document chunk with full metadata."""
    id: UUID
    document_id: UUID
    content: str
    chunk_index: int
    total_chunks: int  # NEW
    metadata: dict
    similarity: float = 0.0
    upload_date: Optional[str] = None  # NEW
    filename: Optional[str] = None  # NEW
```

Update `_vector_search` to include this metadata.

#### 5.3 Add Document Search Triggers

**File:** `backend/app/services/chat_orchestration_service.py`

```python
DOCUMENT_SEARCH_TRIGGERS = [
    "contract", "permit", "quote", "estimate", "agreement",
    "according to", "what does my", "document", "uploaded",
    "in the file", "says about", "my documents", "check if",
]

def _should_search_documents(self, user_message: str) -> bool:
    """Determine if document search is relevant for this query."""
    message_lower = user_message.lower()
    return any(trigger in message_lower for trigger in DOCUMENT_SEARCH_TRIGGERS)
```

### Frontend Changes

#### 5.4 Create Document Citation Component

**New file:** `frontend/src/components/chat/DocumentCitation.tsx`

```tsx
import { FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocumentCitationProps {
  filename: string;
  documentId: string;
  projectId: string;
  chunkIndex?: number;
  relevance?: number;
}

export function DocumentCitation({
  filename,
  documentId,
  projectId,
  chunkIndex,
  relevance,
}: DocumentCitationProps) {
  const href = `/projects/${projectId}/files/${documentId}${
    chunkIndex ? `#chunk-${chunkIndex}` : ""
  }`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
    >
      <FileText className="h-3 w-3" />
      <span className="max-w-[150px] truncate">{filename}</span>
      {relevance !== undefined && (
        <Badge variant="secondary" className="text-[10px] px-1">
          {Math.round(relevance * 100)}%
        </Badge>
      )}
      <ExternalLink className="h-3 w-3 opacity-50" />
    </a>
  );
}
```

### Files to Modify

| File | Action |
|------|--------|
| `backend/app/services/chat_orchestration_service.py` | MODIFY |
| `backend/app/services/document_retrieval_service.py` | MODIFY |
| `frontend/src/components/chat/DocumentCitation.tsx` | CREATE |
| `frontend/src/components/chat/ChatThread.tsx` | MODIFY |

---

## Phase 6: Unified Prompt Template

**Goal:** Create standardized prompt structure used by all agents.

### Backend Implementation

**New file:** `backend/app/core/prompt_templates.py`

```python
"""
Unified prompt templates for all agents.

Ensures consistent structure across all agent interactions
with proper context injection.
"""

LEGAL_DISCLAIMER = """
IMPORTANT DISCLAIMER:
I am an AI assistant providing general guidance and information.
This is NOT professional advice. Always consult licensed professionals
(architects, contractors, lawyers, financial advisors) for decisions
regarding construction, legal matters, and financial commitments.
"""

AGENT_PROMPT_TEMPLATE = """
{agent_instructions}

{legal_disclaimer}

{project_context}

{project_memory}

{retrieved_documents}

{web_search_results}

{chat_history}

[USER MESSAGE]
{user_query}
"""


def build_agent_prompt(
    agent_instructions: str,
    project_context: str = "",
    project_memory: str = "",
    retrieved_documents: str = "",
    web_search_results: str = "",
    chat_history: str = "",
    user_query: str = "",
    include_disclaimer: bool = True,
) -> str:
    """
    Build a complete agent prompt with all context sections.
    
    Sections are only included if they have content.
    """
    sections = []
    
    # Agent instructions (always present)
    sections.append(f"[SYSTEM INSTRUCTIONS]\n{agent_instructions}")
    
    # Legal disclaimer
    if include_disclaimer:
        sections.append(LEGAL_DISCLAIMER)
    
    # Project context (UC-0)
    if project_context:
        sections.append(project_context)
    
    # Project memory (UC-1)
    if project_memory:
        sections.append(project_memory)
    
    # Retrieved documents (UC-4)
    if retrieved_documents:
        sections.append(retrieved_documents)
    
    # Web search results (UC-2)
    if web_search_results:
        sections.append(web_search_results)
    
    # Chat history
    if chat_history:
        sections.append(f"[RECENT CONVERSATION]\n{chat_history}")
    
    # User query
    sections.append(f"[USER MESSAGE]\n{user_query}")
    
    return "\n\n".join(sections)
```

### Files to Create

| File | Action |
|------|--------|
| `backend/app/core/prompt_templates.py` | CREATE |

---

## Phase 7: Frontend Enhancements

### 7.1 Context Indicators

**New file:** `frontend/src/components/chat/ContextIndicator.tsx`

```tsx
import { Brain, FileText, Globe, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContextIndicatorProps {
  usedMemory: boolean;
  usedDocuments: boolean;
  usedWebSearch: boolean;
  documentCount?: number;
}

export function ContextIndicator({
  usedMemory,
  usedDocuments,
  usedWebSearch,
  documentCount = 0,
}: ContextIndicatorProps) {
  if (!usedMemory && !usedDocuments && !usedWebSearch) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
      <Info className="h-3 w-3" />
      <span>Used:</span>
      
      {usedMemory && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
              <Brain className="h-3 w-3" />
              Memory
            </span>
          </TooltipTrigger>
          <TooltipContent>Project facts from memory</TooltipContent>
        </Tooltip>
      )}
      
      {usedDocuments && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              <FileText className="h-3 w-3" />
              {documentCount} Doc{documentCount !== 1 ? "s" : ""}
            </span>
          </TooltipTrigger>
          <TooltipContent>Retrieved from uploaded documents</TooltipContent>
        </Tooltip>
      )}
      
      {usedWebSearch && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
              <Globe className="h-3 w-3" />
              Web
            </span>
          </TooltipTrigger>
          <TooltipContent>Searched the web for current info</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
```

### 7.2 Fact Update Notification

**New file:** `frontend/src/components/chat/FactUpdateNotification.tsx`

```tsx
import { CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FactUpdateNotificationProps {
  storedCount: number;
  domains: string[];
  projectId: string;
}

export function FactUpdateNotification({
  storedCount,
  domains,
  projectId,
}: FactUpdateNotificationProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm">
      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      <div className="flex-1">
        <p className="font-medium text-green-800 dark:text-green-200">
          {storedCount} fact{storedCount !== 1 ? "s" : ""} saved
        </p>
        <p className="text-green-700 dark:text-green-300 text-xs">
          Updated: {domains.join(", ")}
        </p>
      </div>
      <Button variant="ghost" size="sm" asChild>
        <a href={`/projects/${projectId}/facts`}>
          View Facts
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </Button>
    </div>
  );
}
```

### 7.3 Update Message Schema

**File:** `frontend/src/types/api.ts`

```typescript
interface ChatResponseMetadata {
  used_memory: boolean;
  used_documents: boolean;
  used_web_search: boolean;
  document_count: number;
  citations?: Citation[];
}

interface Citation {
  type: "document" | "web";
  title: string;
  url?: string;
  document_id?: string;
  relevance?: number;
}

interface ChatResponse {
  id: string;
  role: "assistant";
  content: string;
  agent_id: string;
  routing_metadata: RoutingMetadata;
  context_metadata?: ChatResponseMetadata;  // NEW
  extracted_facts?: ExtractedFact[];  // NEW
  created_at: string;
}
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `frontend/src/components/chat/ContextIndicator.tsx` | CREATE |
| `frontend/src/components/chat/FactUpdateNotification.tsx` | CREATE |
| `frontend/src/components/chat/index.ts` | MODIFY |
| `frontend/src/types/api.ts` | MODIFY |
| `frontend/src/components/chat/ChatThread.tsx` | MODIFY |

---

## Configuration Summary

### Backend Configuration Additions

**File:** `backend/app/core/config.py`

```python
class Settings(BaseSettings):
    # ... existing settings ...
    
    # Web Search (using OpenRouter :online models)
    openrouter_web_search_model: str = "openai/gpt-4o-mini:online"
    web_search_enabled: bool = True
    
    # Fact Extraction
    fact_extraction_enabled: bool = True
    fact_extraction_model: str = "openai/gpt-4o-mini"
    
    # Context Limits
    max_memory_tokens: int = 2000
    max_document_tokens: int = 2000
    max_history_messages: int = 10
    max_document_chunks: int = 5
```

---

## Testing Strategy

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `tests/test_project_context_service.py` | Project context fetching and formatting |
| `tests/test_web_search_service.py` | Search triggers, query optimization |
| `tests/test_fact_extraction_service.py` | Fact extraction, validation, storage |
| `tests/test_prompt_templates.py` | Prompt building with all sections |

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `tests/test_chat_with_context.py` | Full chat pipeline with all context types |
| `tests/test_fact_confirmation_flow.py` | Extract → confirm → store flow |

### E2E Tests (Frontend)

| Test | Coverage |
|------|----------|
| Fact confirmation dialog | User can select/deselect facts |
| Context indicators | Shows correct context usage |
| Document citations | Links to document detail |

---

## Implementation Order

| Phase | Use Case | Priority | Estimated Effort |
|-------|----------|----------|------------------|
| 1 | UC-0: Project Context | Critical | Small |
| 2 | UC-1: Memory Enhancement | Critical | Small |
| 3 | UC-4: Document Enhancement | High | Small |
| 4 | UC-3: Fact Extraction | High | Medium |
| 5 | UC-2: Web Search | High | Medium |
| 6 | Prompt Template | Medium | Small |
| 7 | Frontend Enhancements | Medium | Medium |

**Recommended order:** 1 → 2 → 3 → 6 → 4 → 5 → 7

This order ensures:
1. Foundation (context/memory) is solid before adding features
2. Document enhancement is quick win
3. Prompt template ready before fact extraction
4. Web search can be added independently
5. Frontend updates after backend is stable

---

## File Summary

### New Files to Create

| File | Phase |
|------|-------|
| `backend/app/services/project_context_service.py` | 1 |
| `backend/app/core/memory_domains.py` | 2 |
| `backend/app/services/web_search_service.py` | 5 |
| `backend/app/schemas/fact_extraction.py` | 4 |
| `backend/app/services/fact_extraction_service.py` | 4 |
| `backend/app/api/facts.py` | 4 |
| `backend/app/core/prompt_templates.py` | 6 |
| `frontend/src/components/chat/FactConfirmationDialog.tsx` | 4 |
| `frontend/src/components/chat/DocumentCitation.tsx` | 3 |
| `frontend/src/components/chat/ContextIndicator.tsx` | 7 |
| `frontend/src/components/chat/FactUpdateNotification.tsx` | 7 |

### Files to Modify

| File | Phases |
|------|--------|
| `backend/app/services/chat_orchestration_service.py` | 1, 2, 3, 4, 5 |
| `backend/app/services/project_memory_service.py` | 2 |
| `backend/app/services/document_retrieval_service.py` | 3 |
| `backend/app/core/config.py` | 5 |
| `backend/app/api/__init__.py` | 4 |
| `frontend/src/hooks/useProjectChat.ts` | 4, 7 |
| `frontend/src/components/chat/ChatThread.tsx` | 3, 7 |
| `frontend/src/components/chat/ProjectChatView.tsx` | 4, 7 |
| `frontend/src/types/api.ts` | 7 |
