# API Endpoint Implementation Plan: Chat/Message Endpoints

## 1. Endpoint Overview

This implementation plan covers three REST API endpoints for the chat/message functionality in the House Building Assistant application:

1. **GET /api/projects/{project_id}/messages** - Retrieve paginated chat history for a project
2. **POST /api/projects/{project_id}/chat** - Send a user message and receive an AI-generated response
3. **POST /api/projects/{project_id}/messages/{message_id}/feedback** - Submit CSAT feedback for an assistant message

These endpoints enable users to interact with specialized AI agents through a conversational interface, maintaining chat history and collecting user satisfaction metrics. The chat endpoint orchestrates complex backend operations including agent routing, vector search for RAG, project memory updates, and usage tracking.

## 2. Request Details

### 2.1 GET /api/projects/{project_id}/messages

**HTTP Method:** GET

**URL Structure:** `/api/projects/{project_id}/messages`

**Path Parameters:**
- `project_id` (uuid, required) - Project identifier

**Query Parameters:**
- `page` (integer, optional, default=1) - Page number for pagination
- `limit` (integer, optional, default=50, min=1, max=100) - Items per page
- `before` (timestamp, optional) - Get messages created before this timestamp
- `after` (timestamp, optional) - Get messages created after this timestamp

**Request Body:** None

**Authentication:** Required (Bearer token)

---

### 2.2 POST /api/projects/{project_id}/chat

**HTTP Method:** POST

**URL Structure:** `/api/projects/{project_id}/chat`

**Path Parameters:**
- `project_id` (uuid, required) - Project identifier

**Query Parameters:** None

**Request Body:**
```json
{
  "content": "What should I consider when selecting a plot of land?"
}
```

**Request Body Schema:**
- `content` (string, required, min_length=1, max_length=4000) - User's message content

**Authentication:** Required (Bearer token)

---

### 2.3 POST /api/projects/{project_id}/messages/{message_id}/feedback

**HTTP Method:** POST

**URL Structure:** `/api/projects/{project_id}/messages/{message_id}/feedback`

**Path Parameters:**
- `project_id` (uuid, required) - Project identifier
- `message_id` (uuid, required) - Message identifier

**Query Parameters:** None

**Request Body:**
```json
{
  "csat_rating": 5
}
```

**Request Body Schema:**
- `csat_rating` (integer, required, min=1, max=5) - Satisfaction rating (1=poor, 5=excellent)

**Authentication:** Required (Bearer token)

## 3. Used Types

### 3.1 Query Parameter Models

**MessageListParams** (extends PaginationParams)
```python
from app.schemas.message import MessageListParams

# Fields:
# - page: int (default=1, ge=1)
# - limit: int (default=50, ge=1, le=100)
# - before: Optional[datetime]
# - after: Optional[datetime]
```

### 3.2 Request Command Models

**ChatRequest**
```python
from app.schemas.message import ChatRequest

# Fields:
# - content: str (min_length=1, max_length=4000)
```

**MessageFeedbackRequest**
```python
from app.schemas.message import MessageFeedbackRequest

# Fields:
# - csat_rating: Literal[1, 2, 3, 4, 5]
```

### 3.3 Response DTO Models

**MessageListResponse**
```python
from app.schemas.message import MessageListResponse, MessageItem
from app.schemas.common import PaginationInfo

# MessageListResponse contains:
# - data: list[MessageItem]
# - pagination: PaginationInfo
```

**MessageItem**
```python
# Fields:
# - id: UUID
# - project_id: UUID
# - role: MessageRole (user/assistant)
# - content: str
# - agent_id: Optional[str]
# - csat_rating: Optional[int] (1-5)
# - created_at: datetime
```

**ChatResponse**
```python
from app.schemas.message import ChatResponse, RoutingMetadata

# Fields:
# - id: UUID
# - role: Literal["assistant"]
# - content: str
# - agent_id: str
# - routing_metadata: RoutingMetadata
# - created_at: datetime
```

**RoutingMetadata**
```python
# Fields:
# - confidence: float (0.0-1.0)
# - reasoning: str
```

**MessageFeedbackResponse**
```python
from app.schemas.message import MessageFeedbackResponse

# Fields:
# - id: UUID
# - csat_rating: int (1-5)
# - updated_at: datetime
```

### 3.4 Domain Enums

**MessageRole**
```python
from app.schemas.message import MessageRole

# Values:
# - USER = "user"
# - ASSISTANT = "assistant"
```

## 4. Response Details

