/**
 * API Data Transfer Objects and Command Models
 *
 * TypeScript type definitions derived from database models (backend/app/db/models.py)
 * and API plan (.ai/api-plan.md).
 *
 * These types represent the data structures used for API communication between
 * the frontend and backend.
 */

// =============================================================================
// ENUMS (matching PostgreSQL ENUM types from backend/app/db/enums.py)
// =============================================================================

/**
 * Tracks the current construction phase of a building project.
 * Matches: public.construction_phase PostgreSQL ENUM
 */
export const ConstructionPhase = {
  LAND_SELECTION: 'LAND_SELECTION',
  FEASIBILITY: 'FEASIBILITY',
  PERMITTING: 'PERMITTING',
  DESIGN: 'DESIGN',
  SITE_PREP: 'SITE_PREP',
  FOUNDATION: 'FOUNDATION',
  SHELL_SYSTEMS: 'SHELL_SYSTEMS',
  PROCUREMENT: 'PROCUREMENT',
  FINISHES_FURNISHING: 'FINISHES_FURNISHING',
  COMPLETED: 'COMPLETED',
} as const;

export type ConstructionPhase =
  (typeof ConstructionPhase)[keyof typeof ConstructionPhase];

/**
 * Tracks the processing state of uploaded documents through OCR and embedding pipeline.
 * Matches: public.processing_state PostgreSQL ENUM
 * Note: PENDING_UPLOAD is used by the API but not stored in the database enum
 */
