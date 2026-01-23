## 📄 Agent Capabilities Use Cases

### Overview

This document defines detailed use cases for core agent capabilities that enable intelligent, context-aware assistance throughout the home-building journey.

---

### UC-0: 🏠 Project Information Context Injection

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-PROJ-001 |
| **Title** | Automatic Project Information Loading |
| **Primary Actor** | Python Backend |
| **Secondary Actors** | User, AI Agent, Supabase Database |
| **Description** | Every agent prompt automatically includes core project metadata and information, ensuring the agent always knows which project it's assisting with and has access to essential project details. |

#### Preconditions

| # | Condition |
| :--- | :--- |
| 1 | User is authenticated via Supabase Auth. |
| 2 | User has selected an active project (or has only one project). |
| 3 | Project record exists in the `projects` table. |

#### Main Flow

| Step | Actor | Action |
| :--- | :--- | :--- |
| 1 | User | Sends any message via chat interface. |
| 2 | Python Backend | Identifies the active project from session/request context. |
| 3 | Python Backend | Fetches project record from Supabase `projects` table. |
| 4 | Python Backend | Constructs project context block with essential metadata. |
| 5 | Python Backend | Injects project context at the beginning of every agent prompt. |
| 6 | Agent | Receives prompt with project context, enabling project-aware responses. |
| 7 | Agent | References project information naturally in responses (e.g., "For your Lakeside Home project..."). |

#### Project Information Schema

| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **project_id** | UUID | Unique project identifier | `a1b2c3d4-...` |
| **project_name** | String | User-defined project name | "Lakeside Family Home" |
| **description** | String | Optional project description | "3BR/2BA single-family home" |
| **location** | Object | Project location details | `{ city, state, country, address }` |
| **created_at** | Timestamp | Project creation date | `2025-01-15T10:30:00Z` |
| **updated_at** | Timestamp | Last modification date | `2025-01-22T14:00:00Z` |
| **current_phase** | Enum | Current construction phase | "DESIGN" |
| **status** | Enum | Project status | "ACTIVE" |
| **owner_id** | UUID | Project owner user ID | `x1y2z3...` |

#### Project Context Format (Injected to Prompt)

```
=== PROJECT CONTEXT ===
Project ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Project Name: Lakeside Family Home
Description: 3BR/2BA single-family home on lakefront property
Location: 123 Lake View Dr, Austin, TX 78701
Current Phase: DESIGN
Status: ACTIVE
Created: January 15, 2025
Last Updated: January 22, 2025
=======================
```

#### Prompt Structure with Project Context

```
[SYSTEM INSTRUCTIONS]
You are a specialized home-building assistant...

[PROJECT CONTEXT - ALWAYS PRESENT]
{project_info_block}

[PROJECT MEMORY - AUTO-INJECTED (UC-1)]
{project_memory_json}

[RETRIEVED DOCUMENTS - IF APPLICABLE (UC-4)]
{document_chunks}

[WEB SEARCH RESULTS - IF APPLICABLE (UC-2)]
{web_search_results}

[CONVERSATION HISTORY]
{recent_messages}

[USER MESSAGE]
{user_query}
```

#### Project Phase Values

| Phase ID | Phase Name | Description |
| :--- | :--- | :--- |
| PLANNING | Planning & Research | Initial research, land search, feasibility |
| LAND_ACQUISITION | Land Acquisition | Purchasing land, due diligence |
| PERMITTING | Permitting & Approvals | Zoning, permits, regulatory approvals |
| DESIGN | Design & Architecture | Architectural plans, engineering |
| FINANCING | Financing | Loans, budgeting, insurance |
| SITE_PREP | Site Preparation | Excavation, grading, utilities |
| FOUNDATION | Foundation | Foundation construction |
| FRAMING | Framing & Structure | Framing, roofing, exterior |
| SYSTEMS | Systems Rough-In | HVAC, plumbing, electrical rough-in |
| FINISHES | Interior Finishes | Drywall, flooring, fixtures |
| LANDSCAPING | Landscaping | Exterior finishing, landscaping |
| FINAL | Final Inspection | Punch list, final inspections, CO |
| COMPLETE | Complete | Project completed, moved in |