### 4.1 GET /api/projects/{project_id}/messages

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "01933e4a-1234-7890-abcd-ef1234567890",
      "project_id": "01933e49-5678-1234-abcd-ef9876543210",
      "role": "user",
      "content": "What permits do I need for a single-family home?",
      "agent_id": null,
      "csat_rating": null,
      "created_at": "2026-01-04T10:30:00Z"
    },
    {
      "id": "01933e4a-2345-7890-abcd-ef1234567891",
      "project_id": "01933e49-5678-1234-abcd-ef9876543210",
      "role": "assistant",
      "content": "For a single-family home, you typically need...",
      "agent_id": "REGULATORY_PERMITTING_AGENT",
      "csat_rating": 5,
      "created_at": "2026-01-04T10:30:15Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 42,
    "total_pages": 1
  }
}
```

**Status Codes:**
- `200 OK` - Messages retrieved successfully
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found

---

### 4.2 POST /api/projects/{project_id}/chat

**Success Response (200 OK):**
```json
{
  "id": "01933e4a-3456-7890-abcd-ef1234567892",
  "role": "assistant",
  "content": "When selecting a plot of land for your home, consider these key factors...",
  "agent_id": "LAND_FEASIBILITY_AGENT",
  "routing_metadata": {
    "confidence": 0.95,
    "reasoning": "Query relates to land selection criteria"
  },
  "created_at": "2026-01-04T10:45:30Z"
}
```

**Status Codes:**
- `200 OK` - Message processed and response generated
- `400 Bad Request` - Missing or empty content
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found
- `422 Unprocessable Entity` - Content too long (>4000 characters)
- `503 Service Unavailable` - AI service temporarily unavailable

---

### 4.3 POST /api/projects/{project_id}/messages/{message_id}/feedback

**Success Response (200 OK):**
```json
{
  "id": "01933e4a-3456-7890-abcd-ef1234567892",
  "csat_rating": 5,
  "updated_at": "2026-01-04T11:00:00Z"
}
```

**Status Codes:**
- `200 OK` - Feedback submitted successfully
- `400 Bad Request` - Invalid rating value
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project or message not found
- `422 Unprocessable Entity` - Cannot rate user messages (only assistant messages can be rated)

## 5. Data Flow

### 5.1 GET /api/projects/{project_id}/messages

1. **Request Reception:**
   - FastAPI receives GET request with path parameter `project_id` and query parameters
   - Pydantic validates query parameters against `MessageListParams` schema

2. **Authentication & Authorization:**
   - Extract user_id from JWT token (via FastAPI dependency injection)
   - Verify user owns the project (Supabase query: `projects.user_id == authenticated_user_id`)
   - Return 403 if ownership check fails

3. **Data Retrieval:**
   - Query `messages` table filtered by `project_id`
   - Apply optional timestamp filters (`before`, `after`)
   - Order by `created_at` (descending for most recent first)
   - Apply pagination (LIMIT/OFFSET)
   - Count total messages for pagination metadata

4. **Response Construction:**
   - Transform database records to `MessageItem` DTOs
   - Build `PaginationInfo` object with page, limit, total_items, total_pages
   - Return `MessageListResponse` with 200 status

### 5.2 POST /api/projects/{project_id}/chat

This is the most complex endpoint with multiple side effects:

1. **Request Reception:**
   - FastAPI receives POST request with `ChatRequest` body
   - Pydantic validates content (1-4000 chars)

2. **Authentication & Authorization:**
   - Extract user_id from JWT token
   - Verify user owns the project
   - Return 403 if ownership check fails

3. **Store User Message:**
   - Create `messages` record with:
     - role = 'user'
     - content = request.content
     - project_id, user_id from context
     - agent_id = null
     - routing_metadata = null

4. **Context Retrieval (Parallel):**
   - **Project Memory:** Retrieve project_memory JSONB data for the project
   - **Document Search:** Perform vector similarity search on document_chunks table
     - Generate embedding for user query (via OpenRouter/OpenAI)
     - Query pgvector for top-k similar chunks
     - Retrieve associated document metadata
   - **Chat History:** Retrieve last N messages for conversation context

5. **Agent Orchestration:**
   - **Triage Agent (Orchestrator):**
     - Input: user message, project phase, project memory, chat history
     - LLM call via OpenRouter to determine which specialized agent to use
     - Output: agent_id, confidence, reasoning
   - **Specialized Agent Execution:**
     - Input: user message, retrieved documents, project memory, chat history
     - Agent may perform Google Search for current information
     - LLM call via OpenRouter with agent-specific system prompt
     - Output: response content
   - **Project Memory Update (Optional):**
     - If agent extracted new facts, update project_memory JSONB via MCP

6. **Store Assistant Message:**
   - Create `messages` record with:
     - role = 'assistant'
     - content = agent response
     - agent_id = selected agent
     - routing_metadata = {confidence, reasoning}
     - project_id, user_id from context

7. **Audit Trail:**
   - Create `routing_audits` record with orchestrator decision details

8. **Usage Tracking:**
   - Create `usage_logs` record with:
     - Token counts (prompt + completion)
     - Model used
     - Cost estimation
     - Latency metrics

9. **Response:**
   - Return `ChatResponse` with assistant message only (user message not echoed)
   - Return 503 if AI service fails

**Performance Constraint:** Maximum 10 seconds response time (as per PRD)

### 5.3 POST /api/projects/{project_id}/messages/{message_id}/feedback

1. **Request Reception:**
   - FastAPI receives POST request with `MessageFeedbackRequest` body
   - Pydantic validates csat_rating (1-5)

2. **Authentication & Authorization:**
   - Extract user_id from JWT token
   - Verify user owns the project
   - Return 403 if ownership check fails

3. **Message Validation:**
   - Query `messages` table for message_id
   - Verify message exists and belongs to specified project
   - Verify message role is 'assistant' (cannot rate user messages)
   - Return 422 if trying to rate user message
   - Return 404 if message not found

4. **Update Feedback:**
   - Update `messages.csat_rating` field
   - Update `messages.updated_at` timestamp (if tracked)

5. **Response:**
   - Return `MessageFeedbackResponse` with updated rating and timestamp

## 6. Security Considerations

### 6.1 Authentication

- **Bearer Token (JWT):** All endpoints require valid authentication token
- **Token Validation:** Use Supabase client to verify JWT signature and expiration
- **User Extraction:** Extract user_id from validated token claims

### 6.2 Authorization

- **Project Ownership Verification:**
  - Before any operation, query `projects` table to verify `projects.user_id == authenticated_user_id`
  - Return 403 Forbidden if ownership check fails
  - This prevents users from accessing other users' project data

- **Message Ownership Verification (Feedback endpoint):**
  - Verify message belongs to the specified project
  - Verify project belongs to authenticated user
  - Prevents feedback manipulation on other users' messages

### 6.3 Input Validation

- **Pydantic Schema Validation:**
  - Automatic validation of request bodies against defined schemas
  - Type checking (UUID, int, str)
  - Range validation (1-5 for csat_rating, 1-4000 for content)
  - Returns 422 Unprocessable Entity for validation failures

- **Content Sanitization:**
  - Validate content length before AI processing
  - Consider sanitizing HTML/script tags to prevent XSS (frontend responsibility)
  - Log suspicious patterns (e.g., SQL injection attempts, prompt injection)

### 6.4 Rate Limiting

- **Chat Endpoint Rate Limiting:**
  - Implement per-user rate limit (e.g., 10 requests per minute)
  - Prevents abuse of expensive AI service
  - Return 429 Too Many Requests when limit exceeded
  - Consider exponential backoff for repeated violations

### 6.5 Data Exposure Prevention

- **Selective Field Exposure:**
  - Message list excludes `user_id` field (not needed by frontend)
  - Message list excludes `routing_metadata` for cleaner UI
  - Only expose necessary fields in each DTO

- **Logging Security:**
  - Never log authentication tokens
  - Sanitize user content in logs (PII redaction)
  - Use structured logging with log levels

### 6.6 Prompt Injection Protection

- **User Input Isolation:**
  - Clearly delineate user input from system prompts in AI calls
  - Use structured prompt formats (e.g., chat message arrays)
  - Consider input validation patterns to detect injection attempts

- **Output Validation:**
  - Validate AI responses before storing
  - Detect and handle inappropriate/malicious content

### 6.7 AI Service Security

- **API Key Management:**
  - Store OpenRouter API key in environment variables
  - Never expose key in logs or responses
  - Rotate keys periodically

- **Service Availability:**
  - Implement circuit breaker pattern for AI service calls
  - Return 503 Service Unavailable on AI service failures
  - Consider fallback responses for degraded mode

## 7. Error Handling

### 7.1 Error Response Format

All error responses should follow a consistent format:

```json
{
  "detail": "Human-readable error message",
  "error_code": "MACHINE_READABLE_CODE",
  "timestamp": "2026-01-04T10:30:00Z"
}
```

### 7.2 Error Scenarios by Endpoint

#### GET /api/projects/{project_id}/messages

| Error | Status Code | Detail Message | Handling |
|-------|-------------|----------------|----------|
| Missing auth token | 401 | "Authentication required" | Check Authorization header |
| Invalid token | 401 | "Invalid or expired token" | Validate JWT signature |
| Project not found | 404 | "Project not found" | Query projects table |
| User not project owner | 403 | "Access denied to this project" | Check projects.user_id |
| Invalid pagination params | 422 | "Invalid query parameters" | Pydantic validation |
| Database connection error | 500 | "Internal server error" | Log error, return generic message |

#### POST /api/projects/{project_id}/chat

| Error | Status Code | Detail Message | Handling |
|-------|-------------|----------------|----------|
| Missing auth token | 401 | "Authentication required" | Check Authorization header |
| Invalid token | 401 | "Invalid or expired token" | Validate JWT signature |
| Empty content | 400 | "Message content is required" | Pydantic validation |
| Content too long | 422 | "Message exceeds 4000 characters" | Pydantic validation |
| Project not found | 404 | "Project not found" | Query projects table |
| User not project owner | 403 | "Access denied to this project" | Check projects.user_id |
| AI service unavailable | 503 | "AI service temporarily unavailable, please try again" | Catch OpenRouter errors |
| AI service timeout | 503 | "AI service timeout, please try again" | Set 10s timeout on AI calls |
| Vector search failure | 500 | "Internal server error" | Log error, continue without RAG |
| Rate limit exceeded | 429 | "Too many requests, please slow down" | Check rate limiter |
| Database error | 500 | "Internal server error" | Log error, rollback transaction |

#### POST /api/projects/{project_id}/messages/{message_id}/feedback

| Error | Status Code | Detail Message | Handling |
|-------|-------------|----------------|----------|
| Missing auth token | 401 | "Authentication required" | Check Authorization header |
| Invalid token | 401 | "Invalid or expired token" | Validate JWT signature |
| Invalid rating value | 400 | "Rating must be between 1 and 5" | Pydantic validation |
| Project not found | 404 | "Project not found" | Query projects table |
| Message not found | 404 | "Message not found" | Query messages table |
| User not project owner | 403 | "Access denied to this project" | Check projects.user_id |
| Rating user message | 422 | "Cannot rate user messages" | Check messages.role |
| Database error | 500 | "Internal server error" | Log error, rollback transaction |

### 7.3 Error Logging Strategy

**Use Python logging module with structured logging:**

```python
import logging
import json