export const ProcessingState = {
  PENDING_UPLOAD: 'PENDING_UPLOAD',
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type ProcessingState =
  (typeof ProcessingState)[keyof typeof ProcessingState];

/**
 * User preference for measurement units in the application.
 * Matches: public.measurement_unit PostgreSQL ENUM
 */
export const MeasurementUnit = {
  METRIC: 'METRIC',
  IMPERIAL: 'IMPERIAL',
} as const;

export type MeasurementUnit =
  (typeof MeasurementUnit)[keyof typeof MeasurementUnit];

/**
 * Message role in chat history
 */
export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

// =============================================================================
// COMMON TYPES
// =============================================================================

/**
 * UUID type alias for documentation purposes
 * All UUIDs are represented as strings in TypeScript
 */
export type UUID = string;

/**
 * ISO8601 timestamp string type alias
 */
export type ISO8601Timestamp = string;

/**
 * Pagination information included in list responses
 * Derived from API plan pagination specification
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

/**
 * Common pagination query parameters for list endpoints
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Sort order options
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Standard error response format
 * Used by all endpoints for error responses
 */
export interface ErrorResponse {
  error: {
    code:
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'VALIDATION_ERROR'
      | 'RATE_LIMITED'
      | 'INTERNAL_ERROR'
      | 'SERVICE_UNAVAILABLE';
    message: string;
    details?: {
      field?: string;
      reason?: string;
    };
  };
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// =============================================================================
// PROFILE DTOs (Section 2.1)
// Derived from: Profile, ProfileBase models in backend/app/db/models.py
// =============================================================================

/**
 * Profile response DTO
 * GET /api/profiles/me response
 * Derived from: Profile model
 */
export interface ProfileResponse {
  id: UUID;
  full_name: string | null;
  preferred_units: MeasurementUnit;
  language: string;
  created_at: ISO8601Timestamp;
  updated_at: ISO8601Timestamp;
}

/**
 * Profile update command model
 * PUT /api/profiles/me request
 * Derived from: ProfileBase model (all fields optional for partial updates)
 */
export interface ProfileUpdateRequest {
  full_name?: string;
  preferred_units?: MeasurementUnit;
  language?: string;
}

// =============================================================================
// PROJECT DTOs (Section 2.2)
// Derived from: Project, ProjectBase, ProjectInsert, ProjectUpdate models
// =============================================================================

/**
 * Project list query parameters
 * GET /api/projects query params
 */
export interface ProjectListParams extends PaginationParams {
  sort_by?: 'created_at' | 'updated_at' | 'name';
  sort_order?: SortOrder;
  phase?: ConstructionPhase;
  include_deleted?: boolean;
}

/**
 * Project list item DTO
 * Individual project in GET /api/projects response
 * Derived from: Project model (subset of fields)
 */
export interface ProjectListItem {
  id: UUID;
  name: string;
  location: string | null;
  current_phase: ConstructionPhase;
  created_at: ISO8601Timestamp;
  updated_at: ISO8601Timestamp;
  deleted_at: ISO8601Timestamp | null;
}

/**
 * Paginated project list response
 * GET /api/projects response
 */
export type ProjectListResponse = PaginatedResponse<ProjectListItem>;

/**
 * Project create command model
 * POST /api/projects request
 * Derived from: ProjectInsert model (user_id set by server from auth)
 */
export interface ProjectCreateRequest {
  name: string;
  location?: string;
  current_phase?: ConstructionPhase;
}

/**
 * Project response DTO (basic)
 * POST /api/projects response
 * Derived from: Project model
 */
export interface ProjectResponse {
  id: UUID;
  user_id: UUID;
  name: string;
  location: string | null;
  current_phase: ConstructionPhase;
  created_at: ISO8601Timestamp;
  updated_at: ISO8601Timestamp;
}

/**
 * Project detail response DTO (with counts)
 * GET /api/projects/{project_id} response
 * Extends ProjectResponse with aggregated counts
 */
export interface ProjectDetailResponse extends ProjectResponse {
  document_count: number;
  message_count: number;
}

/**
 * Project update command model
 * PUT /api/projects/{project_id} request
 * Derived from: ProjectUpdate model
 */
export interface ProjectUpdateRequest {
  name?: string;
  location?: string;
  current_phase?: ConstructionPhase;
}

/**
 * Project delete response DTO
 * DELETE /api/projects/{project_id} response
 * Soft delete confirmation
 */
export interface ProjectDeleteResponse {
  id: UUID;
  deleted_at: ISO8601Timestamp;
}

// =============================================================================
// PROJECT MEMORY DTOs (Section 2.3)
// Derived from: ProjectMemory, ProjectMemoryBase, ProjectMemoryUpdate,
//               MemoryAuditTrail, MemoryAuditTrailBase models
// =============================================================================

/**
 * Flexible JSON structure for project memory data
 * Keys are typically category names (FINANCE, PERMITTING, etc.)
 */
export type ProjectMemoryData = Record<string, unknown>;

/**
 * Project memory response DTO
 * GET /api/projects/{project_id}/memory response
 * Derived from: ProjectMemory model
 */
export interface ProjectMemoryResponse {
  id: UUID;
  project_id: UUID;
  data: ProjectMemoryData;
  updated_at: ISO8601Timestamp;
}

/**
 * Project memory update command model
 * PATCH /api/projects/{project_id}/memory request
 * Derived from: ProjectMemoryUpdate model + audit metadata
 * Note: Uses deep merge with existing data
 */
export interface ProjectMemoryUpdateRequest {
  data: ProjectMemoryData;
  agent_id?: string;
  change_summary?: string;
}

/**
 * Memory audit trail list query parameters
 * GET /api/projects/{project_id}/memory/audit query params
 */
export type MemoryAuditListParams = PaginationParams;

/**
 * Memory audit trail item DTO
 * Individual entry in audit list
 * Derived from: MemoryAuditTrail model
 */
export interface MemoryAuditItem {
  id: UUID;
  project_id: UUID;
  agent_id: string | null;
  change_summary: string | null;
  previous_data: ProjectMemoryData | null;
  new_data: ProjectMemoryData | null;
  created_at: ISO8601Timestamp;
}

/**
 * Paginated memory audit trail response
 * GET /api/projects/{project_id}/memory/audit response
 */
export type MemoryAuditListResponse = PaginatedResponse<MemoryAuditItem>;

// =============================================================================
// DOCUMENT DTOs (Section 2.4)
// Derived from: Document, DocumentBase, DocumentInsert, DocumentUpdate,
//               DocumentChunk, DocumentChunkBase models
// =============================================================================

/**
 * Document list query parameters
 * GET /api/projects/{project_id}/documents query params
 */
export interface DocumentListParams extends PaginationParams {
  processing_state?: ProcessingState;
  file_type?: string;
  include_deleted?: boolean;
}

/**
 * Document list item DTO
 * Individual document in list response
 * Derived from: Document model + computed chunk_count
 */
export interface DocumentListItem {
  id: UUID;
  project_id: UUID;
  name: string;
  file_type: string | null;
  processing_state: ProcessingState;
  error_message: string | null;
  chunk_count: number;
  created_at: ISO8601Timestamp;
  deleted_at: ISO8601Timestamp | null;
}

/**
 * Paginated document list response
 * GET /api/projects/{project_id}/documents response
 */
export type DocumentListResponse = PaginatedResponse<DocumentListItem>;

/**
 * Document create command model
 * POST /api/projects/{project_id}/documents request
 * Used to create document record and request presigned upload URL
 */
export interface DocumentCreateRequest {
  name: string;
  file_type: string;
  file_size: number;
}

/**
 * Supported file types for document upload
 */
export const SupportedFileTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'text/plain',
] as const;

export type SupportedFileType = (typeof SupportedFileTypes)[number];

/**
 * Document create response DTO
 * POST /api/projects/{project_id}/documents response
 * Includes presigned upload URL for direct upload to storage
 */
export interface DocumentCreateResponse {
  id: UUID;
  project_id: UUID;
  name: string;
  file_type: string;
  processing_state: ProcessingState;
  upload_url: string;
  upload_url_expires_at: ISO8601Timestamp;
  created_at: ISO8601Timestamp;
}

/**
 * Document upload confirm response DTO
 * POST /api/projects/{project_id}/documents/{document_id}/confirm response
 * Derived from: Document model (subset of fields)
 */
export interface DocumentConfirmResponse {
  id: UUID;
  project_id: UUID;
  name: string;
  file_type: string;
  processing_state: ProcessingState;
  created_at: ISO8601Timestamp;
}

/**
 * Document detail response DTO
 * GET /api/projects/{project_id}/documents/{document_id} response
 * Derived from: Document model + computed chunk_count
 */
export interface DocumentDetailResponse {
  id: UUID;
  project_id: UUID;
  name: string;
  file_type: string | null;
  processing_state: ProcessingState;
  error_message: string | null;
  chunk_count: number;
  created_at: ISO8601Timestamp;
}

/**
 * Document delete response DTO
 * DELETE /api/projects/{project_id}/documents/{document_id} response
 * Soft delete confirmation
 */
export interface DocumentDeleteResponse {
  id: UUID;
  deleted_at: ISO8601Timestamp;
}

/**
 * Document chunk list query parameters
 * GET /api/projects/{project_id}/documents/{document_id}/chunks query params
 */
export type DocumentChunkListParams = PaginationParams;

/**
 * Document chunk metadata
 * Flexible structure for chunk metadata (page numbers, categories, etc.)
 */
export type ChunkMetadata = Record<string, unknown>;

/**
 * Document chunk item DTO
 * Individual chunk in list response
 * Derived from: DocumentChunk model (excludes embedding for API response)
 */
export interface DocumentChunkItem {
  id: UUID;
  document_id: UUID;
  content: string;
  chunk_index: number;
  metadata: ChunkMetadata;
  created_at: ISO8601Timestamp;
}

/**
 * Paginated document chunk list response
 * GET /api/projects/{project_id}/documents/{document_id}/chunks response
 */
export type DocumentChunkListResponse = PaginatedResponse<DocumentChunkItem>;

/**
 * Document semantic search command model
 * POST /api/projects/{project_id}/documents/search request
 */
export interface DocumentSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
}

