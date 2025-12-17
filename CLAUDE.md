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


# AI Rules for {{project-name}}

{{project-description}}

## CODING_PRACTICES

### Guidelines for SUPPORT_LEVEL

#### SUPPORT_EXPERT

- Favor elegant, maintainable solutions over verbose code. Assume understanding of language idioms and design patterns.
- Highlight potential performance implications and optimization opportunities in suggested code.
- Frame solutions within broader architectural contexts and suggest design alternatives when appropriate.
- Focus comments on 'why' not 'what' - assume code readability through well-named functions and variables.
- Proactively address edge cases, race conditions, and security considerations without being prompted.
- When debugging, provide targeted diagnostic approaches rather than shotgun solutions.
- Suggest comprehensive testing strategies rather than just example tests, including considerations for mocking, test organization, and coverage.


### Guidelines for DOCUMENTATION

#### DOC_UPDATES

- Update relevant documentation in /docs when modifying features
- Keep README.md in sync with new capabilities
- Maintain changelog entries in CHANGELOG.md


### Guidelines for VERSION_CONTROL

#### GITHUB

- Use pull request templates to standardize information provided for code reviews
- Implement branch protection rules for {{protected_branches}} to enforce quality checks
- Configure required status checks to prevent merging code that fails tests or linting
- Use GitHub Actions for CI/CD workflows to automate testing and deployment
- Implement CODEOWNERS files to automatically assign reviewers based on code paths
- Use GitHub Projects for tracking work items and connecting them to code changes

#### GIT

- Use conventional commits to create meaningful commit messages
- Use feature branches with descriptive names following {{branch_naming_convention}}
- Write meaningful commit messages that explain why changes were made, not just what
- Keep commits focused on single logical changes to facilitate code review and bisection
- Use interactive rebase to clean up history before merging feature branches
- Leverage git hooks to enforce code quality checks before commits and pushes

#### CONVENTIONAL_COMMITS

- Follow the format: type(scope): description for all commit messages
- Use consistent types (feat, fix, docs, style, refactor, test, chore) across the project
- Define clear scopes based on {{project_modules}} to indicate affected areas
- Include issue references in commit messages to link changes to requirements
- Use breaking change footer (!: or BREAKING CHANGE:) to clearly mark incompatible changes
- Configure commitlint to automatically enforce conventional commit format


### Guidelines for ARCHITECTURE

#### ADR

- Create ADRs in /docs/adr/{name}.md for:
- 1) Major dependency changes
- 2) Architectural pattern changes
- 3) New integration patterns
- 4) Database schema changes

#### DDD

- Define bounded contexts to separate different parts of the domain with clear boundaries
- Implement ubiquitous language within each context to align code with business terminology
- Create rich domain models with behavior, not just data structures, for {{core_domain_entities}}
- Use value objects for concepts with no identity but defined by their attributes
- Implement domain events to communicate between bounded contexts
- Use aggregates to enforce consistency boundaries and transactional integrity

#### MICROSERVICES

- Design services around business capabilities rather than technical functions
- Implement API gateways to handle cross-cutting concerns for {{client_types}}
- Use event-driven communication for asynchronous operations between services
- Implement circuit breakers to handle failures gracefully in distributed systems
- Design for eventual consistency in data that spans multiple services
- Implement service discovery and health checks for robust system operation

#### MONOREPO

- Configure workspace-aware tooling to optimize build and test processes
- Implement clear package boundaries with explicit dependencies between packages
- Use consistent versioning strategy across all packages (independent or lockstep)
- Configure CI/CD to build and test only affected packages for efficiency
- Implement shared configurations for linting, testing, and {{development_tooling}}
- Use code generators to maintain consistency across similar packages or modules

#### CLEAN_ARCHITECTURE

- Strictly separate code into layers: entities, use cases, interfaces, and frameworks
- Ensure dependencies point inward, with inner layers having no knowledge of outer layers
- Implement domain entities that encapsulate {{business_rules}} without framework dependencies
- Use interfaces (ports) and implementations (adapters) to isolate external dependencies
- Create use cases that orchestrate entity interactions for specific business operations
- Implement mappers to transform data between layers to maintain separation of concerns


### Guidelines for STATIC_ANALYSIS

#### ESLINT