logger = logging.getLogger(__name__)

# Log format: timestamp, level, service, endpoint, error_type, details, trace_id
```

**What to log:**
- All 500-level errors with full stack traces
- Authorization failures (403) for security monitoring
- AI service failures (503) for reliability tracking
- Rate limit violations (429) for abuse detection
- Validation errors (422) for input pattern analysis

**What NOT to log:**
- Authentication tokens
- Full user message content (only length and snippet)
- API keys or secrets
- Personal identifiable information (PII)

**Error Storage:**
- Consider creating an `error_logs` table for critical errors
- Store: timestamp, user_id, endpoint, error_type, message, stack_trace (truncated), request_id
- Use for analytics and debugging

### 7.4 Exception Handling in FastAPI

```python
from fastapi import HTTPException

# Example exception handling patterns:
try:
    # Operation
except ProjectNotFoundError:
    raise HTTPException(status_code=404, detail="Project not found")
except UnauthorizedAccessError:
    raise HTTPException(status_code=403, detail="Access denied to this project")
except AIServiceError:
    logger.error("AI service failure", exc_info=True)
    raise HTTPException(status_code=503, detail="AI service temporarily unavailable")
except Exception as e:
    logger.error("Unexpected error", exc_info=True)
    raise HTTPException(status_code=500, detail="Internal server error")
