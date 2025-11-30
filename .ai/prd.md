## 📄 Product Requirements Document (PRD): HomeBuild AI Assistant (MVP)

### 1. 🚀 Goal and Vision

| Field | Detail |
| :--- | :--- |
| **Product Name** | **HomeBuild AI Assistant** |
| **Vision** | To be the affordable, context-aware, specialized AI guide for anyone building a house, from plot selection to furnishing. |
| **Main Problem Solved** | Overwhelming complexity and knowledge requirements of the multi-year home-building process, where general AI lacks context and human consultants are too expensive. |
| **Target User** | Individuals (homeowners, self-builders) undertaking or planning a residential construction project. |

---

### 2. ✨ Minimum Viable Product (MVP) Scope

| Component | Description |
| :--- | :--- |
| **Web-Based Chat Interface** | Responsive web application with **Supabase user authentication** to save project progress. |
| **Orchestrator Agent (Python/LangChain)** | Smart routing system to direct queries to the correct specialized sub-agent. |
| **N=9 Specialized Sub-Agents** | Experts grounded in Google Search and project memory (see Section 3). |
| **Project Memory (RAG)** | **Supabase PostgreSQL** with JSONB for structured project facts and **pgvector** for semantic search of OCR-extracted document text. |
| **Iterative Guidance** | System guides the user through the construction phases without forcing a strict linear path. |
| **Document/Photo Upload** | Users can upload files for **OCR/text extraction** and RAG context. |

#### Out of Scope (for MVP)

* Real-Time/Low-Latency Responses (10-second maximum response time is acceptable).
* Native Mobile App.
* Direct Marketplace/Hiring/Payments/Monetization.
* Advanced Physical Document Processing (i.e., automated analysis of complex blueprints/image recognition beyond simple text extraction).

---

### 3. 🧠 Agent Structure and Roles

The system uses **9 distinct, highly bounded agents** (8 specialized + 1 Triage) to ensure specialization and high routing accuracy.

| ID | Agent Name | Primary Function / Bounded Expertise |
| :--- | :--- | :--- |
| **1** | **Land & Feasibility Agent** | Land search, site analysis, soil reports, initial high-level budget, zoning interpretation. |
| **2** | **Regulatory & Permitting Agent** | **Zoning codes**, local regulations, **permit application process**, required inspections/paperwork. |
| **3** | **Architectural Design Agent** | Layouts, structural concepts, material selection (design only), energy standards. |
| **4** | **Finance & Legal Agent** | Mortgages, construction loans, **contracts, insurance, lien waivers**, closing processes. |
| **5** | **Site Prep & Foundation Agent** | **Excavation, grading, drainage**, and foundation types (slabs, basements, footings). |
| **6** | **Shell & Systems Agent** | **Framing, roofing, exterior walls**, and rough-in of MEP (HVAC, Plumbing, Electrical). |
| **7** | **Procurement & Quality Agent** | Material logistics, general cost estimating, **quality control checks**, scheduling advice. |
| **8** | **Finishes & Furnishing Agent** | Interior layout/finishes, cabinetry, flooring, fixture selection, smart home integration. |
| **9** | **Triage & Memory Agent** | Handles greetings, ambiguity, **Memory Update/Retrieval**, project status summaries, and general/out-of-scope queries (using web search). |

---

### 4. 💾 Data and Memory Management

#### 4.1. Project Memory (RAG) Structure and Access

**Structured Memory (JSONB):**
* **Structure:** JSON structured with top-level keys corresponding to the specialized agent domains (e.g., $\text{"FINANCE"}$, $\text{"PERMITTING"}$), stored in Supabase PostgreSQL JSONB columns.
* **Content:** Core project facts only (budget, location, timelines, contractor info, etc.). Does NOT include OCR-extracted document text.
* **Access Frequency:** The **Orchestrator or Sub-Agent** will fetch the latest structured memory JSON from the **Python backend** (with integrated MCP functionality) **at the start of every single user turn** for contextual use.
* **Write Permissions:** The **Orchestrator and all Sub-Agents have full read/write permission** to the structured Project Memory via the **Python backend** (with integrated MCP functionality).
* **Validation:** The **Python backend** must implement **JSON Schema validation** on all memory update requests for critical data fields (e.g., ensuring numeric budget, correct data formats).