- Configure project-specific rules in eslint.config.js to enforce consistent coding standards
- Use shareable configs like eslint-config-airbnb or eslint-config-standard as a foundation
- Implement custom rules for {{project_specific_patterns}} to maintain codebase consistency
- Configure integration with Prettier to avoid rule conflicts for code formatting
- Use the --fix flag in CI/CD pipelines to automatically correct fixable issues
- Implement staged linting with husky and lint-staged to prevent committing non-compliant code

## FRONTEND

### Guidelines for REACT

#### REACT_CODING_STANDARDS

- Use functional components with hooks instead of class components
- Implement React.memo() for expensive components that render often with the same props
- Utilize React.lazy() and Suspense for code-splitting and performance optimization
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Prefer useMemo for expensive calculations to avoid recomputation on every render
- Implement useId() for generating unique IDs for accessibility attributes
- Use the new use hook for data fetching in React 19+ projects
- Leverage Server Components for {{data_fetching_heavy_components}} when using React with Next.js or similar frameworks
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive

#### NEXT_JS

- Use App Router and Server Components for improved performance and SEO
- Implement route handlers for API endpoints instead of the pages/api directory
- Use server actions for form handling and data mutations from Server Components
- Leverage Next.js Image component with proper sizing for core web vitals optimization
- Implement the Metadata API for dynamic SEO optimization
- Use React Server Components for {{data_fetching_operations}} to reduce client-side JavaScript
- Implement Streaming and Suspense for improved loading states
- Use the new Link component without requiring a child <a> tag
- Leverage parallel routes for complex layouts and parallel data fetching
- Implement intercepting routes for modal patterns and nested UIs

#### REACT_ROUTER

- Use createBrowserRouter instead of BrowserRouter for better data loading and error handling
- Implement lazy loading with React.lazy() for route components to improve initial load time
- Use the useNavigate hook instead of the navigate component prop for programmatic navigation
- Leverage loader and action functions to handle data fetching and mutations at the route level
- Implement error boundaries with errorElement to gracefully handle routing and data errors
- Use relative paths with dot notation (e.g., "../parent") to maintain route hierarchy flexibility
- Utilize the useRouteLoaderData hook to access data from parent routes
- Implement fetchers for non-navigation data mutations
- Use route.lazy() for route-level code splitting with automatic loading states
- Implement shouldRevalidate functions to control when data revalidation happens after navigation

#### REDUX

- Use Redux Toolkit (RTK) instead of plain Redux to reduce boilerplate code
- Implement the slice pattern for organizing related state, reducers, and actions
- Use RTK Query for data fetching to eliminate manual loading state management
- Prefer createSelector for memoized selectors to prevent unnecessary recalculations
- Normalize complex state structures using a flat entities approach with IDs as references
- Implement middleware selectively and avoid overusing thunks for simple state updates
- Use the listener middleware for complex side effects instead of thunks where appropriate
- Leverage createEntityAdapter for standardized CRUD operations
- Implement Redux DevTools for debugging in development environments
- Use typed hooks (useAppDispatch, useAppSelector) with TypeScript for type safety

#### REACT_QUERY

- Use TanStack Query (formerly React Query) with appropriate staleTime and gcTime based on data freshness requirements
- Implement the useInfiniteQuery hook for pagination and infinite scrolling
- Use optimistic updates for mutations to make the UI feel more responsive
- Leverage queryClient.setQueryDefaults to establish consistent settings for query categories
- Use suspense mode with <Suspense> boundaries for a more declarative data fetching approach
- Implement retry logic with custom backoff algorithms for transient network issues
- Use the select option to transform and extract specific data from query results
- Implement mutations with onMutate, onError, and onSettled for robust error handling
- Use Query Keys structuring pattern ([entity, params]) for better organization and automatic refetching
- Implement query invalidation strategies to keep data fresh after mutations

## BACKEND

### Guidelines for PYTHON

#### DJANGO

- Use class-based views instead of function-based views for more maintainable and reusable code components
- Implement Django REST Framework for building APIs with serializers that enforce data validation
- Use Django ORM query expressions and annotations for complex database queries involving {{data_models}}
- Leverage Django signals sparingly and document their usage to avoid hidden side effects in the application flow
- Implement custom model managers for encapsulating complex query logic rather than repeating queries across views
- Use Django forms or serializers for all user input to ensure proper validation and prevent security vulnerabilities in {{user_input_fields}}