#### Alternative Flows

| ID | Condition | Action |
| :--- | :--- | :--- |
| AF-1 | No project selected | Prompt user to select or create a project before proceeding. |
| AF-2 | Project not found (deleted) | Return error, redirect to project selection. |
| AF-3 | User has multiple projects | Use project ID from current chat session context. |
| AF-4 | Project info fetch fails | Log error, attempt retry, show graceful error message. |
| AF-5 | New user (no projects) | Redirect to project creation flow, agent assists with setup. |

#### Postconditions

| # | Condition |
| :--- | :--- |
| 1 | Every agent prompt contains current project information. |
| 2 | Agent responses reference correct project by name. |
| 3 | Agent understands current phase and tailors advice accordingly. |
| 4 | Project context is consistent across all agent interactions. |

#### Success Criteria

| Metric | Target |
| :--- | :--- |
| Project Context Load Rate | 100% of requests include project context |
| Project Info Freshness | Context reflects updates within 1 second |
| Correct Project Reference | Agent references correct project in 100% of responses |
| Context Load Latency | < 100ms |

#### Integration with Other Use Cases

| Use Case | Relationship |
| :--- | :--- |
| **UC-1: Read Memory** | Memory is scoped to project_id from project context |
| **UC-2: Web Search** | Location from project context used for local searches |
| **UC-3: Update Facts** | Updates are stored against project_id from context |
| **UC-4: Read Documents** | Document search is scoped to project_id |

---

### UC-1: 🧠 Always Read Memory to Prompt

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-MEM-001 |
| **Title** | Automatic Memory Context Loading |
| **Primary Actor** | AI Agent (Orchestrator / Sub-Agent) |
| **Secondary Actors** | User, Python Backend, Supabase Database |
| **Description** | Every agent interaction automatically retrieves and includes the user's complete project memory (structured facts) in the prompt context before generating a response. |

#### Preconditions

| # | Condition |
| :--- | :--- |
| 1 | User is authenticated and has an active project selected. |
| 2 | Project memory exists in Supabase PostgreSQL (JSONB format). |
| 3 | Backend API endpoint for memory retrieval is operational. |

#### Main Flow

| Step | Actor | Action |
| :--- | :--- | :--- |
| 1 | User | Sends a message/query via chat interface. |
| 2 | Python Backend | Intercepts the incoming message before agent processing. |
| 3 | Python Backend | Fetches complete structured memory JSON for the user's active project from Supabase. |
| 4 | Python Backend | Constructs the agent prompt with memory context injected in a standardized format. |
| 5 | Agent | Receives prompt containing: (a) System instructions, (b) Project Memory, (c) User message. |
| 6 | Agent | Processes query with full awareness of project context (budget, location, timeline, contractors, etc.). |
| 7 | Agent | Generates contextually relevant response referencing known project facts. |

#### Memory Context Format

```json
{
  "project_id": "uuid",
  "project_name": "string",
  "memory": {
    "LAND_FEASIBILITY": { ... },
    "REGULATORY_PERMITTING": { ... },
    "ARCHITECTURAL_DESIGN": { ... },
    "FINANCE_LEGAL": { ... },
    "SITE_PREP_FOUNDATION": { ... },
    "SHELL_SYSTEMS": { ... },
    "PROCUREMENT_QUALITY": { ... },
    "FINISHES_FURNISHING": { ... },
    "GENERAL": {
      "location": "string",
      "budget": "number",
      "timeline": "string",
      "current_phase": "string"
    }
  },
  "last_updated": "timestamp"
}
```

#### Alternative Flows

