# RAG Context Flow - Technical Deep Dive

## 🔄 **Complete Data Flow**

This document explains how context flows through the RAG pipeline from user query to AI response.

---

## 1️⃣ **User Sends Message**

**Request:**
```http
POST /api/projects/387d96a1-ee23-4845-b702-41b6c8f5cb03/chat
Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "content": "What's my budget and can I afford a basement?"
}
```

---

## 2️⃣ **Message API Endpoint**

**File:** `backend/app/api/messages.py`

**Process:**
```python
async def send_message(...):
    # Initialize RAG services
    document_service = get_document_retrieval_service(supabase, ai_client)
    memory_service = get_project_memory_service(supabase)
    
    # Create orchestration with RAG
    chat_service = get_chat_orchestration_service(
        ai_client=ai_client,
        message_service=message_service,
        document_service=document_service,  # ← RAG component
        memory_service=memory_service,      # ← RAG component
    )
    
    # Process with timeout
    response = await chat_service.process_chat(
        project_id=project_id,
        user_id=user_id,
        content=request.content,
    )
```

**Key:** RAG services are injected into the orchestration service.

---

## 3️⃣ **Chat Orchestration - Step 1: Store User Message**

**File:** `backend/app/services/chat_orchestration_service.py`

```python
async def process_chat(self, project_id, user_id, content):
    # Step 1: Store user message
    user_msg = await self.message_service.create_message(
        project_id=project_id,
        user_id=user_id,
        role=MessageRole.USER,
        content=content,
    )
```

**Database:** Message saved to `messages` table.

---

## 4️⃣ **Chat Orchestration - Step 2: Retrieve Context (RAG)**

**This is where RAG magic happens! 🎯**

```python
    # Step 2: Retrieve context (RAG)
    context = await self._retrieve_context(
        project_id=project_id,
        user_message=content,
    )
```

### **4a. Inside `_retrieve_context()`:**

#### **Context Source 1: Chat History**
```python
# Get recent chat history (last 5 messages)
chat_history = await self.message_service.get_recent_history(
    project_id=project_id,
    limit=5,
)

# Format for AI
history_messages = [
    {"role": msg.role, "content": msg.content}
    for msg in chat_history
]
```

**Result:**
```python
[
    {"role": "user", "content": "What's my plot size?"},
    {"role": "assistant", "content": "Your plot is 1000 sq m in Warsaw."},
    {"role": "user", "content": "What's my budget?"},
    {"role": "assistant", "content": "Your budget is $250,000."},
]
```

#### **Context Source 2: Project Memory (JSONB)**
```python
if self.memory_service:
    project_memory = await self.memory_service.get_memory(project_id)
```

**Database Query:**
```sql
SELECT data FROM project_memory 
WHERE project_id = '387d96a1-ee23-4845-b702-41b6c8f5cb03'
```

**Result:**
```python
{
    "FINANCE": {
        "budget": "$250,000",
        "loan_approved": True,
        "down_payment": "$50,000"
    },
    "LAND": {
        "location": "Warsaw, Poland",
        "plot_size": "1000 sq m",
        "soil_type": "Clay"
    },
    "PERMITTING": {
        "building_permit": "In progress",
        "zoning_approved": True
    }
}
```

#### **Context Source 3: Document Search (Vector Similarity)**
```python
if self.document_service:
    chunks = await self.document_service.search_documents(
        project_id=project_id,
        query=user_message,
        top_k=5,
        similarity_threshold=0.7,
    )
    
    relevant_documents = [
        {
            "content": chunk.content,
            "source": chunk.metadata.get("filename"),
            "similarity": chunk.similarity,
        }
        for chunk in chunks
    ]
```

**How Document Search Works:**

1. **Generate Query Embedding:**
```python
query_embedding = await self.ai_client.generate_embedding(
    text="What's my budget and can I afford a basement?",
    model="openai/text-embedding-3-small",
)
# Result: [0.123, -0.456, 0.789, ...] (1536 dimensions)
```

2. **Fetch All Chunks:**
```sql
SELECT * FROM document_chunks 
WHERE project_id = '387d96a1-ee23-4845-b702-41b6c8f5cb03'
```

3. **Calculate Cosine Similarity:**
```python
for chunk in chunks:
    similarity = cosine_similarity(query_embedding, chunk.embedding)
    # Formula: (A·B) / (||A|| * ||B||)
    # Range: 0.0 to 1.0
```

4. **Filter and Rank:**
```python
# Keep only chunks with similarity ≥ 0.7
filtered = [c for c in chunks if c.similarity >= 0.7]

# Sort by similarity (highest first)
sorted_chunks = sorted(filtered, key=lambda c: c.similarity, reverse=True)

# Return top 5
top_chunks = sorted_chunks[:5]
```

**Result:**
```python
[
    {
        "content": "Basement construction costs typically add $30-50k...",
        "source": "construction_costs.pdf",
        "similarity": 0.89
    },
    {
        "content": "For a $250k budget, basement is feasible if...",
        "source": "budget_planning.pdf",
        "similarity": 0.82
    }
]
```

### **4b. Assembled Context:**