#### FLASK

- Use Flask Blueprints to organize routes and views by feature or domain for better code organization
- Implement Flask-SQLAlchemy with proper session management to prevent connection leaks and memory issues
- Use Flask-Marshmallow for serialization and request validation of {{data_types}}
- Apply the application factory pattern to enable testing and multiple deployment configurations
- Implement Flask-Limiter for rate limiting on public endpoints to prevent abuse of {{public_apis}}
- Use Flask-Login or Flask-JWT-Extended for authentication with proper session timeout and refresh mechanisms

#### FASTAPI

- Use Pydantic models for request and response validation with strict type checking and custom validators
- Implement dependency injection for services and database sessions to improve testability and resource management
- Use async endpoints for I/O-bound operations to improve throughput for {{high_load_endpoints}}
- Leverage FastAPI's background tasks for non-critical operations that don't need to block the response
- Implement proper exception handling with HTTPException and custom exception handlers for {{error_scenarios}}
- Use path operation decorators consistently with appropriate HTTP methods (GET for retrieval, POST for creation, etc.)

## DATABASE

### Guidelines for SQL

#### POSTGRES

- Use connection pooling to manage database connections efficiently
- Implement JSONB columns for semi-structured data instead of creating many tables for {{flexible_data}}
- Use materialized views for complex, frequently accessed read-only data

## DEVOPS

### Guidelines for CI_CD

#### GITHUB_ACTIONS

- Check if `package.json` exists in project root and summarize key scripts
- Check if `.nvmrc` exists in project root
- Check if `.env.example` exists in project root to identify key `env:` variables
- Always use terminal command: `git branch -a | cat` to verify whether we use `main` or `master` branch
- Always use `env:` variables and secrets attached to jobs instead of global workflows
- Always use `npm ci` for Node-based dependency setup
- Extract common steps into composite actions in separate files
- Once you're done, as a final step conduct the following: for each public action always use <tool>"Run Terminal"</tool> to see what is the most up-to-date version (use only major version) - extract tag_name from the response:
- ```bash curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest ```


### Guidelines for CONTAINERIZATION

#### DOCKER

- Use multi-stage builds to create smaller production images
- Implement layer caching strategies to speed up builds for {{dependency_types}}
- Use non-root users in containers for better security


### Guidelines for CLOUD

#### AWS

- Use Infrastructure as Code (IaC) with AWS CDK or CloudFormation
- Implement the principle of least privilege for IAM roles and policies
- Use managed services when possible instead of maintaining your own infrastructure for {{service_types}}

## TESTING

### Guidelines for UNIT

#### PYTEST

- Use fixtures for test setup and dependency injection
- Implement parameterized tests for testing multiple inputs for {{function_types}}
- Use monkeypatch for mocking dependencies

#### JEST

- Use Jest with TypeScript for type checking in tests
- Implement Testing Library for component testing instead of enzyme
- Use snapshot testing sparingly and only for stable UI components
- Leverage mock functions and spies for isolating units of code
- Implement test setup and teardown with beforeEach and afterEach
- Use describe blocks for organizing related tests
- Leverage expect assertions with specific matchers
- Implement code coverage reporting with meaningful targets
- Use mockResolvedValue and mockRejectedValue for async testing
- Leverage fake timers for testing time-dependent functionality


### Guidelines for INTEGRATION

#### SUPERTEST

- Use async/await with supertest for cleaner test code
- Implement a test database for integration tests
- Use beforeEach/afterEach hooks for database setup and teardown when testing {{api_endpoints}}


### Guidelines for E2E

#### PLAYWRIGHT

- Initialize configuration only with Chromium/Desktop Chrome browser
- Use browser contexts for isolating test environments
- Implement the Page Object Model for maintainable tests
- Use locators for resilient element selection
- Leverage API testing for backend validation
- Implement visual comparison with expect(page).toHaveScreenshot()
- Use the codegen tool for test recording
- Leverage trace viewer for debugging test failures
- Implement test hooks for setup and teardown
- Use expect assertions with specific matchers
- Leverage parallel execution for faster test runs