| ID | Condition | Action |
| :--- | :--- | :--- |
| AF-1 | No project memory exists (new project) | Backend returns empty memory template; agent proceeds with onboarding flow. |
| AF-2 | Memory retrieval fails (DB error) | Backend logs error, returns cached memory if available, or notifies user of temporary issue. |
| AF-3 | Memory exceeds token limit | Backend applies smart truncation: prioritize recent entries, current phase data, and query-relevant sections. |

#### Postconditions

| # | Condition |
| :--- | :--- |
| 1 | Agent response reflects awareness of all stored project facts. |
| 2 | No contradictions between response and known project data. |
| 3 | Memory retrieval latency is logged for performance monitoring. |

#### Success Criteria

| Metric | Target |
| :--- | :--- |
| Memory Load Success Rate | ≥ 99.5% |
| Memory Retrieval Latency | < 200ms |
| Context Relevance | Agent correctly references project facts in ≥ 95% of applicable responses |

---

### UC-2: 🌐 Model Web Search Capability

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-WEB-001 |
| **Title** | Real-Time Web Search for Current Information |
| **Primary Actor** | AI Agent (Orchestrator / Sub-Agent) |
| **Secondary Actors** | User, Python Backend, Web Search API (Google/Bing/SerpAPI) |
| **Description** | Agents can perform real-time web searches to retrieve current information about regulations, prices, contractors, materials, and best practices that may not be in training data or project memory. |

#### Preconditions

| # | Condition |
| :--- | :--- |
| 1 | Web Search API credentials are configured and valid. |
| 2 | User's project location is known (for location-specific searches). |
| 3 | Agent has determined that web search is needed (query requires current/external data). |

#### Main Flow

| Step | Actor | Action |
| :--- | :--- | :--- |
| 1 | User | Asks a question requiring current/external information (e.g., "What are current lumber prices in my area?"). |
| 2 | Agent | Analyzes query and determines web search is necessary (info not in memory, requires current data). |
| 3 | Agent | Formulates optimized search query incorporating relevant context (location, specific terms). |
| 4 | Python Backend | Executes web search via configured API (Google Search, SerpAPI, Bing). |
| 5 | Python Backend | Returns top N search results (title, snippet, URL, date). |
| 6 | Agent | Processes search results, evaluates source credibility, extracts relevant information. |
| 7 | Agent | Synthesizes response combining web findings with project memory context. |
| 8 | Agent | Cites sources when presenting web-sourced information. |

#### Web Search Trigger Conditions

| Trigger Type | Examples |
| :--- | :--- |
| **Current Prices/Costs** | "Current lumber prices", "Average contractor rates in [location]" |
| **Local Regulations** | "Building codes in [city]", "Permit requirements for [county]" |
| **Contractor/Vendor Lookup** | "Foundation contractors near [location]", "Building material suppliers" |
| **Best Practices/Standards** | "Latest energy efficiency standards", "2025 building code updates" |
| **Market Conditions** | "Housing market trends", "Construction material availability" |

#### Search Query Optimization

| Factor | Implementation |
| :--- | :--- |
| **Location Injection** | Automatically append user's city/county/state to location-relevant queries. |
| **Recency Filtering** | Prioritize results from last 12 months for regulatory/pricing queries. |
| **Domain Filtering** | Prefer authoritative sources (.gov, industry associations, verified contractors). |
| **Query Reformulation** | Agent may reformulate ambiguous queries for better results. |

#### Alternative Flows

| ID | Condition | Action |
| :--- | :--- | :--- |
| AF-1 | Web search returns no results | Agent acknowledges limitation, suggests alternative query, or provides general guidance. |
| AF-2 | Web search API rate limited | Backend queues request, returns cached results if available, or informs user of delay. |
| AF-3 | Search results conflict with project memory | Agent prioritizes project memory, notes discrepancy, suggests user verify. |
| AF-4 | User explicitly requests web search | Agent performs search even if memory might have answer. |

#### Postconditions