```python
context = {
    "chat_history": [...],           # Last 5 messages
    "project_memory": {...},         # JSONB facts
    "relevant_documents": [...]      # Top 5 chunks
}
```

---

## 5️⃣ **Chat Orchestration - Step 3: Route to Agent**

```python
    # Step 3: Determine which agent should handle this
    agent_id = await self._route_to_agent(
        user_message=content,
        context=context,  # Agent routing can use context!
    )
```

**Result:** `"FINANCE_ESTIMATOR_AGENT"`

---

## 6️⃣ **Chat Orchestration - Step 4: Execute Agent with Full Context**

**This is where context is formatted for the AI! 📝**

```python
    # Step 4: Execute agent with context
    response_content = await self._execute_agent(
        agent_id=agent_id,
        user_message=content,
        context=context,  # ← Full RAG context
    )
```

### **6a. Inside `_execute_agent()`:**

#### **Build System Prompt:**
```python
system_prompt = self._get_agent_prompt("FINANCE_ESTIMATOR_AGENT")
# Result: "You are a construction finance expert..."
```

#### **Format Project Memory:**
```python
memory_str = self._format_project_memory(context["project_memory"])
```

**Result:**
```
FINANCE:
  - budget: $250,000
  - loan_approved: True
  - down_payment: $50,000
LAND:
  - location: Warsaw, Poland
  - plot_size: 1000 sq m
  - soil_type: Clay
PERMITTING:
  - building_permit: In progress
  - zoning_approved: True
```

#### **Format Documents:**
```python
docs_str = self._format_documents(context["relevant_documents"])
```

**Result:**
```
Document 1 (from construction_costs.pdf, relevance: 0.89):
Basement construction costs typically add $30-50k depending on soil 
conditions and depth required. Clay soil may require additional drainage.

Document 2 (from budget_planning.pdf, relevance: 0.82):
For a $250k budget, basement is feasible if foundation costs stay under
$60k. Consider soil testing first.
```

#### **Format Chat History:**
```python
history_str = self._format_chat_history(context["chat_history"][-3:])
```

**Result:**
```
User: What's my plot size?
Assistant: Your plot is 1000 sq m in Warsaw.
User: What's my budget?
Assistant: Your budget is $250,000.
```

#### **Combine All Context:**
```python
combined_context = f"""
=== PROJECT FACTS ===
{memory_str}

=== RELEVANT DOCUMENTS ===
{docs_str}

=== RECENT CONVERSATION ===
{history_str}
"""
```

#### **Build Messages for AI:**
```python
messages = [
    {
        "role": "system",
        "content": "You are a construction finance expert..."
    },
    {
        "role": "system",
        "content": f"Context for this query:\n\n{combined_context}"
    },
    {
        "role": "user",
        "content": "What's my budget and can I afford a basement?"
    }
]
```

#### **Call AI:**
```python
response = await self.ai_client.chat_completion(
    messages=messages,
    model="openai/gpt-4-turbo",
    temperature=0.7,
)
```

**AI Sees:**
- Agent role (finance expert)
- Project facts (budget, location, soil type)
- Relevant documents (basement costs, budget planning)
- Recent conversation (context continuity)
- Current question

**AI Response:**
```
Based on your project details:
- Budget: $250,000
- Location: Warsaw, Poland
- Soil: Clay (may need drainage)

According to your construction cost documents, adding a basement 
typically costs $30-50k. With your $250k budget, this is feasible, 
but I recommend:

1. Get soil testing first (clay requires assessment)
2. Budget $40-50k for basement given soil type
3. Ensure remaining $200k covers main structure

The basement is affordable within your budget if other costs stay 
on target.
```

**Notice how the AI:**
- References exact budget from memory ✅
- Mentions location and soil type from memory ✅
- Uses document info about basement costs ✅
- Provides soil-specific advice (clay drainage) ✅
- Gives budget calculation specific to user's $250k ✅

---

## 7️⃣ **Chat Orchestration - Step 5: Store Assistant Response**

```python
    # Step 5: Store assistant response
    assistant_msg = await self.message_service.create_message(
        project_id=project_id,
        user_id=user_id,
        role=MessageRole.ASSISTANT,
        content=response_content,
        metadata={
            "agent_id": agent_id,
            "context_used": {
                "memory_domains": len(context["project_memory"]),
                "history_messages": len(context["chat_history"]),
                "documents": len(context["relevant_documents"]),
            }
        }
    )
```

**Database:** Assistant message saved with metadata about context used.

---

## 8️⃣ **Return Response to User**

```python
    # Step 6: Return response
    return {
        "message_id": str(assistant_msg.id),
        "content": response_content,
        "agent_id": agent_id,
        "created_at": assistant_msg.created_at,
        "routing_metadata": {
            "agent_id": agent_id,
            "confidence": 0.95,
            "alternatives": []
        }
    }
```

**HTTP Response:**
```json
{
  "message_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "content": "Based on your project details: Budget: $250,000...",
  "agent_id": "FINANCE_ESTIMATOR_AGENT",
  "created_at": "2026-01-04T15:30:00Z",
  "routing_metadata": {
    "agent_id": "FINANCE_ESTIMATOR_AGENT",
    "confidence": 0.95,
    "alternatives": []
  }
}
```