/**
 * Document search result item DTO
 * Individual result in search response
 * Includes similarity score and document context
 */
export interface DocumentSearchResult {
  chunk_id: UUID;
  document_id: UUID;
  document_name: string;
  content: string;
  chunk_index: number;
  similarity_score: number;
  metadata: ChunkMetadata;
}

/**
 * Document search response DTO
 * POST /api/projects/{project_id}/documents/search response
 */
export interface DocumentSearchResponse {
  results: DocumentSearchResult[];
  query: string;
  total_results: number;
}

// =============================================================================
// CHAT/MESSAGE DTOs (Section 2.5)
// Derived from: Message, MessageBase, MessageInsert, MessageUpdate,
//               RoutingAudit, RoutingAuditBase models
// =============================================================================

/**
 * Message list query parameters
 * GET /api/projects/{project_id}/messages query params
 */
export interface MessageListParams extends PaginationParams {
  before?: ISO8601Timestamp;
  after?: ISO8601Timestamp;
}

/**
 * Message item DTO
 * Individual message in chat history
 * Derived from: Message model (excludes user_id, routing_metadata)
 */
export interface MessageItem {
  id: UUID;
  project_id: UUID;
  role: MessageRole;
  content: string;
  agent_id: string | null;
  csat_rating: number | null;
  created_at: ISO8601Timestamp;
}