```

## 8. Performance Considerations

### 8.1 Bottlenecks

1. **AI Service Latency:**
   - OpenRouter LLM calls can take 2-8 seconds
   - Vector embedding generation adds 100-500ms
   - Multiple sequential LLM calls (triage + agent) compound latency

2. **Vector Search:**
   - Similarity search on large document_chunks table
   - Embedding generation before search

3. **Database Queries:**
   - Multiple queries in chat endpoint (project, memory, messages, documents)
   - Transaction overhead for atomic message creation

4. **Project Memory Retrieval:**
   - JSONB parsing for large project memories
   - MCP protocol overhead for memory access

### 8.2 Optimization Strategies

#### 8.2.1 Async Operations

**Use FastAPI async endpoints for I/O-bound operations:**

```python
@router.post("/projects/{project_id}/chat", response_model=ChatResponse)
async def send_message(
    project_id: UUID,
    request: ChatRequest,
    user_id: UUID = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Use async/await for database and AI service calls
    pass
```

**Benefits:**
- Non-blocking I/O allows handling concurrent requests
- Improved throughput for AI service calls
- Better resource utilization

#### 8.2.2 Parallel Context Retrieval

**Fetch project memory, chat history, and perform vector search concurrently:**

```python
import asyncio

# Execute in parallel
results = await asyncio.gather(
    project_memory_service.get_memory(project_id),
    message_service.get_recent_history(project_id, limit=10),
    document_service.vector_search(query_embedding, top_k=5),
)
project_memory, chat_history, relevant_docs = results
```

**Benefit:** Reduces total context retrieval time from sum to max of individual calls.

#### 8.2.3 Database Indexing

**Required indexes for optimal query performance:**

```sql
-- Messages table
CREATE INDEX idx_messages_project_created ON messages(project_id, created_at DESC);
CREATE INDEX idx_messages_project_role ON messages(project_id, role);

-- Document chunks (vector search)
CREATE INDEX idx_document_chunks_vector ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Projects (ownership checks)
CREATE INDEX idx_projects_user_id ON projects(user_id);
```

#### 8.2.4 Caching Strategies

**Project Memory Caching:**
- Cache project_memory JSONB in Redis with 5-minute TTL
- Invalidate on memory updates
- Reduces Supabase query load

**Document Embeddings:**
- Cache document embeddings in memory (application startup)
- Update cache on new document uploads
- Reduces vector search latency

**Chat History:**
- Consider caching last 10 messages per project in Redis
- Update cache on new messages
- Reduces database load for frequent conversations

#### 8.2.5 Connection Pooling

**Supabase Connection Pool:**
- Configure connection pool size based on concurrency needs
- Use connection pooling for database sessions
- Prevents connection exhaustion under load

**AI Service Client Reuse:**
- Reuse HTTP client connections for OpenRouter API
- Configure connection pool and keepalive
- Reduces connection establishment overhead

#### 8.2.6 Background Tasks

**Non-critical operations can be deferred:**

```python
from fastapi import BackgroundTasks

@router.post("/projects/{project_id}/chat")
async def send_message(
    background_tasks: BackgroundTasks,
    # ... other parameters
):
    # ... main logic ...
    
    # Defer usage logging to background
    background_tasks.add_task(usage_logging_service.log_usage, usage_data)
    
    return response
```

**Operations suitable for background tasks:**
- Usage logging (non-critical for response)
- Audit trail creation
- Analytics event tracking
- Notification sending

**Note:** Routing audit should NOT be background - it's part of response validation.

#### 8.2.7 Response Time Budget

**10-second maximum response time breakdown:**
- Auth & validation: 50ms
- Project verification: 50ms
- User message storage: 100ms
- Context retrieval (parallel): 500ms
  - Project memory: 200ms
  - Chat history: 200ms
  - Vector search: 500ms (including embedding)
- Triage agent (orchestrator): 2000ms
- Specialized agent: 5000ms
- Message storage: 200ms
- Response construction: 100ms
- **Total: ~8000ms** (with 2000ms buffer)

**Monitoring:**
- Track endpoint latency with percentiles (p50, p95, p99)
- Alert if p95 exceeds 9 seconds
- Identify slow components with distributed tracing

### 8.3 Scalability Considerations

**Horizontal Scaling:**
- Stateless API design allows multiple instances
- Load balancer distributes requests across instances
- Shared Supabase database handles concurrent access

**Rate Limiting:**
- Per-user limits prevent single user from monopolizing resources
- Consider tiered limits based on user plan

**AI Service Quotas:**
- Monitor OpenRouter API quota usage
- Implement graceful degradation if quota exceeded
- Consider multiple API key rotation for high volume

## 9. Implementation Steps

### Step 1: Service Layer Implementation

**Create `app/services/message_service.py`:**

```python
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime
from app.db.models import Message
from app.schemas.message import MessageItem, MessageRole

class MessageService:
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
        Returns: (messages, total_count)
        """
        pass
    
    async def create_message(
        self,
        project_id: UUID,
        user_id: UUID,
        role: MessageRole,
        content: str,
        agent_id: Optional[str] = None,
        routing_metadata: Optional[dict] = None,
    ) -> Message:
        """Create a new message record."""
        pass
    
    async def update_csat_rating(
        self,
        message_id: UUID,
        csat_rating: int,
    ) -> Message:
        """Update CSAT rating for a message."""
        pass
    
    async def get_message(
        self,
        message_id: UUID,
        project_id: UUID,
    ) -> Optional[Message]:
        """Get a specific message."""
        pass
    
    async def get_recent_history(
        self,
        project_id: UUID,
        limit: int = 10,
    ) -> List[Message]:
        """Get recent chat history for context."""
        pass
```

**Create `app/services/chat_orchestration_service.py`:**

```python
from typing import Dict, Any
from uuid import UUID

class ChatOrchestrationService:
    def __init__(
        self,
        ai_client: AIClient,
        document_service: DocumentRetrievalService,
        memory_service: ProjectMemoryService,
        message_service: MessageService,
    ):
        self.ai_client = ai_client
        self.document_service = document_service
        self.memory_service = memory_service
        self.message_service = message_service
    
    async def process_chat(
        self,
        project_id: UUID,
        user_id: UUID,
        content: str,
    ) -> Dict[str, Any]:
        """
        Orchestrate full chat processing pipeline:
        1. Store user message
        2. Retrieve context (memory, history, documents)
        3. Select agent (triage)
        4. Execute specialized agent
        5. Store assistant message
        6. Return response
        """
        pass
    
    async def _retrieve_context(self, project_id: UUID, content: str):
        """Parallel context retrieval."""
        pass
    
    async def _select_agent(self, context: dict) -> Tuple[str, float, str]:
        """Triage agent for routing."""
        pass
    
    async def _execute_agent(self, agent_id: str, context: dict) -> str:
        """Execute specialized agent."""
        pass
```

**Create `app/services/project_memory_service.py`:**

```python
class ProjectMemoryService:
    async def get_memory(self, project_id: UUID) -> dict:
        """Retrieve project memory JSONB."""
        pass
    
    async def update_memory(self, project_id: UUID, updates: dict):
        """Update project memory via MCP."""
        pass
```

**Create `app/services/document_retrieval_service.py`:**

```python
class DocumentRetrievalService:
    async def vector_search(
        self,
        query: str,
        project_id: UUID,
        top_k: int = 5,
    ) -> List[DocumentChunk]:
        """Perform vector similarity search."""
        pass
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding via OpenRouter/OpenAI."""
        pass
```

**Create `app/services/usage_logging_service.py`:**

```python
class UsageLoggingService:
    async def log_usage(
        self,
        user_id: UUID,
        project_id: UUID,
        agent_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        model: str,
        latency_ms: int,
    ):
        """Log token usage and cost."""
        pass
```

### Step 2: Project Ownership Dependency

**Create `app/dependencies/project.py`:**

```python
from fastapi import Depends, HTTPException
from uuid import UUID

async def verify_project_ownership(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify that the authenticated user owns the specified project.
    Raises 404 if project doesn't exist, 403 if user doesn't own it.
    """
    project = await db.get(Project, project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this project")
    
    return project
```

### Step 3: Router Implementation - GET /api/projects/{project_id}/messages

**Create/update `app/routers/messages.py`:**

```python
from fastapi import APIRouter, Depends, Query
from uuid import UUID
from typing import Optional
from datetime import datetime

from app.schemas.message import MessageListParams, MessageListResponse
from app.services.message_service import MessageService
from app.dependencies.auth import get_current_user
from app.dependencies.project import verify_project_ownership

router = APIRouter(prefix="/api/projects", tags=["messages"])

@router.get(
    "/{project_id}/messages",
    response_model=MessageListResponse,
    summary="Get chat history",
    description="Retrieve paginated chat history for a project",
)
async def list_messages(
    project_id: UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    before: Optional[datetime] = Query(default=None),
    after: Optional[datetime] = Query(default=None),
    user_id: UUID = Depends(get_current_user),
    project = Depends(verify_project_ownership),
    message_service: MessageService = Depends(get_message_service),
):
    """
    Get paginated chat history for a project.
    
    - Requires authentication
    - User must own the project
    - Returns user and assistant messages
    - Ordered by created_at (descending)
    """
    try:
        messages, total_count = await message_service.list_messages(
            project_id=project_id,
            page=page,
            limit=limit,
            before=before,
            after=after,
        )
        
        total_pages = (total_count + limit - 1) // limit
        
        return MessageListResponse(
            data=messages,
            pagination=PaginationInfo(
                page=page,
                limit=limit,
                total_items=total_count,
                total_pages=total_pages,
            ),
        )
    
    except Exception as e:
        logger.error(f"Error listing messages: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
```

### Step 4: Router Implementation - POST /api/projects/{project_id}/chat

```python
@router.post(
    "/{project_id}/chat",
    response_model=ChatResponse,
    summary="Send chat message",
    description="Send a message and receive an AI response",
)
async def send_message(
    project_id: UUID,
    request: ChatRequest,
    user_id: UUID = Depends(get_current_user),
    project = Depends(verify_project_ownership),
    chat_service: ChatOrchestrationService = Depends(get_chat_service),
    rate_limiter = Depends(check_rate_limit),
):
    """
    Send a user message and receive an AI-generated response.
    
    - Requires authentication
    - User must own the project
    - Maximum content length: 4000 characters
    - Maximum response time: 10 seconds
    - Creates both user and assistant messages
    - Performs agent routing and RAG retrieval
    """
    try:
        # Process chat with timeout
        response = await asyncio.wait_for(
            chat_service.process_chat(
                project_id=project_id,
                user_id=user_id,
                content=request.content,
            ),
            timeout=10.0,
        )
        
        return ChatResponse(**response)
    
    except asyncio.TimeoutError:
        logger.error(f"Chat timeout for project {project_id}")
        raise HTTPException(
            status_code=503,
            detail="AI service timeout, please try again",
        )
    
    except AIServiceError as e:
        logger.error(f"AI service error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="AI service temporarily unavailable",
        )
    
    except Exception as e:
        logger.error(f"Error processing chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
```

### Step 5: Router Implementation - POST /api/projects/{project_id}/messages/{message_id}/feedback

```python
@router.post(
    "/{project_id}/messages/{message_id}/feedback",
    response_model=MessageFeedbackResponse,
    summary="Submit message feedback",
    description="Submit CSAT rating for an assistant message",
)
async def submit_feedback(
    project_id: UUID,
    message_id: UUID,
    request: MessageFeedbackRequest,
    user_id: UUID = Depends(get_current_user),
    project = Depends(verify_project_ownership),
    message_service: MessageService = Depends(get_message_service),
):
    """
    Submit CSAT feedback for an assistant message.
    
    - Requires authentication
    - User must own the project
    - Can only rate assistant messages
    - Rating must be 1-5
    """
    try:
        # Verify message exists and belongs to project
        message = await message_service.get_message(
            message_id=message_id,
            project_id=project_id,
        )
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Verify message is from assistant
        if message.role != MessageRole.ASSISTANT:
            raise HTTPException(
                status_code=422,
                detail="Cannot rate user messages",
            )
        
        # Update rating
        updated_message = await message_service.update_csat_rating(
            message_id=message_id,
            csat_rating=request.csat_rating,
        )
        
        return MessageFeedbackResponse(
            id=updated_message.id,
            csat_rating=updated_message.csat_rating,
            updated_at=datetime.utcnow(),
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
```

### Step 6: Database Access Layer

**Update `app/db/repositories/message_repository.py`:**

```python
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

class MessageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def list_by_project(
        self,
        project_id: UUID,
        limit: int,
        offset: int,
        before: Optional[datetime] = None,
        after: Optional[datetime] = None,
    ):
        """Query messages with filters."""
        query = select(Message).where(Message.project_id == project_id)
        
        if before:
            query = query.where(Message.created_at < before)
        if after:
            query = query.where(Message.created_at > after)
        
        query = query.order_by(Message.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def count_by_project(
        self,
        project_id: UUID,
        before: Optional[datetime] = None,
        after: Optional[datetime] = None,
    ):
        """Count total messages."""
        query = select(func.count(Message.id)).where(
            Message.project_id == project_id
        )
        
        if before:
            query = query.where(Message.created_at < before)
        if after:
            query = query.where(Message.created_at > after)
        
        result = await self.db.execute(query)
        return result.scalar_one()
    
    async def create(self, message: Message):
        """Insert new message."""
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message
    
    async def update(self, message: Message):
        """Update existing message."""
        await self.db.commit()
        await self.db.refresh(message)
        return message
    
    async def get_by_id(self, message_id: UUID):
        """Get message by ID."""
        return await self.db.get(Message, message_id)
```

### Step 7: AI Client Integration

**Create `app/clients/ai_client.py`:**

```python
import httpx
from typing import List, Dict, Any
import os

class AIClient:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.base_url = "https://openrouter.ai/api/v1"
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "openai/gpt-4-turbo",
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """Call OpenRouter chat completion API."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        
        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()
        
        except httpx.HTTPStatusError as e:
            raise AIServiceError(f"AI service error: {e}")
        except httpx.TimeoutException:
            raise AIServiceError("AI service timeout")
    
    async def generate_embedding(
        self,
        text: str,
        model: str = "openai/text-embedding-3-small",
    ) -> List[float]:
        """Generate text embedding."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": model,
            "input": text,
        }
        
        response = await self.client.post(
            f"{self.base_url}/embeddings",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        
        result = response.json()
        return result["data"][0]["embedding"]
```

### Step 8: Rate Limiting

**Create `app/middleware/rate_limiter.py`:**

```python
from fastapi import HTTPException, Request
from datetime import datetime, timedelta
import redis.asyncio as redis
import os

class RateLimiter:
    def __init__(self):
        self.redis = redis.from_url(os.getenv("REDIS_URL"))
        self.limit = 10  # requests
        self.window = 60  # seconds
    
    async def check_rate_limit(self, user_id: str, endpoint: str):
        """Check if user has exceeded rate limit."""
        key = f"rate_limit:{user_id}:{endpoint}"
        
        count = await self.redis.get(key)
        
        if count is None:
            # First request in window
            await self.redis.setex(key, self.window, 1)
            return
        
        count = int(count)
        
        if count >= self.limit:
            raise HTTPException(
                status_code=429,
                detail="Too many requests, please slow down",
            )
        
        await self.redis.incr(key)

# Dependency
async def check_rate_limit(
    request: Request,
    user_id: UUID = Depends(get_current_user),
):
    limiter = RateLimiter()
    await limiter.check_rate_limit(str(user_id), request.url.path)
```

### Step 9: Testing

**Create `tests/test_message_endpoints.py`:**

```python
import pytest
from httpx import AsyncClient
from uuid import uuid4

@pytest.mark.asyncio
async def test_list_messages_success(client: AsyncClient, auth_token: str):
    """Test successful message list retrieval."""
    response = await client.get(
        f"/api/projects/{project_id}/messages",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "pagination" in data

@pytest.mark.asyncio
async def test_chat_success(client: AsyncClient, auth_token: str):
    """Test successful chat interaction."""
    response = await client.post(
        f"/api/projects/{project_id}/chat",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"content": "What permits do I need?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "assistant"
    assert "content" in data
    assert "agent_id" in data

@pytest.mark.asyncio
async def test_feedback_success(client: AsyncClient, auth_token: str):
    """Test successful feedback submission."""
    response = await client.post(
        f"/api/projects/{project_id}/messages/{message_id}/feedback",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"csat_rating": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["csat_rating"] == 5

@pytest.mark.asyncio
async def test_chat_unauthorized(client: AsyncClient):
    """Test chat without authentication."""
    response = await client.post(
        f"/api/projects/{project_id}/chat",
        json={"content": "Test"},
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_feedback_user_message_error(client: AsyncClient, auth_token: str):
    """Test feedback on user message (should fail)."""
    response = await client.post(
        f"/api/projects/{project_id}/messages/{user_message_id}/feedback",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"csat_rating": 5},
    )
    assert response.status_code == 422
```

### Step 10: Documentation

**Update `app/main.py` with OpenAPI metadata:**

```python
from fastapi import FastAPI

app = FastAPI(
    title="House Building Assistant API",
    description="REST API for AI-powered house building assistance",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Include routers
app.include_router(messages.router)
```

### Step 11: Monitoring and Logging

**Configure structured logging:**

```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "message_api",
            "endpoint": getattr(record, "endpoint", None),
            "user_id": getattr(record, "user_id", None),
            "message": record.getMessage(),
            "trace_id": getattr(record, "trace_id", None),
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)

# Configure logger
logger = logging.getLogger("app")
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

### Step 12: Deployment Configuration

**Update `docker-compose.yml`:**

```yaml
services:
  backend:
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - REDIS_URL=${REDIS_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Create `app/routers/health.py`:**

```python
@router.get("/health")
async def health_check():
    """Health check endpoint for load balancer."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
```

---

## Summary

This implementation plan provides comprehensive guidance for implementing the three chat/message API endpoints:

1. **GET /api/projects/{project_id}/messages** - Simple paginated retrieval with ownership verification
2. **POST /api/projects/{project_id}/chat** - Complex orchestration with AI agent routing, RAG, and side effects
3. **POST /api/projects/{project_id}/messages/{message_id}/feedback** - Simple update with validation

**Key implementation priorities:**

1. Start with service layer for separation of concerns
2. Implement authentication and authorization dependencies
3. Build simple endpoints first (list, feedback)
4. Implement complex chat orchestration with proper error handling
5. Add rate limiting and monitoring
6. Write comprehensive tests
7. Deploy with health checks and logging

**Critical success factors:**

- Meet 10-second response time requirement for chat endpoint
- Proper authorization checks on all endpoints
- Graceful error handling for AI service failures
- Comprehensive logging for debugging and analytics
- Rate limiting to prevent abuse
- Async operations for optimal performance