| # | Condition |
| :--- | :--- |
| 1 | Response includes current, location-relevant information when applicable. |
| 2 | Web-sourced information is clearly attributed with source citations. |
| 3 | Search queries and results are logged for quality improvement. |

#### Success Criteria

| Metric | Target |
| :--- | :--- |
| Web Search Availability | ≥ 99% uptime |
| Search Relevance | ≥ 85% of searches return useful results |
| Source Citation Accuracy | 100% of web-sourced claims include citations |
| Response Latency (with search) | < 8 seconds |

---

### UC-3: 📝 Model Update Facts Capability

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-FACT-001 |
| **Title** | Intelligent Project Fact Updates |
| **Primary Actor** | AI Agent (Orchestrator / Sub-Agent) |
| **Secondary Actors** | User, Python Backend, Supabase Database |
| **Description** | Agents can identify, extract, and persist new project facts from conversations, ensuring the project memory stays current and accurate throughout the building journey. |

#### Preconditions

| # | Condition |
| :--- | :--- |
| 1 | User is authenticated with an active project. |
| 2 | Agent has write permission to project memory. |
| 3 | JSON Schema validation is configured for critical fields. |

#### Main Flow

| Step | Actor | Action |
| :--- | :--- | :--- |
| 1 | User | Provides new information in conversation (e.g., "We just signed with ABC Contractors for $450,000"). |
| 2 | Agent | Identifies extractable facts: contractor name, contract amount, implied timeline. |
| 3 | Agent | Determines appropriate memory domain(s) for each fact (e.g., PROCUREMENT_QUALITY, FINANCE_LEGAL). |
| 4 | Agent | Formulates structured update request with new/updated fields. |
| 5 | Python Backend | Validates update against JSON Schema (type checking, required fields, format validation). |
| 6 | Python Backend | Applies update to project memory in Supabase (merge with existing data). |
| 7 | Python Backend | Returns confirmation with updated memory snapshot. |
| 8 | Agent | Confirms update to user and references the stored information in response. |

#### Fact Extraction Patterns

| Category | Extractable Facts | Memory Domain |
| :--- | :--- | :--- |
| **Budget/Finance** | Total budget, loan amount, down payment, cost breakdowns | FINANCE_LEGAL |
| **Contractors** | Name, contact, specialty, contract amount, start date | PROCUREMENT_QUALITY |
| **Timeline** | Project start, phase milestones, completion target | GENERAL |
| **Location** | Address, lot number, municipality, county, state | LAND_FEASIBILITY |
| **Permits** | Permit numbers, approval dates, inspection schedules | REGULATORY_PERMITTING |
| **Design** | Square footage, bedrooms, bathrooms, style preferences | ARCHITECTURAL_DESIGN |
| **Materials** | Selected materials, vendors, pricing | PROCUREMENT_QUALITY |

#### Fact Update Operations

| Operation | Description | Example |
| :--- | :--- | :--- |
| **CREATE** | Add new fact to memory | First contractor hired |
| **UPDATE** | Modify existing fact | Budget increased from $400K to $450K |
| **APPEND** | Add to list/array field | Add second contractor to team |
| **DELETE** | Remove obsolete fact | Contractor fired, remove from active list |

#### Confirmation and Transparency

```
Agent Response Example:
"I've updated your project with the following information:
✓ General Contractor: ABC Contractors
✓ Contract Amount: $450,000
✓ Category: Procurement & Quality

Is there anything you'd like to correct or add?"
```

#### Alternative Flows

| ID | Condition | Action |
| :--- | :--- | :--- |
| AF-1 | Validation fails (invalid data format) | Agent asks user to clarify/correct the information. |
| AF-2 | Conflicting information detected | Agent presents conflict, asks user which value is correct. |
| AF-3 | Ambiguous fact (unclear domain) | Agent asks clarifying question or makes best-effort categorization with note. |
| AF-4 | User explicitly requests NOT to save | Agent acknowledges and does not persist the information. |
| AF-5 | Bulk update from document | Agent extracts multiple facts, presents summary for user confirmation before saving. |

