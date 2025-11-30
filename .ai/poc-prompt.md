# Proof of Concept (PoC) Development Prompt: HomeBuild AI Assistant

## PoC Objective
Build a **minimal proof of concept** to validate the core technical feasibility of:
1. **Multi-agent chat interface** with intelligent routing
2. **Agent coordination** using an orchestrator pattern
3. **Simple project memory** stored in PostgreSQL and provided in full to agent prompts

## ⚠️ CRITICAL INSTRUCTION
**You MUST create a detailed implementation plan and obtain my explicit approval BEFORE writing any code.**

Your plan should include:
- Exact file structure you will create
- Technology choices for each component
- API endpoints you will implement
- Database schema design
- Agent architecture (how many agents, their responsibilities)
- Estimated development steps in sequence

**Only proceed with implementation after I approve your plan.**

---

## IN SCOPE for PoC

### 1. Frontend (Minimal)
- **Single-page chat interface** (no complex navigation)
- **Message input/output** display
- **User authentication** (Supabase Auth - email/password only)
- **Basic styling** (Tailwind CSS - functional, not polished)

### 2. Backend & Agent System (Core Focus)
- **3 AGENTS MAXIMUM** (not 9):
  1. **Orchestrator/Triage Agent** - Routes user queries to specialist agents
  2. **Construction Agent** - Handles 1-2 construction domains (e.g., Foundation + Framing)
  3. **Finance Agent** - Handles budget and cost questions
- **Agent coordination logic** - Orchestrator selects appropriate specialist agent based on user query
- **LLM integration** via OpenRouter.ai (use a single cost-effective model, e.g., GPT-3.5 or Claude Haiku)
- **No LangChain** - Use direct API calls for simplicity and transparency

### 3. Project Memory (Simplified)
- **PostgreSQL database** (Supabase) with a simple schema:
  ```sql
  -- Users table (handled by Supabase Auth)

  -- Projects table
  CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  -- Project memory as single JSONB column
  CREATE TABLE project_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    memory_data JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  );

  -- Chat history
  CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    agent_name TEXT, -- which agent responded
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- **Memory structure** (JSONB format):
  ```json
  {
    "FINANCE": {
      "budget": 500000,
      "currency": "USD",
      "loan_amount": 400000
    },
    "CONSTRUCTION": {
      "foundation_type": "slab",
      "square_footage": 2000,
      "stories": 1
    },
    "PROJECT_INFO": {
      "location": "Austin, TX",
      "project_phase": "planning",
      "start_date": "2025-03-01"
    }
  }
  ```

- **Memory access**: Load entire JSONB object into agent prompt at start of each turn
- **Memory updates**: Agents can update their domain via structured JSON response
- **NO vector search, NO embeddings, NO pgvector**

### 4. Core User Flow
```
1. User signs up / logs in (Supabase Auth)
2. User creates a new project (creates project_id, initializes empty memory)
3. User sends message in chat
4. Backend:
   a. Loads full project memory from DB
   b. Sends user query + memory to Orchestrator agent
   c. Orchestrator routes to specialist agent OR answers directly
   d. Specialist agent processes query with memory context
   e. Agent optionally updates memory (returns structured JSON)
   f. Backend saves updated memory to DB
   g. Returns agent response to frontend
5. Frontend displays agent response
6. Repeat from step 3
```

---

## OUT OF SCOPE for PoC

### Explicitly Exclude:
- ❌ **9 agents** - Use only 3 agents (Orchestrator + 2 specialists)
- ❌ **RAG / Vector search / pgvector** - No document embeddings
- ❌ **Document/photo upload** - No file handling
- ❌ **OCR processing** - Not needed without uploads
- ❌ **Google Search integration** - Agents use LLM knowledge only
- ❌ **MCP (Model Context Protocol)** - Use simple REST API
- ❌ **LangChain** - Direct OpenRouter API calls only
- ❌ **Complex UI** - No "Project Files" section, no phase tracking UI
- ❌ **JSON Schema validation** - Basic validation is sufficient
- ❌ **Production deployment** - Local development only
- ❌ **CI/CD pipeline** - Not needed for PoC
- ❌ **Docker containerization** - Run locally
- ❌ **Advanced error handling** - Basic try/catch is fine
- ❌ **Rate limiting** - Not needed for PoC
- ❌ **Comprehensive testing** - Manual testing only

---

## Technical Constraints

### Stack Simplification
Choose the **simplest viable implementation**:

**Option A (Recommended for Speed):**
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + Shadcn/ui
- **Backend**: Next.js API Routes (same codebase)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **AI**: OpenRouter.ai API (direct fetch calls)

**Option B (Per Original Stack):**
- **Frontend**: Astro 5 + React 19 islands + TypeScript + Tailwind
- **Backend**: Python (FastAPI or Flask) with simple REST endpoints
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **AI**: OpenRouter.ai API

**You must choose one option and justify it in your plan.**

### Agent Architecture Requirements
- **Orchestrator prompt**: Must route queries to correct specialist with >80% accuracy (qualitative assessment)
- **Specialist prompts**: Must access and understand project memory context
- **Memory updates**: Agents should return structured JSON indicating memory changes
- **Latency**: Acceptable response time is 5-10 seconds

### Database Requirements
- Must use Supabase PostgreSQL
- Must store project memory as JSONB
- Must maintain chat history
- Row-level security (RLS) can be skipped for PoC

---

## Success Criteria

The PoC is successful if it demonstrates:

1. ✅ **User can authenticate** and create a project
2. ✅ **User can send chat messages** and receive agent responses
3. ✅ **Orchestrator correctly routes** queries to specialist agents (manual testing with 5-10 sample queries)
4. ✅ **Agents access project memory** and use it in responses (e.g., "What's my budget?" retrieves stored budget)
5. ✅ **Agents update project memory** when user provides new information (e.g., "My budget is $500k" updates FINANCE.budget)
6. ✅ **Memory persists** across chat sessions (close browser, log back in, memory is retained)
7. ✅ **Chat history is displayed** when user returns to project

---

## Deliverables

After obtaining approval for your plan, you will create:

1. **Working application** that can be run locally
2. **Database setup script** (SQL schema for Supabase)
3. **Environment variables template** (`.env.example`)
4. **README.md** with:
   - Setup instructions
   - How to run locally
   - How to test agent routing
   - Example queries for each agent
   - Known limitations

---

## Development Approach

1. **PLAN FIRST**: Create detailed implementation plan and get approval
2. **Start minimal**: Get basic chat working before adding agents
3. **Iterate**: Add agents one at a time
4. **Test continuously**: Manually verify each feature works before moving on
5. **Keep it simple**: Avoid abstractions, frameworks, and over-engineering

---

## Example Test Queries

Use these to validate agent routing:

**Orchestrator/Triage:**
- "Hello, I'm planning to build a house"
- "What is this assistant for?"
- "Show me my project summary"

**Finance Agent:**
- "My total budget is $500,000"
- "What's my current budget?"
- "How much should I allocate for foundation?"

**Construction Agent:**
- "I'm planning a slab foundation"
- "What's involved in framing a single-story house?"
- "Update my project: 2000 square feet, single story"

---

## Final Reminder

⚠️ **DO NOT START CODING UNTIL I APPROVE YOUR PLAN** ⚠️

Your first response should be:
1. Your chosen technology stack (Option A or B, with justification)
2. Detailed file structure
3. Database schema
4. Agent design (prompts outline, routing logic)
5. API endpoints list
6. Step-by-step implementation sequence
7. Estimated complexity/time for each step

Then wait for my approval before proceeding.
