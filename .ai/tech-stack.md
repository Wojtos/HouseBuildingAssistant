## Frontend - Astro with React for Interactive Components:

* **Astro 5** allows for the creation of fast, efficient websites and applications with minimal JavaScript.
* **React 19** will provide interactivity where it is needed.
* **TypeScript 5** for static code typing and better IDE support.
* **Tailwind 4** allows for convenient application styling.
* **Shadcn/ui** provides a library of accessible React components, on which we will base the UI.

## Backend - Supabase:

* **Supabase** provides **user authentication** and **PostgreSQL database** for all data storage.
* **PostgreSQL with JSONB** stores **structured Project Memory** (agent domain facts: FINANCE, PERMITTING, etc.).
* **pgvector extension** enables vector embeddings storage for semantic search and RAG.
* Stores user accounts, structured project facts, and embedded OCR-extracted text chunks in a unified database.

## AI Agents and Orchestration:

* **Python backend** integrates MCP (Model Context Protocol) server functionality, agent orchestration, and API endpoints.
* **LangChain** for agent coordination logic and orchestrator agent implementation.
* **MCP functionality** (part of Python backend) handles Project Memory read/write operations with JSON Schema validation.
* **Google Search** integration for specialized sub-agents to ground their responses in current information.
* **OCR (Optical Character Recognition)** for text extraction from uploaded documents and photos.
* **Vector embeddings** (via OpenRouter/OpenAI) for document chunks to enable semantic search and RAG retrieval.

## AI - Communication with Models via the Openrouter.ai Service:

* Access to a **wide range of models** (OpenAI, Anthropic, Google, and many others), which will allow us to find a solution ensuring high efficiency and low costs.
* Allows setting **financial limits on API keys**.
* Powers **9 specialized sub-agents** (8 specialized + 1 Triage) for domain-specific expertise in home building.

## CI/CD and Hosting:

* **Github Actions** for creating CI/CD pipelines.
* **DigitalOcean** for hosting the application via a Docker image.