---

## 📊 **Context Flow Diagram**

```
┌─────────────────────────────────────────────────────┐
│              User Query                              │
│  "What's my budget and can I afford a basement?"    │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│         Chat Orchestration Service                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Step 1: Store User Message ✓                       │
│  ├── Database: INSERT INTO messages                 │
│                                                       │
│  Step 2: Retrieve Context (RAG) 🎯                  │
│  ├── Chat History                                    │
│  │   └── SELECT * FROM messages (last 5)            │
│  │       Result: [...conversation context...]       │
│  │                                                    │
│  ├── Project Memory (JSONB)                          │
│  │   └── SELECT data FROM project_memory            │
│  │       Result: {FINANCE: {budget: "$250k"}, ...}  │
│  │                                                    │
│  └── Document Search (Vector)                        │
│      ├── Generate query embedding                    │
│      ├── Fetch all chunks for project                │
│      ├── Calculate cosine similarity                 │
│      ├── Filter by threshold (≥0.7)                  │
│      └── Return top 5 chunks                         │
│          Result: [{content: "...", similarity: 0.89}]│
│                                                       │
│  Context Assembled: {                                │
│    chat_history: [...],                              │
│    project_memory: {...},                            │
│    relevant_documents: [...]                         │
│  }                                                    │
│                                                       │
│  Step 3: Route to Agent                              │
│  └── Selected: FINANCE_ESTIMATOR_AGENT              │
│                                                       │
│  Step 4: Execute Agent with Context                  │
│  ├── Format project memory                           │
│  ├── Format documents                                │
│  ├── Format chat history                             │
│  ├── Build system prompts                            │
│  └── Call AI with enriched context                   │
│      ├── System: "You are finance expert..."        │
│      ├── System: "Context: [formatted context]"     │
│      └── User: "What's my budget..."                │
│                                                       │
│  Step 5: Store Assistant Response ✓                 │
│  └── Database: INSERT INTO messages                 │
│                                                       │
│  Step 6: Return Response ✓                          │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│            AI Response (Context-Aware)               │
│                                                       │
│  "Based on YOUR project details:                    │
│   - Budget: $250,000                                 │
│   - Location: Warsaw, Poland                         │
│   - Soil: Clay                                       │
│                                                       │
│  According to YOUR documents, basement costs         │
│  $30-50k. This is feasible with YOUR budget..."     │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 **Key RAG Benefits Illustrated**

### **Without RAG:**
```
User: "Can I afford a basement?"
AI: "Basement costs typically range from $30-80k depending on 
     many factors like location, size, soil conditions..."
```
❌ Generic, not personalized

### **With RAG:**
```
User: "Can I afford a basement?"
AI: "Based on YOUR $250k budget in Warsaw with clay soil, 
     yes - budget $40-50k for the basement according to your 
     construction cost documents. This leaves $200k for the 
     main structure, which is feasible."
```
✅ Specific to user's project  
✅ References their documents  
✅ Uses their budget  
✅ Considers their soil type  

---

## 🔍 **Logging the RAG Pipeline**

**Enable debug logging to see RAG in action:**

```python
# In backend logs:
INFO: Retrieving RAG context for project 387d96a1-...
INFO: Retrieved project memory with 3 domains
INFO: Retrieved 5 relevant document chunks
INFO: RAG context assembled: 4 history messages, 3 memory domains, 5 document chunks
INFO: Added RAG context: 3 sections, 1847 characters
INFO: Chat processed for project 387d96a1-..., agent: FINANCE_ESTIMATOR_AGENT (with RAG)
```

**View logs:**
```bash
docker logs homebuild-backend --tail 100 | grep RAG
```

---

## 💡 **Production Optimization Ideas**

### **1. Parallel Context Retrieval:**
```python
# Execute all context retrieval in parallel
chat_history_task = asyncio.create_task(get_history())
memory_task = asyncio.create_task(get_memory())
docs_task = asyncio.create_task(search_docs())

chat_history, memory, docs = await asyncio.gather(
    chat_history_task, memory_task, docs_task
)
```

### **2. Context Caching:**
```python
# Cache project memory in Redis
cache_key = f"memory:{project_id}"
memory = await redis.get(cache_key)
if not memory:
    memory = await db.get_memory(project_id)
    await redis.set(cache_key, memory, ttl=300)  # 5 min cache
```

### **3. Streaming Responses:**
```python
# Stream AI response as it generates
async for chunk in ai_client.chat_completion_stream(...):
    yield chunk
```

### **4. Context Window Management:**
```python
# Truncate context to fit LLM limits (e.g., 8k tokens)
context = smart_truncate(context, max_tokens=6000)
```

---

## ✨ **Summary**

**The RAG Pipeline:**
1. ✅ Retrieves multiple context sources
2. ✅ Formats for AI consumption
3. ✅ Enriches every agent call
4. ✅ Results in personalized, accurate responses
5. ✅ Fully tested and operational

**Test it yourself:**
```bash
.ai/endpoints/test_rag_pipeline.sh
```

**Context makes all the difference! 🎯**

