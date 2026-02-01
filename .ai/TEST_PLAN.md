# HomeBuild AI Assistant - Comprehensive Test Plan

## Table of Contents

1. [Introduction and Testing Objectives](#1-introduction-and-testing-objectives)
2. [Test Scope](#2-test-scope)
3. [Types of Tests](#3-types-of-tests)
4. [Test Scenarios for Key Functionalities](#4-test-scenarios-for-key-functionalities)
5. [Test Environment](#5-test-environment)
6. [Testing Tools](#6-testing-tools)
7. [Test Schedule](#7-test-schedule)
8. [Test Acceptance Criteria](#8-test-acceptance-criteria)
9. [Roles and Responsibilities](#9-roles-and-responsibilities)
10. [Bug Reporting Procedures](#10-bug-reporting-procedures)

---

## 1. Introduction and Testing Objectives

### 1.1 Project Overview

HomeBuild AI Assistant is a multi-agent AI-powered web application designed to guide homeowners through the residential construction process. The system features:

- **Multi-agent architecture**: 9 specialized AI agents (8 domain-specific + 1 Triage) coordinated by an orchestrator
- **RAG (Retrieval-Augmented Generation)**: Hybrid context retrieval combining structured project memory (JSONB) and semantic document search (pgvector)
- **Document processing pipeline**: OCR, chunking, and vector embedding for uploaded documents
- **Web-based chat interface**: Astro 5 SSR frontend with React 19 interactive components

### 1.2 Testing Objectives

| Objective | Description | Priority |
|-----------|-------------|----------|
| **Functional Correctness** | Verify all features work according to PRD specifications | Critical |
| **Routing Accuracy** | Achieve ≥90% correct agent routing (per success criteria) | Critical |
| **Context Retention** | Validate RAG retrieves data from 5+ conversation turns ago | High |
| **Integration Integrity** | Ensure seamless communication between all system components | High |
| **Performance Compliance** | Confirm <10 second response time for complex queries | High |
| **Security Validation** | Verify authentication, authorization, and data isolation | Critical |
| **User Experience** | Validate responsive UI and error handling across devices | Medium |
| **Reliability** | Ensure graceful degradation when external services fail | High |

### 1.3 Success Metrics (from PRD)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Routing Accuracy | ≥90% | Agent logs vs. ground truth dataset |
| Context Retention | 5+ turns | Log analysis of RAG retrieval success |
| User Progression | Phase completion tracking | Project memory phase transitions |
| Advice Quality (CSAT) | ≥85% | In-chat feedback mechanism |

---

## 2. Test Scope

### 2.1 In Scope

#### Backend (Python/FastAPI)

| Component | Coverage |
|-----------|----------|
| API Endpoints | Projects, Messages, Documents, Facts, Profiles, Project Memory |
| Chat Orchestration Service | Full pipeline: message storage → context retrieval → routing → agent execution → response |
| Agent Routing | Triage logic for all 9 agents with confidence scoring |
| RAG Pipeline | Structured memory (JSONB) + Document search (pgvector) |
| Document Processing | OCR, chunking, embedding generation, storage |
| Fact Extraction | LLM-based extraction from conversations |
| Web Search Integration | Query detection, search execution, result formatting |
| OpenRouter Integration | Chat completion, JSON structured output, retry logic |
| Authentication/Authorization | Supabase Auth integration, project ownership validation |

#### Frontend (Astro/React)

| Component | Coverage |
|-----------|----------|
| Authentication Views | Login, signup, logout flows |
| Projects Management | List, create, settings, deletion |
| Chat Interface | Message thread, composer, CSAT rating, context indicators |
| Document Management | Upload, search, detail view, chunk browsing |
| Facts/Memory Views | Display and management of extracted facts |
| Error Handling | Inline banners, retry mechanisms, offline state |
| Responsive Design | Desktop, tablet, mobile breakpoints |

#### Database (Supabase PostgreSQL)

| Component | Coverage |
|-----------|----------|
| Schema Validation | All tables, constraints, enums |
| Row Level Security | Policy enforcement (when enabled) |
| Triggers | updated_at automation, profile creation on signup |
| Vector Operations | pgvector similarity search accuracy |
| JSONB Operations | Project memory read/write, validation |

### 2.2 Out of Scope

| Item | Reason |
|------|--------|
| Native Mobile App | Not in MVP scope |
| Payment/Transaction Processing | Advisory only |
| Complex Blueprint Analysis | Limited to simple OCR text extraction |
| Load Testing (>1000 concurrent users) | Deferred to production scaling phase |
| Third-party API uptime testing | External dependency |

### 2.3 Testing Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        TEST BOUNDARY                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Frontend  │◄──►│   Backend   │◄──►│     Database        │  │
│  │  (Astro/    │    │  (FastAPI)  │    │   (Supabase)        │  │
│  │   React)    │    │             │    │                     │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────────┘  │
│                            │                                     │
│                     ┌──────▼──────┐                              │
│                     │   MOCKED    │                              │
│                     │ External    │                              │
│                     │ Services    │                              │
│                     │ (OpenRouter,│                              │
│                     │  Google)    │                              │
│                     └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Types of Tests

### 3.1 Unit Tests

**Purpose**: Validate individual functions, methods, and components in isolation.

| Layer | Framework | Focus Areas |
|-------|-----------|-------------|
| Backend Services | pytest | Business logic, data transformations, validation |
| Backend Schemas | pytest | Pydantic model validation, serialization |
| Frontend Components | Jest + React Testing Library | Component rendering, event handling, state |
| Frontend Hooks | Jest | Custom hook behavior, state management |
| Utility Functions | pytest/Jest | Helper functions, formatters, parsers |

**Coverage Target**: ≥80% line coverage for critical services

### 3.2 Integration Tests

**Purpose**: Verify correct interaction between system components.

| Integration | Type | Focus |
|-------------|------|-------|
| API → Database | Backend Integration | CRUD operations, query correctness |
| API → OpenRouter | Service Integration | Request/response handling, retry logic |
| Chat Pipeline | End-to-End Backend | Full orchestration flow with mocked LLM |
| RAG Pipeline | Component Integration | Memory + Document retrieval accuracy |
| Frontend → API | API Contract | Request/response schema compliance |
| Auth Flow | Full Stack | Token handling, session management |

### 3.3 End-to-End (E2E) Tests

**Purpose**: Validate complete user journeys through the application.

| User Flow | Priority | Automation |
|-----------|----------|------------|
| New User Registration | Critical | Playwright |
| Project Creation | Critical | Playwright |
| Chat Conversation | Critical | Playwright |
| Document Upload | High | Playwright |
| Fact Confirmation | High | Playwright |
| Project Settings Update | Medium | Playwright |
| Multi-project Navigation | Medium | Playwright |

### 3.4 Contract Tests

**Purpose**: Ensure API contracts between frontend and backend remain stable.

| Contract | Validation Method |
|----------|-------------------|
| API Request Schemas | Pydantic validation + OpenAPI spec |
| API Response Schemas | Pydantic serialization tests |
| Database Types | TypeScript types sync with Python models |
| Agent Routing Schema | JSON Schema validation |

### 3.5 Performance Tests

**Purpose**: Validate system meets latency and throughput requirements.

| Metric | Target | Test Type |
|--------|--------|-----------|
| Chat Response Time | <10 seconds | Load testing |
| Document Search Latency | <2 seconds | Benchmark |
| Initial Page Load | <3 seconds | Lighthouse |
| API Response (non-LLM) | <500ms | Benchmark |
| Concurrent Users | 50 simultaneous | Stress test |

### 3.6 Security Tests

**Purpose**: Identify vulnerabilities and ensure data protection.

| Area | Test Type |
|------|-----------|
| Authentication Bypass | Manual + Automated |
| Authorization (IDOR) | API testing |
| Input Validation | Fuzzing |
| SQL Injection | Parameterized query validation |
| XSS Prevention | Input/output encoding tests |
| Token Security | JWT validation, expiration handling |

### 3.7 Accessibility Tests

**Purpose**: Ensure WCAG 2.1 AA compliance.

| Criteria | Tool |
|----------|------|
| Keyboard Navigation | Manual + axe-core |
| Screen Reader Compatibility | NVDA/VoiceOver manual testing |
| Color Contrast | Lighthouse/axe |
| ARIA Labels | Playwright axe integration |

---

## 4. Test Scenarios for Key Functionalities

### 4.1 Authentication & Authorization

#### TC-AUTH-001: User Registration
```
Scenario: New user successfully registers
Given: User is on signup page
When: User enters valid email, password, and full name
And: User submits the registration form
Then: User account is created in Supabase Auth
And: User profile is created in profiles table (via trigger)
And: User is redirected to projects list
```

#### TC-AUTH-002: User Login
```
Scenario: Existing user logs in successfully
Given: User has a registered account
When: User enters correct credentials
Then: User receives valid session token
And: User is redirected to projects list
And: Protected routes become accessible
```

#### TC-AUTH-003: Project Ownership Validation
```
Scenario: User cannot access another user's project
Given: User A owns Project X
And: User B is authenticated
When: User B attempts to access /projects/{projectX}/chat
Then: API returns 403 Forbidden
And: Frontend displays access denied message
```

#### TC-AUTH-004: Session Expiration
```
Scenario: Expired token is handled gracefully
Given: User session has expired
When: User attempts any authenticated action
Then: User is redirected to login page
And: Error message explains session expiration
And: After re-login, user returns to intended page
```

### 4.2 Chat Orchestration & Agent Routing

#### TC-CHAT-001: Basic Chat Flow
```
Scenario: User sends message and receives AI response
Given: User has an active project
When: User sends "What permits do I need for a single-family home?"
Then: User message is stored in database
And: Relevant context is retrieved (memory + documents)
And: Message is routed to REGULATORY_PERMITTING_AGENT
And: Assistant response is generated and stored
And: Response is displayed with routing metadata
```

#### TC-CHAT-002: Routing Accuracy - Land & Feasibility
```
Scenario: Land-related query routes correctly
Given: User project exists
When: User asks "What soil tests should I get for my lot?"
Then: Message routes to LAND_FEASIBILITY_AGENT
And: Confidence score is ≥0.7
```

#### TC-CHAT-003: Routing Accuracy - Finance & Legal
```
Scenario: Financial query routes correctly
Given: User project exists
When: User asks "How much should I budget for a construction loan?"
Then: Message routes to FINANCE_LEGAL_AGENT
And: Confidence score is ≥0.7
```

#### TC-CHAT-004: Context Retention (5+ Turns)
```
Scenario: System recalls information from earlier in conversation
Given: User stated "My budget is $500,000" 6 messages ago
And: This was stored in project memory
When: User asks "Can I afford a finished basement?"
Then: Response references the $500,000 budget
And: No clarification is needed about budget amount
```

#### TC-CHAT-005: Document-Aware Response
```
Scenario: Response incorporates uploaded document information
Given: User has uploaded a zoning document mentioning "15ft setback"
When: User asks "What are my property setback requirements?"
Then: System performs vector similarity search
And: Response cites the uploaded document
And: Response includes the 15ft setback information
```

#### TC-CHAT-006: Web Search Integration
```
Scenario: Current information queries trigger web search
Given: User project is in "Denver, CO"
When: User asks "What are current building permit fees in my area?"
Then: Web search service is invoked
And: Response includes current information with citations
And: Context metadata shows used_web_search: true
```

#### TC-CHAT-007: Graceful Fallback on Agent Error
```
Scenario: System handles agent routing failure
Given: OpenRouter service returns an error
When: User sends a message
Then: Message routes to TRIAGE_MEMORY_AGENT as fallback
And: Confidence score indicates fallback (0.50)
And: User receives a response (not an error page)
```

### 4.3 Project Memory & Fact Extraction

#### TC-MEM-001: Read Project Memory
```
Scenario: Full project memory is retrieved successfully
Given: Project has stored facts in FINANCE and PERMITTING domains
When: System retrieves context for chat
Then: All domain data is included in context
And: Data is formatted as JSON for agent consumption
```

#### TC-MEM-002: Write Project Memory
```
Scenario: Agent updates project memory with new fact
Given: User provides new information "My lot is 0.5 acres"
When: Fact extraction identifies this as LAND_FEASIBILITY domain
And: User confirms the extracted fact
Then: Project memory is updated with lot_size: "0.5 acres"
And: Audit trail entry is created
```

#### TC-MEM-003: Fact Extraction from Conversation
```
Scenario: System extracts facts from user-assistant exchange
Given: User states "I've selected ABC Builders as my contractor"
And: Assistant acknowledges the selection
When: Fact extraction service processes the exchange
Then: Fact is identified with domain: PROCUREMENT_QUALITY
And: Fact includes key: "contractor", value: "ABC Builders"
And: Confidence score is calculated
```

#### TC-MEM-004: Fact Confirmation UI Flow
```
Scenario: User confirms or rejects extracted facts
Given: System has extracted facts from conversation
When: Fact confirmation dialog is displayed
Then: User can review each fact with domain and value
And: User can confirm all facts
And: Confirmed facts are stored in project memory
And: Success notification is displayed
```

### 4.4 Document Management

#### TC-DOC-001: Document Upload Flow
```
Scenario: User uploads a PDF document
Given: User is on project files page
When: User selects a PDF file (<10MB)
And: Upload completes successfully
Then: Presigned URL is generated
And: Document metadata is created with state PENDING_UPLOAD
And: After upload confirmation, state changes to UPLOADED
And: OCR processing begins automatically
```

#### TC-DOC-002: Document Processing Pipeline
```
Scenario: Uploaded document is processed for RAG
Given: Document upload is confirmed
When: Processing pipeline executes
Then: OCR extracts text from document
And: Text is chunked into 500-1000 token segments
And: Each chunk is embedded using OpenRouter/OpenAI
And: Chunks are stored with vector embeddings
And: Document state changes to COMPLETED
```

#### TC-DOC-003: Semantic Document Search
```
Scenario: User searches documents by meaning
Given: Project has multiple processed documents
When: User searches "foundation specifications"
Then: Vector similarity search is performed
And: Results are ranked by similarity score
And: Results include chunk content and source document
And: Similarity threshold (0.7) is applied
```

#### TC-DOC-004: Document Processing Error Handling
```
Scenario: OCR processing fails for corrupted file
Given: User uploads a corrupted PDF
When: Processing pipeline attempts OCR
Then: Processing fails with specific error
And: Document state changes to FAILED
And: Error message is stored and displayed to user
And: User can delete and re-upload
```

### 4.5 Projects Management

#### TC-PROJ-001: Create New Project
```
Scenario: User creates a new construction project
Given: User is authenticated
When: User submits project form with name and location
Then: Project is created with default phase LAND_SELECTION
And: Empty project memory is initialized
And: User is redirected to project chat
```

#### TC-PROJ-002: Update Project Settings
```
Scenario: User updates project phase
Given: User owns the project
When: User changes phase from LAND_SELECTION to PERMITTING
Then: Project phase is updated in database
And: Updated_at timestamp is refreshed
And: UI reflects the new phase
```

#### TC-PROJ-003: Delete Project (Soft Delete)
```
Scenario: User deletes a project
Given: User owns the project
When: User confirms project deletion
Then: Project is soft-deleted (deleted_at set)
And: Project no longer appears in list
And: Associated data remains for audit purposes
And: Undo option may be available (if implemented)
```

### 4.6 Error Handling & Edge Cases

#### TC-ERR-001: Network Timeout Handling
```
Scenario: Chat request times out
Given: User sends a message
When: AI service takes >30 seconds
Then: Request is cancelled with timeout error
And: User sees "AI service timeout, please try again"
And: User message is still stored
And: Retry button is available
```

#### TC-ERR-002: Empty Message Validation
```
Scenario: User attempts to send empty message
Given: User is in chat view
When: User submits empty or whitespace-only message
Then: Submission is prevented
And: Validation message is displayed
And: Submit button remains disabled
```

#### TC-ERR-003: Max Content Length
```
Scenario: User exceeds message character limit
Given: Maximum content length is 4000 characters
When: User attempts to send 5000 character message
Then: API returns 422 Unprocessable Entity
And: User sees clear error about length limit
```

#### TC-ERR-004: Concurrent Session Handling
```
Scenario: User has multiple browser tabs open
Given: User has project open in two tabs
When: User sends message from Tab A
Then: Tab B should reflect the new message
Or: Tab B should refresh state on next interaction
And: No data corruption occurs
```

---

## 5. Test Environment

### 5.1 Environment Matrix

| Environment | Purpose | Infrastructure | Data |
|-------------|---------|----------------|------|
| **Local Development** | Developer testing | Docker Compose (backend + frontend) + Local Supabase | Seed data |
| **CI/CD Pipeline** | Automated tests | GitHub Actions runners | Mock data |
| **Staging** | Pre-production validation | DigitalOcean (Docker) + Supabase Cloud | Sanitized production copy |
| **Production** | Smoke tests only | DigitalOcean (Docker) + Supabase Cloud | Live data |

### 5.2 Test Data Requirements

| Data Category | Source | Management |
|---------------|--------|------------|
| User Accounts | Test fixtures | Created/destroyed per test run |
| Projects | Seed data + Factories | `seed_test_data.py` |
| Documents | Sample PDFs/images | Version-controlled in `/tests/fixtures/` |
| Project Memory | JSON fixtures | Domain-specific test data |
| Agent Routing Ground Truth | Curated dataset | Manual + automated labeling |
| Embeddings | Pre-computed mocks | Stored vectors for deterministic tests |

### 5.3 External Service Configuration

| Service | Test Mode | Configuration |
|---------|-----------|---------------|
| OpenRouter | Mock mode (`MOCK_MODE=true`) | Deterministic responses from fixtures |
| Supabase Auth | Local instance | Docker-based local Supabase |
| Supabase Storage | Local instance | Local S3-compatible storage |
| Google Search | Mocked | Recorded responses |
| pgvector | Real PostgreSQL | Local Supabase with vector extension |

### 5.4 Environment Variables for Testing

```bash
# Backend Test Configuration
MOCK_MODE=true
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=<local-anon-key>
OPENROUTER_API_KEY=test-key-not-used-in-mock
MOCK_AUTH=true  # For unit tests without real auth
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Frontend Test Configuration
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
PUBLIC_API_URL=http://localhost:5001
```

---

## 6. Testing Tools

### 6.1 Backend Testing Stack

| Tool | Purpose | Version |
|------|---------|---------|
| **pytest** | Test framework | ^8.0 |
| **pytest-asyncio** | Async test support | ^0.23 |
| **pytest-cov** | Coverage reporting | ^4.1 |
| **httpx** | Async HTTP client for API tests | ^0.27 |
| **factory-boy** | Test data factories | ^3.3 |
| **respx** | HTTP mocking for httpx | ^0.21 |
| **Faker** | Fake data generation | ^24.0 |

### 6.2 Frontend Testing Stack

| Tool | Purpose | Version |
|------|---------|---------|
| **Jest** | Unit test framework | ^29.0 |
| **React Testing Library** | Component testing | ^14.0 |
| **Playwright** | E2E testing | ^1.45 |
| **MSW (Mock Service Worker)** | API mocking | ^2.0 |
| **axe-core** | Accessibility testing | ^4.9 |

### 6.3 CI/CD & Reporting

| Tool | Purpose |
|------|---------|
| **GitHub Actions** | CI/CD pipeline orchestration |
| **pytest-html** | HTML test reports |
| **Codecov** | Coverage tracking and visualization |
| **Allure** | Advanced test reporting (optional) |
| **Playwright Report** | E2E test traces and screenshots |

### 6.4 Performance & Security

| Tool | Purpose |
|------|---------|
| **Locust** | Load testing |
| **Lighthouse CI** | Frontend performance |
| **Bandit** | Python security linting |
| **npm audit** | JavaScript dependency vulnerabilities |

---

## 7. Test Schedule

### 7.1 Continuous Integration (Every Push/PR)

| Phase | Tests | Max Duration |
|-------|-------|--------------|
| Lint & Type Check | ESLint, TypeScript, Ruff, mypy | 2 minutes |
| Backend Unit Tests | pytest (unit) | 3 minutes |
| Frontend Unit Tests | Jest | 2 minutes |
| API Contract Tests | Schema validation | 1 minute |
| **Total CI Time** | | **<10 minutes** |

### 7.2 Pre-Merge (Pull Request)

| Phase | Tests | Max Duration |
|-------|-------|--------------|
| All CI tests | See above | 10 minutes |
| Backend Integration Tests | pytest (integration) | 5 minutes |
| Frontend E2E (Critical Paths) | Playwright subset | 5 minutes |
| Security Scan | Bandit + npm audit | 2 minutes |
| **Total Pre-Merge Time** | | **<25 minutes** |

### 7.3 Nightly (Main Branch)

| Phase | Tests | Max Duration |
|-------|-------|--------------|
| Full Test Suite | All unit + integration | 15 minutes |
| Full E2E Suite | All Playwright tests | 20 minutes |
| Performance Benchmarks | API latency, page load | 10 minutes |
| Accessibility Scan | axe-core full site | 5 minutes |
| Routing Accuracy Evaluation | Ground truth dataset | 10 minutes |
| **Total Nightly Time** | | **<60 minutes** |

### 7.4 Release Candidate

| Phase | Tests |
|-------|-------|
| All nightly tests | Full suite |
| Manual Exploratory Testing | Critical user journeys |
| Staging Environment Smoke Tests | Real infrastructure validation |
| Security Penetration Testing | Manual + automated |
| Load Testing | 50 concurrent users |
| Accessibility Audit | WCAG 2.1 AA compliance |

---

## 8. Test Acceptance Criteria

### 8.1 Quality Gates

| Gate | Criteria | Blocking |
|------|----------|----------|
| **Unit Test Pass Rate** | 100% of tests pass | Yes |
| **Code Coverage** | ≥80% for critical services | Yes |
| **E2E Critical Path** | All critical path tests pass | Yes |
| **Security Vulnerabilities** | No high/critical severity | Yes |
| **Type Errors** | Zero TypeScript/mypy errors | Yes |
| **Linting** | Zero errors (warnings allowed) | Yes |

### 8.2 Feature-Specific Acceptance Criteria

#### Chat System
- [ ] Routing accuracy ≥90% on ground truth dataset
- [ ] Response time <10 seconds for 95th percentile
- [ ] Context retention demonstrated for 5+ turn lookback
- [ ] Graceful fallback when AI service unavailable

#### Document Processing
- [ ] OCR accuracy ≥95% for standard PDFs
- [ ] Embedding generation completes within 30 seconds per document
- [ ] Vector search returns relevant results (precision >0.8)
- [ ] Processing failure is communicated to user

#### Authentication
- [ ] All protected routes require valid token
- [ ] Project ownership enforced for all project endpoints
- [ ] Session expiration handled gracefully
- [ ] No sensitive data in error messages

#### UI/UX
- [ ] Core Web Vitals meet thresholds (LCP <2.5s, FID <100ms, CLS <0.1)
- [ ] All interactive elements keyboard accessible
- [ ] Error states provide actionable guidance
- [ ] Responsive design works on 320px-2560px widths

### 8.3 Release Criteria

| Criterion | Requirement |
|-----------|-------------|
| All quality gates | Passed |
| Critical/High bugs | Zero open |
| Medium bugs | ≤5 open with workarounds |
| Documentation | Updated for new features |
| Rollback plan | Documented and tested |

---

## 9. Roles and Responsibilities

### 9.1 RACI Matrix

| Activity | Developer | QA Engineer | Tech Lead | Product Owner |
|----------|-----------|-------------|-----------|---------------|
| Write Unit Tests | **R/A** | C | C | I |
| Write Integration Tests | R | **R/A** | C | I |
| Write E2E Tests | C | **R/A** | C | I |
| Execute CI/CD Tests | **R** | I | A | I |
| Review Test Results | R | **R** | **A** | I |
| Triage Failures | R | **R** | A | I |
| Define Acceptance Criteria | C | R | C | **A** |
| Approve Releases | I | R | **R** | **A** |
| Maintain Test Infrastructure | R | **R/A** | C | I |

**Legend**: R = Responsible, A = Accountable, C = Consulted, I = Informed

### 9.2 Role Descriptions

#### Developer
- Write and maintain unit tests for code they develop
- Fix failing tests caused by their changes
- Participate in code reviews focusing on test quality
- Ensure >80% coverage for new code

#### QA Engineer
- Design and implement integration and E2E test suites
- Maintain test data and fixtures
- Analyze test failures and coordinate fixes
- Report on test metrics and quality trends
- Conduct exploratory testing for new features

#### Tech Lead
- Define testing standards and best practices
- Review and approve test architecture decisions
- Ensure adequate test coverage across system
- Coordinate with DevOps on CI/CD pipeline

#### Product Owner
- Define acceptance criteria for features
- Prioritize bug fixes based on user impact
- Approve release readiness
- Provide feedback on test scenarios

---

## 10. Bug Reporting Procedures

### 10.1 Bug Report Template

```markdown
## Bug Report

### Title
[Brief, descriptive title]

### Environment
- **Environment**: [Local / Staging / Production]
- **Browser/Client**: [Chrome 120 / Firefox / API direct]
- **User Role**: [Authenticated / Anonymous]
- **Commit/Version**: [Git SHA or version tag]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [...]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Evidence
- **Screenshots/Video**: [Attach if applicable]
- **Console Logs**: [Browser console errors]
- **API Response**: [If API-related, include request/response]
- **Stack Trace**: [If available]

### Severity
- [ ] Critical - System unusable, data loss, security issue
- [ ] High - Major feature broken, no workaround
- [ ] Medium - Feature impaired, workaround exists
- [ ] Low - Minor issue, cosmetic

### Additional Context
[Any other relevant information]
```

### 10.2 Severity Definitions

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **Critical** | System unusable, security breach, data loss | 4 hours | Auth bypass, database corruption, chat completely broken |
| **High** | Major feature broken, no workaround | 24 hours | Cannot upload documents, routing always fails |
| **Medium** | Feature impaired, workaround exists | 1 week | CSAT rating not saving, slow document search |
| **Low** | Minor/cosmetic issue | 2 weeks | Typo in UI, minor alignment issue |

### 10.3 Bug Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   New    │────►│  Triaged │────►│   Open   │────►│ In Review│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                       │                 │
                                       ▼                 ▼
                                 ┌──────────┐     ┌──────────┐
                                 │ Blocked  │     │  Closed  │
                                 └──────────┘     └──────────┘
```

| State | Description |
|-------|-------------|
| **New** | Bug reported, awaiting triage |
| **Triaged** | Severity assigned, ready for assignment |
| **Open** | Assigned to developer, work in progress |
| **Blocked** | Waiting on external dependency or decision |
| **In Review** | Fix implemented, in code review or verification |
| **Closed** | Verified fixed or determined not a bug |

### 10.4 Bug Tracking Integration

| Tool | Purpose |
|------|---------|
| **GitHub Issues** | Primary bug tracking with labels |
| **Project Board** | Kanban view of bug states |
| **Milestone Tagging** | Associate bugs with releases |
| **PR Linking** | Connect fixes to bug reports |

### 10.5 Escalation Path

1. **Initial Triage**: QA Engineer (within 4 hours of report)
2. **Assignment**: Tech Lead for Critical/High, QA for Medium/Low
3. **Stalled Bugs**: Escalate to Tech Lead after 48 hours
4. **Critical Bugs**: Immediate notification to Tech Lead + Product Owner
5. **Production Issues**: Follow incident response procedure

---

## Appendix A: Test File Structure

```
HouseBuildingAssistant/
├── backend/
│   └── tests/
│       ├── conftest.py                 # Shared fixtures
│       ├── unit/
│       │   ├── services/
│       │   │   ├── test_chat_orchestration.py
│       │   │   ├── test_fact_extraction.py
│       │   │   ├── test_document_retrieval.py
│       │   │   └── test_project_memory.py
│       │   └── schemas/
│       │       └── test_validation.py
│       ├── integration/
│       │   ├── api/
│       │   │   ├── test_messages_api.py
│       │   │   ├── test_projects_api.py
│       │   │   └── test_documents_api.py
│       │   └── services/
│       │       └── test_rag_pipeline.py
│       └── fixtures/
│           ├── documents/
│           ├── memory_data/
│           └── routing_ground_truth.json
├── frontend/
│   └── tests/
│       ├── unit/
│       │   ├── components/
│       │   │   ├── ChatThread.test.tsx
│       │   │   ├── FactConfirmationDialog.test.tsx
│       │   │   └── ProjectsListView.test.tsx
│       │   └── hooks/
│       │       ├── useProjectChat.test.ts
│       │       └── useProjectMemory.test.ts
│       ├── e2e/
│       │   ├── auth.spec.ts
│       │   ├── chat.spec.ts
│       │   ├── documents.spec.ts
│       │   └── projects.spec.ts
│       └── mocks/
│           └── handlers.ts             # MSW handlers
└── .github/
    └── workflows/
        ├── ci.yml                      # PR checks
        ├── nightly.yml                 # Full suite
        └── release.yml                 # Release validation
```

---

## Appendix B: Routing Ground Truth Dataset Structure

```json
{
  "version": "1.0",
  "created_at": "2026-02-01",
  "test_cases": [
    {
      "id": "rt-001",
      "query": "What soil tests should I get before buying this lot?",
      "expected_agent": "LAND_FEASIBILITY_AGENT",
      "expected_confidence_min": 0.7,
      "category": "land_analysis",
      "difficulty": "easy"
    },
    {
      "id": "rt-002",
      "query": "How do I apply for a building permit in Colorado?",
      "expected_agent": "REGULATORY_PERMITTING_AGENT",
      "expected_confidence_min": 0.8,
      "category": "permits",
      "difficulty": "easy"
    },
    {
      "id": "rt-003",
      "query": "I'm thinking about solar panels but also need to finalize the roof design",
      "expected_agent": "ARCHITECTURAL_DESIGN_AGENT",
      "expected_confidence_min": 0.6,
      "category": "multi_domain",
      "difficulty": "hard"
    }
  ]
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-01 | QA Team | Initial test plan |

---

*This test plan is a living document and should be updated as the application evolves.*