#### Postconditions

| # | Condition |
| :--- | :--- |
| 1 | Project memory reflects the new/updated facts. |
| 2 | User receives confirmation of what was stored. |
| 3 | Update is logged with timestamp and source (conversation/document). |
| 4 | Subsequent queries reflect the updated information. |

#### Success Criteria

| Metric | Target |
| :--- | :--- |
| Fact Extraction Accuracy | ≥ 90% of stated facts correctly identified |
| Schema Validation Pass Rate | ≥ 95% of updates pass on first attempt |
| User Correction Rate | < 10% of stored facts require user correction |
| Update Latency | < 500ms |

---

### UC-4: 📄 Model Read Documents Capability

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | UC-DOC-001 |
| **Title** | Intelligent Document Reading and Retrieval |
| **Primary Actor** | AI Agent (Orchestrator / Sub-Agent) |
| **Secondary Actors** | User, Python Backend, Supabase pgvector |
| **Description** | Agents can semantically search and retrieve relevant information from user-uploaded documents (contracts, permits, plans, quotes) to provide contextually accurate responses. |

#### Preconditions

| # | Condition |
| :--- | :--- |
| 1 | User has uploaded documents that have been processed (OCR, chunked, embedded). |
| 2 | Document chunks are stored in pgvector with embeddings. |
| 3 | Embedding model API is operational. |

#### Main Flow

| Step | Actor | Action |
| :--- | :--- | :--- |
| 1 | User | Asks a question that may require document context (e.g., "What does my contract say about payment schedule?"). |
| 2 | Agent | Determines document search is relevant based on query analysis. |
| 3 | Python Backend | Generates embedding vector for the user's query. |
| 4 | Python Backend | Performs vector similarity search against document chunks (pgvector). |
| 5 | Python Backend | Returns top-K most relevant chunks with metadata (filename, chunk index, similarity score). |
| 6 | Agent | Analyzes retrieved chunks for relevance to the specific query. |
| 7 | Agent | Synthesizes response incorporating document content with proper attribution. |
| 8 | Agent | Optionally extracts key facts from documents to update project memory. |

#### Document Search Triggers

| Trigger Type | Examples |
| :--- | :--- |
| **Explicit Document Reference** | "What does my contract say...", "According to my permit..." |
| **Domain-Specific Queries** | Questions about terms, conditions, specifications, requirements |
| **Fact Verification** | "Can you check if the setback is 25 feet?" |
| **Quote/Price Lookup** | "What was the quote from ABC Contractors?" |
| **Regulatory Questions** | "What inspections are required according to my permit?" |

#### Retrieval Parameters

| Parameter | Default | Description |
| :--- | :--- | :--- |
| **top_k** | 5 | Number of chunks to retrieve |
| **similarity_threshold** | 0.7 | Minimum similarity score to include |
| **max_tokens** | 2000 | Maximum tokens from document context |
| **metadata_filter** | None | Optional filter by document type, date, or category |

#### Document Context Format

```
Retrieved from: "General_Contract_ABC.pdf" (uploaded 2025-01-15)
Chunk 3 of 12, Relevance: 0.89

"Payment Schedule: The Owner agrees to pay the Contractor according 
to the following schedule: 10% upon signing, 25% at foundation 
completion, 25% at framing completion, 25% at rough-in completion, 
and 15% upon final inspection and certificate of occupancy..."
```

#### Fact Extraction from Documents

| Document Type | Extractable Facts | Target Domain |
| :--- | :--- | :--- |
| **Contracts** | Payment terms, start date, completion date, penalties | FINANCE_LEGAL, PROCUREMENT_QUALITY |
| **Permits** | Permit number, conditions, setbacks, restrictions | REGULATORY_PERMITTING |
| **Quotes/Estimates** | Line items, totals, validity period | PROCUREMENT_QUALITY |
| **Site Surveys** | Lot dimensions, easements, utilities | LAND_FEASIBILITY |
| **Plans/Specs** | Square footage, room counts, materials | ARCHITECTURAL_DESIGN |