/**
 * Paginated message list response
 * GET /api/projects/{project_id}/messages response
 */
export type MessageListResponse = PaginatedResponse<MessageItem>;

/**
 * Chat command model
 * POST /api/projects/{project_id}/chat request
 */
export interface ChatRequest {
  content: string;
}

/**
 * Routing metadata included in chat response
 * Derived from: routing_metadata in Message model
 */
export interface RoutingMetadata {
  confidence: number;
  reasoning: string;
}

/**
 * Chat response DTO
 * POST /api/projects/{project_id}/chat response
 * Returns only the assistant message (user message not echoed back)
 */
export interface ChatResponse {
  id: UUID;
  role: 'assistant';
  content: string;
  agent_id: string;
  routing_metadata: RoutingMetadata;
  created_at: ISO8601Timestamp;
}

/**
 * Message feedback command model
 * POST /api/projects/{project_id}/messages/{message_id}/feedback request
 * Derived from: MessageUpdate model
 */
export interface MessageFeedbackRequest {
  csat_rating: 1 | 2 | 3 | 4 | 5;
}

/**
 * Message feedback response DTO
 * POST /api/projects/{project_id}/messages/{message_id}/feedback response
 */
export interface MessageFeedbackResponse {
  id: UUID;
  csat_rating: number;
  updated_at: ISO8601Timestamp;
}

// =============================================================================
// USAGE DTOs (Section 2.6)
// Derived from: UsageLog, UsageLogBase models
// =============================================================================

/**
 * Usage query parameters
 * GET /api/usage and GET /api/projects/{project_id}/usage query params
 */
export interface UsageParams {
  start_date?: string;
  end_date?: string;
  group_by?: 'day' | 'week' | 'month';
}

/**
 * Usage summary statistics
 */
export interface UsageSummary {
  total_tokens: number;
  total_cost: number;
  total_requests: number;
}

/**
 * Usage breakdown by time period
 */
export interface UsagePeriodItem {
  period: string;
  tokens: number;
  cost: number;
  requests: number;
}

/**
 * Usage breakdown by API/service
 */
export interface UsageApiItem {
  api_name: string;
  tokens: number;
  cost: number;
}

/**
 * User usage response DTO
 * GET /api/usage response
 */
export interface UsageResponse {
  summary: UsageSummary;
  by_period: UsagePeriodItem[];
  by_api: UsageApiItem[];
}

/**
 * Project usage response DTO
 * GET /api/projects/{project_id}/usage response
 */
export interface ProjectUsageResponse {
  project_id: UUID;
  summary: UsageSummary;
  by_api: UsageApiItem[];
}

// =============================================================================
// HEALTH CHECK DTOs (Section 2.7)
// =============================================================================

/**
 * Service health status
 */
export type ServiceStatus = 'healthy' | 'unhealthy' | 'degraded';

/**
 * Health check response DTO
 * GET /api/health response
 */
export interface HealthResponse {
  status: ServiceStatus;
  version: string;
  timestamp: ISO8601Timestamp;
  services: {
    database: ServiceStatus;
    supabase_auth: ServiceStatus;
    openrouter: ServiceStatus;
    ocr_service: ServiceStatus;
  };
}

// =============================================================================
// RATE LIMIT HEADERS (for client-side handling)
// =============================================================================

/**
 * Rate limit information extracted from response headers
 * Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse(
  response: unknown
): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ErrorResponse).error === 'object'
  );
}

/**
 * Type guard to check if a value is a valid construction phase
 */
export function isConstructionPhase(
  value: unknown
): value is ConstructionPhase {
  return (
    typeof value === 'string' &&
    Object.values(ConstructionPhase).includes(value as ConstructionPhase)
  );
}

/**
 * Type guard to check if a value is a valid processing state
 */
export function isProcessingState(value: unknown): value is ProcessingState {
  return (
    typeof value === 'string' &&
    Object.values(ProcessingState).includes(value as ProcessingState)
  );
}

/**
 * Type guard to check if a value is a valid measurement unit
 */
export function isMeasurementUnit(value: unknown): value is MeasurementUnit {
  return (
    typeof value === 'string' &&
    Object.values(MeasurementUnit).includes(value as MeasurementUnit)
  );
}

/**
 * Type guard to check if a file type is supported for upload
 */
export function isSupportedFileType(
  value: string
): value is SupportedFileType {
  return SupportedFileTypes.includes(value as SupportedFileType);
}

