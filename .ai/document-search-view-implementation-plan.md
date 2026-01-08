# View Implementation Plan: Project Document Semantic Search

## 1. Overview
Semantic Search enables users to find relevant facts across all processed documents in a project. It submits a query to the backend vector search endpoint and renders traceable results (document name, chunk index, snippet, metadata). Users can jump directly to the source chunk in Document Detail.

## 2. View Routing
- **View path**: `/projects/:projectId/files/search`
- **Navigation**:
  - back to files list: `/projects/:projectId/files`
  - open document: `/projects/:projectId/files/:documentId?chunkIndex=<chunk_index>`

## 3. Component Structure

```
DocumentSearchPage.astro
└─ (ProjectLayout.astro)
   └─ <DocumentSearchView client:load projectId="..." />
      ├─ SearchHeader (Back link)
      ├─ SearchForm
      │  ├─ QueryInput
      │  ├─ LimitSelect (1..20)
      │  ├─ ThresholdInput (0..1)
      │  └─ SearchButton
      ├─ ResultsSummary
      ├─ ResultsList
      │  └─ SearchResultCard
      └─ ApiErrorBanner
```

## 4. Component Details

### `DocumentSearchPage.astro`
- **Component description**: Route shell for semantic search.
- **Main elements**: content container.
- **Handled events**: none.
- **Types**: none.
- **Props**: none.

### `DocumentSearchView` (React)
- **Component description**: Controls the search form, validates inputs, calls search endpoint, and renders results.
- **Main elements**:
  - `<form>` with query + advanced controls
  - result list region (`aria-live`)
- **Handled events**:
  - `onSubmit`: perform search
  - `onChange`: update draft parameters
  - click result actions: open document / jump to chunk
- **Validation conditions (per API plan)**
  - `query`: required, non-empty (trim)
  - `limit`: integer 1..20 (default 5)
  - `threshold`: number 0..1 (default 0.7)
- **Types (DTO + ViewModel)**
  - DTOs:
    - `DocumentSearchRequest`
    - `DocumentSearchResponse`
    - `DocumentSearchResult`
  - ViewModels:
    - `DocumentSearchFormVM`:
      - `query: string`
      - `limit: number`
      - `threshold: number`
      - `isSearching: boolean`
      - `fieldErrors: { query?: string; limit?: string; threshold?: string }`
      - `error: ApiErrorVM | null`
    - `DocumentSearchVM`:
      - `response: DocumentSearchResponse | null`
      - `results: DocumentSearchResult[]`
      - `total_results: number`
- **Props**:
  - `projectId: string`

### `SearchResultCard` (React)
- **Component description**: Displays one result with traceability and actions.
- **Main elements**: document name, snippet (content), chunk index, metadata, optional similarity score.
- **Handled events**:
  - open document
  - jump to chunk (deep link)
- **Validation**: none.
- **Types**: `DocumentSearchResult`.
- **Props**:
  - `result: DocumentSearchResult`
  - `onOpen: (documentId: string, chunkIndex: number) => void`

## 5. Types
New view models:
- `DocumentSearchFormVM`
- `DocumentSearchVM`

## 6. State Management
- Suggested hook:
  - `useDocumentSearch(projectId: string)`:
    - `search(input: DocumentSearchRequest): Promise<DocumentSearchResponse>`
    - state for `isSearching`, `error`, and last response

## 7. API Integration
- `POST /api/projects/{project_id}/documents/search`
  - Request type: `DocumentSearchRequest`
  - Response type: `DocumentSearchResponse`
- Frontend action:
  - Validate inputs and send request
  - Render `results[]` with deep links to source

## 8. User Interactions
- **Search**:
  - User enters query and presses Enter or clicks Search
  - Show loading state while searching
  - Show results count and list on success
- **Jump to source**:
  - Clicking result opens document detail at `chunkIndex`

## 9. Conditions and Validation
- If query is empty, block submission and focus query input.
- If threshold/limit invalid, block submission and show inline errors.
- Results should show clear traceability:
  - document name
  - chunk index
  - metadata (e.g., page_number)

## 10. Error Handling
- `401`: redirect to login with return
- `403`: back to `/projects`
- `404`: project not found → not-found UI
- `400`: missing query or invalid params → show field errors (preventable by UI)
- `503`: show banner + retry button
- `429`: show rate limit message; optionally disable search until reset

## 11. Implementation Steps
1. Add Astro route `src/pages/projects/[projectId]/files/search.astro`.
2. Implement `DocumentSearchView` + `SearchResultCard`.
3. Add `useDocumentSearch` hook using `DocumentSearchRequest/Response`.
4. Implement deep link navigation to document detail using `chunkIndex`.
5. Add validation + error mapping for 400/401/403/404/429/503.
