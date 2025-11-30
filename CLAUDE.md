# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HomeBuild AI Assistant** is an AI-powered guide for homeowners building a house, covering the entire process from plot selection to furnishing. The system uses a multi-agent architecture with specialized agents for different construction phases.

## High-Level Architecture

### Multi-Agent System Design

The application uses **9 distinct specialized agents** coordinated by an orchestrator:

1. **Land & Feasibility Agent** - Land search, site analysis, soil reports, initial budgeting, zoning
2. **Regulatory & Permitting Agent** - Zoning codes, permit applications, inspections
3. **Architectural Design Agent** - Layouts, structural concepts, material selection, energy standards
4. **Finance & Legal Agent** - Mortgages, loans, contracts, insurance, lien waivers
5. **Site Prep & Foundation Agent** - Excavation, grading, drainage, foundation types
6. **Shell & Systems Agent** - Framing, roofing, exterior walls, MEP rough-in
7. **Procurement & Quality Agent** - Material logistics, cost estimating, quality control
8. **Finishes & Furnishing Agent** - Interior finishes, cabinetry, flooring, fixtures
9. **Triage & Memory Agent** - Greetings, ambiguity handling, memory operations, general queries

### Project Memory (RAG) System

**Hybrid Architecture:**

**1. Structured Memory (JSONB):**
- Stores core project facts organized by agent domain (e.g., "FINANCE", "PERMITTING")
- Content: Budget, location, timelines, contractor info, regulatory requirements
- Access: Loaded in full at the start of every user turn (small, <5k tokens)
- Write: All agents have read/write access with JSON Schema validation

**2. Document Memory (pgvector):**
- OCR-extracted text from uploaded PDFs/images, chunked and embedded
- Original files NOT stored—only extracted text chunks
- Chunking: 500-1000 tokens per chunk with metadata (filename, chunk index, category)
- Access: Vector similarity search retrieves top 3-5 relevant chunks per query
- Embeddings: Generated via OpenRouter/OpenAI API

**Agent Context per Turn:**
- Structured memory (full JSONB) + Relevant document chunks (vector search) + Web search results

**Critical Design Rule**: RAG-based facts (structured memory + document chunks) take priority over contradictory web search findings.

### Stack and Infrastructure

- **Backend**: Python backend integrating MCP functionality, API endpoints, and LangChain for agent coordination
- **Database**: Supabase PostgreSQL with:
  - JSONB columns for structured Project Memory
  - pgvector extension for vector embeddings and semantic search
  - User authentication via Supabase Auth
- **Frontend**: Astro 5 with React 19 for interactive components, TypeScript 5, Tailwind 4, Shadcn/ui
- **AI Integration**:
  - OpenRouter.ai for LLM access (OpenAI, Anthropic, Google)
  - Embedding API for document vectorization (OpenRouter/OpenAI)
- **External Tools**: Google Search grounding for all specialized agents
- **Document Processing**: OCR for text extraction, chunking, and embedding pipeline
- **Hosting**: DigitalOcean via Docker, GitHub Actions for CI/CD
- **Latency**: Maximum 10-second response time acceptable

### Agent Prompt Requirements

All agent system prompts must include:
- Legal disclaimer (AI guidance, not professional advice)
- Project context reminder (user's location and budget)
- Prioritization rule for RAG facts over web search

## Project Documentation

Key planning documents are located in `.ai/`:
- `.ai/prd.md` - Full Product Requirements Document with detailed agent specifications
- `.ai/mvp.md` - MVP scope and success criteria

## Development Constraints

- **No real-time/low-latency requirements** - 10 seconds is acceptable
- **No native mobile app** - Web-first responsive design
- **No marketplace/payments** - Advisory only, no transactions
- **No complex blueprint analysis** - Simple OCR text extraction only

## Success Metrics

- **Routing Accuracy**: ≥90% correct agent routing
- **Context Retention**: Answer questions using data from 5+ turns ago
- **User Progression**: Track phase completion in Firestore
- **Advice Quality**: CSAT ≥85% via in-chat feedback