#### Alternative Flows

| ID | Condition | Action |
| :--- | :--- | :--- |
| AF-1 | No relevant documents found | Agent acknowledges, answers from general knowledge, suggests uploading relevant documents. |
| AF-2 | Low similarity scores (< threshold) | Agent indicates uncertainty, presents chunks with caveat about relevance. |
| AF-3 | Multiple conflicting documents | Agent presents information from each, asks user which is authoritative. |
| AF-4 | Document content outdated | Agent notes document date, suggests verifying if information is still current. |
| AF-5 | Query spans multiple documents | Agent retrieves and synthesizes from multiple sources. |

#### Postconditions

| # | Condition |
| :--- | :--- |
| 1 | Response accurately reflects document content when applicable. |
| 2 | Document sources are cited in response. |
| 3 | Key facts may be extracted and stored in project memory. |
| 4 | Document retrieval is logged for analytics. |

#### Success Criteria

| Metric | Target |
| :--- | :--- |
| Retrieval Relevance | ≥ 85% of retrieved chunks are relevant to query |
| Answer Accuracy | ≥ 90% accuracy when document contains the answer |
| Source Attribution | 100% of document-sourced claims include citation |
| Retrieval Latency | < 1 second for similarity search |
| Fact Extraction Rate | ≥ 80% of extractable facts identified and offered for storage |

---

### Integration Matrix

| Use Case | Triggers | Updates Memory | Uses Documents | Uses Web | Requires Project |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UC-0: Project Info** | Every request | No | No | No | Yes (source) |
| **UC-1: Read Memory** | Every request | No | No | No | Yes |
| **UC-2: Web Search** | Current info needed | Optionally | No | Yes | Yes (for location) |
| **UC-3: Update Facts** | New info in conversation | Yes | Source possible | No | Yes |
| **UC-4: Read Documents** | Document-related query | Optionally | Yes | No | Yes |

---

### Combined Flow Example

**User Query:** "I just uploaded my contract with ABC Contractors. What's the payment schedule and total cost?"

| Step | Capability Used | Action |
| :--- | :--- | :--- |
| 0 | **UC-0: Project Info** | Load project context (name: "Lakeside Home", phase: DESIGN, location: Austin, TX) |
| 1 | **UC-1: Read Memory** | Load project memory (knows budget expectations, existing contractor info) |
| 2 | **UC-4: Read Documents** | Semantic search finds contract chunks with payment terms |
| 3 | **UC-3: Update Facts** | Extract contractor name, total cost, payment schedule to memory |
| 4 | Agent Response | "For your Lakeside Home project, the ABC Contractors agreement shows..." |

---

### Technical Implementation Notes

#### API Endpoints Required

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/memory/{project_id}` | GET | Retrieve full project memory |
| `/api/memory/{project_id}` | PATCH | Update project memory (partial) |
| `/api/search/web` | POST | Execute web search query |
| `/api/documents/search` | POST | Vector similarity search |
| `/api/documents/{project_id}` | GET | List project documents |

#### Agent Tool Definitions (LangChain)

```python
tools = [
    Tool(name="read_memory", description="Retrieve project memory"),
    Tool(name="update_memory", description="Update project facts"),
    Tool(name="web_search", description="Search the web for current information"),
    Tool(name="search_documents", description="Search uploaded documents"),
]
```

#### Prompt Template Structure

```
[SYSTEM INSTRUCTIONS]
You are a specialized home-building assistant...

[PROJECT MEMORY - AUTO-INJECTED]
{project_memory_json}

[RETRIEVED DOCUMENTS - IF APPLICABLE]
{document_chunks}

[WEB SEARCH RESULTS - IF APPLICABLE]
{web_search_results}

[USER MESSAGE]
{user_query}
```