**Document Memory (Vector RAG with pgvector):**
* **Structure:** OCR-extracted text split into chunks, embedded as vectors, and stored in PostgreSQL using the **pgvector extension**.
* **Content:** Text extracted from uploaded PDFs and images. Original files are NOT stored—only extracted text.
* **Chunking Strategy:** Documents split into semantically meaningful chunks (~500-1000 tokens each) with metadata (source filename, chunk index, category).
* **Access Pattern:** Agents perform **vector similarity search** to retrieve only the most relevant chunks (typically top 3-5) based on the user's query.
* **Embedding Model:** Generate embeddings via OpenRouter or OpenAI API (e.g., text-embedding-ada-002 or similar).

#### 4.2. Document and Photo Uploads

* **Functionality:** Users can upload photos and documents (PDFs, text files, common image formats) via the web interface.
* **Processing Pipeline:**
  1. The **Python backend** performs **Optical Character Recognition (OCR)** on uploaded files (simple text extraction only).
  2. Extracted text is **chunked** into semantically meaningful segments (~500-1000 tokens each).
  3. Each chunk is **embedded** using an embedding model (via OpenRouter/OpenAI).
  4. Chunks and their vector embeddings are stored in PostgreSQL using **pgvector**.
  5. **Original files are NOT stored**—only the extracted text chunks and embeddings.
* **Metadata Storage:** Track uploaded file metadata (filename, upload date, file type) in a separate table linked to the document chunks.
* **Display:** The web interface must include a dedicated **"Project Files"** section that allows users to view a list of all uploaded files and browse the extracted text chunks.
* **RAG Integration:**
  * On each user query, agents perform **vector similarity search** to retrieve relevant document chunks.
  * Agents are prompted to pull key facts from retrieved chunks and integrate them into the structured Project Memory JSONB when appropriate (e.g., an agent extracts a setback from a zoning PDF and writes it to the $\text{PERMITTING}$ key).
  * Retrieved document chunks are included in agent context alongside structured memory.

---

### 5. ⚙️ Technical Requirements and Constraints

* **Backend Stack:** **Python** backend integrating MCP functionality, API endpoints, and **LangChain** for agent coordination logic.
* **Database:** Supabase PostgreSQL with:
  * **JSONB** for structured Project Memory (agent domain facts).
  * **pgvector extension** for vector embeddings and semantic search of OCR-extracted text.
* **RAG Architecture:** Hybrid approach combining structured JSONB retrieval + vector similarity search for document chunks.
* **Latency Constraint:** Maximum response time for complex queries is **10 seconds**.
* **Agent Prompts:** All agent system prompts must include a **Mandatory Preamble Template** covering:
    * **Legal Disclaimer** (AI guidance, not professional advice).
    * **Project Context Reminder** (always remember user's location and budget).
    * **Prioritization Rule:** Prioritize RAG-based Project Memory facts (including extracted document facts) over contradictory general web search findings.

---

### 6. ✅ Success Criteria

| Criterion | Metric | Measurement |
| :--- | :--- | :--- |
| **Routing Accuracy** | $\geq 90\%$ of queries correctly routed to the intended specialist agent. | Agent logs vs. validated ground truth/user feedback. |
| **Context Retention** | Successfully answering questions using data stored 5+ turns ago. | Log analysis of RAG retrieval success. |
| **User Progression** | Users successfully move from one phase to the next. | Tracking of phase completion status in Supabase Project Memory. |
| **Advice Quality** | Customer Satisfaction (CSAT) score $\geq 85\%$ for advice provided. | In-chat "Was this answer helpful? (Yes/No)" feedback mechanism. |