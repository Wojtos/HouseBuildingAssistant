/**
 * View Model Type Definitions
 * 
 * View Models represent the shape of data used by UI components.
 * They are distinct from API DTOs and are optimized for UI rendering and interaction.
 */

// =============================================================================
// AUTH VIEW MODELS
// =============================================================================

/**
 * Auth form view model
 * Used by AuthForm component to manage sign in/sign up state
 */
export interface AuthFormVM {
  /** Mode determines whether this is a login or signup flow */
  mode: 'login' | 'signup';
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** Indicates if auth request is in progress */
  isSubmitting: boolean;
  /** Error message to display, null if no error */
  errorMessage: string | null;
  /** Redirect target after successful authentication */
  redirectTo: string;
}

/**
 * Error banner view model
 * Shared component for displaying errors across the application
 */
export interface ErrorBannerVM {
  /** Optional title for the error banner */
  title?: string;
  /** Error message to display */
  message: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional callback for action button */
  onAction?: () => void;
}

// =============================================================================
// CREATE PROJECT VIEW MODELS
// =============================================================================

/**
 * Create project form view model
 * Manages state for project creation form including validation and submission
 */
export interface CreateProjectFormVM {
  /** Project name (required, max 255 chars) */
  name: string;
  /** Project location (optional, max 500 chars) */
  location: string;
  /** Current construction phase (empty string means use server default) */
  current_phase: string; // ConstructionPhase | ''
  /** Indicates if form is currently submitting */
  isSubmitting: boolean;
  /** Field-level validation errors */
  fieldErrors: {
    name?: string;
    location?: string;
    current_phase?: string;
  };
  /** General submission error message */
  submitError: string | null;
}

// =============================================================================
// PROJECT CHAT VIEW MODELS
// =============================================================================

/**
 * Message status for optimistic/pending UI
 */
export type MessageStatus = 'sent' | 'pending' | 'failed';

/**
 * Context metadata view model (UC-0, UC-1, UC-2, UC-4)
 */
export interface ContextMetadataVM {
  used_project_context: boolean;
  used_memory: boolean;
  used_documents: boolean;
  used_web_search: boolean;
  document_count: number;
}

/**
 * Extracted fact view model (UC-3)
 */
export interface ExtractedFactVM {
  id: string;
  domain: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
  reasoning?: string;
}

/**
 * Chat message view model
 * Represents a single message in the chat thread
 */
export interface ChatMessageVM {
  /** UUID for persisted messages; `temp-...` for optimistic user messages */
  id: string;
  /** Role of message author */
  role: 'user' | 'assistant';
  /** Message content text */
  content: string;
  /** ISO8601 timestamp when message was created */
  created_at: string;
  /** ID of the agent that generated the response (assistant messages only) */
  agent_id?: string | null;
  /** Routing metadata with confidence and reasoning (assistant messages only) */
  routing_metadata?: { confidence: number; reasoning: string } | null;
  /** CSAT rating for this message (1-5, assistant messages only) */
  csat_rating?: number | null;
  /** Status for optimistic/pending UI */
  status?: MessageStatus;
  /** Context metadata showing what sources were used (assistant messages only) */
  context_metadata?: ContextMetadataVM | null;
  /** Extracted facts pending confirmation (assistant messages only) */
  extracted_facts?: ExtractedFactVM[] | null;
}

/**
 * Chat composer view model
 * Manages state for message input area
 */
export interface ChatComposerVM {
  /** Current draft message content */
  draft: string;
  /** Whether a message is currently being sent */
  isSending: boolean;
  /** Validation error for draft message */
  draftError?: string;
}

/**
 * Chat pagination view model
 * Manages pagination state for message history
 */
export interface ChatPaginationVM {
  /** Whether initial message history is loading */
  isLoadingInitial: boolean;
  /** Whether older messages are being loaded */
  isLoadingOlder: boolean;
  /** Whether more older messages exist (derived from pagination) */
  hasMoreOlder: boolean;
  /** Timestamp of oldest message for pagination */
  oldestTimestamp?: string;
}

/**
 * API error view model for displaying errors
 */
export interface ApiErrorVM {
  /** Error message to display */
  message: string;
  /** Whether the error is retryable */
  isRetryable: boolean;
  /** Action label for retry button */
  retryLabel?: string;
}

// =============================================================================
// ERROR RECOVERY VIEW MODELS
// =============================================================================

/**
 * Error view variant type
 */
export type ErrorViewVariant = '403' | '404' | 'offline';

/**
 * Call to action configuration
 */
export interface ErrorCTA {
  /** Button/link label */
  label: string;
  /** Navigation target href */
  href: string;
}

/**
 * Error view model
 * Used by ErrorView component to display error pages (403, 404, offline)
 */
export interface ErrorViewVM {
  /** Error variant determines messaging and behavior */
  variant: ErrorViewVariant;
  /** Error page title */
  title: string;
  /** Error description message */
  description: string;
  /** Primary call to action */
  primaryCta: ErrorCTA;
  /** Optional secondary call to action */
  secondaryCta?: ErrorCTA;
}

// =============================================================================
// PROJECTS LIST VIEW MODELS
// =============================================================================

/**
 * Projects query view model
 * Manages filter and pagination state for projects list
 */
export interface ProjectsQueryVM {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Phase filter ('ALL' for no filter) */
  phase: string; // ConstructionPhase | 'ALL'
  /** Whether to include soft-deleted projects */
  include_deleted: boolean;
  /** Sort field */
  sort_by: 'created_at' | 'updated_at' | 'name';
  /** Sort direction */
  sort_order: 'asc' | 'desc';
}

/**
 * Projects list view model
 * Represents the complete state of the projects list view
 */
export interface ProjectsListVM {
  /** Query/filter state */
  query: ProjectsQueryVM;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error state */
  error: ApiErrorVM | null;
}

// =============================================================================
// PROJECT SHELL / CONTEXT VIEW MODELS
// =============================================================================

/**
 * Project context view model
 * Represents loaded project state for the shell/layout
 */
export interface ProjectContextVM {
  /** Project UUID */
  projectId: string;
  /** Project name */
  name: string;
  /** Project location (optional) */
  location: string | null;
  /** Current construction phase */
  current_phase: string; // ConstructionPhase
  /** Number of documents in project */
  document_count: number;
  /** Number of messages in project */
  message_count: number;
  /** Whether project is loading */
  isLoading: boolean;
  /** Error state */
  error: ApiErrorVM | null;
  /** Whether phase update is in progress */
  isUpdatingPhase: boolean;
}

/**
 * Navigation key for project shell tabs
 */
// TODO: Re-enable 'files' when documents functionality is ready
export type ProjectNavKey = 'chat' | 'files' | 'facts' | 'settings';

// =============================================================================
// PROJECT FILES VIEW MODELS
// =============================================================================

/**
 * Upload flow step enum
 */
export type UploadFlowStep =
  | 'select_file'
  | 'creating_record'
  | 'uploading'
  | 'confirming'
  | 'monitoring'
  | 'completed'
  | 'failed';

/**
 * Document list query view model
 * Manages filter and pagination state for documents list
 */
export interface DocumentListQueryVM {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Processing state filter ('ALL' for no filter) */
  processing_state: string; // ProcessingState | 'ALL'
  /** File type filter ('ALL' for no filter) */
  file_type: string;
  /** Whether to include soft-deleted documents */
  include_deleted: boolean;
}

/**
 * Upload flow view model
 * Manages the multi-step document upload process
 */
export interface UploadFlowVM {
  /** Current step in the upload flow */
  step: UploadFlowStep;
  /** Selected file (null if not selected) */
  file: File | null;
  /** Document ID from create response */
  documentId?: string;
  /** Upload URL from create response */
  uploadUrl?: string;
  /** Upload URL expiry time */
  uploadUrlExpiresAt?: string;
  /** Upload progress (0-100) */
  uploadProgress: number;
  /** Error message if failed */
  error: string | null;
}

// =============================================================================
// PROJECT FACTS VIEW MODELS
// =============================================================================

/**
 * Facts domain view model
 * Represents a single domain/category in project memory
 */
export interface FactsDomainVM {
  /** Domain key (e.g., "FINANCE", "PERMITTING") */
  domainKey: string;
  /** Domain facts data */
  facts: unknown;
  /** Whether domain has no meaningful data */
  isEmpty: boolean;
}

/**
 * Project facts view model
 * Represents the complete state of the facts view
 */
export interface ProjectFactsVM {
  /** Project memory data */
  memory: {
    id: string;
    project_id: string;
    data: Record<string, unknown>;
    updated_at: string;
  } | null;
  /** Parsed domains from memory */
  domains: FactsDomainVM[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error state */
  error: ApiErrorVM | null;
}

// =============================================================================
// PROJECT SETTINGS VIEW MODELS
// =============================================================================

/**
 * Project settings form view model
 * Manages state for project settings form including validation and submission
 */
export interface ProjectSettingsFormVM {
  /** Project name (required, max 255 chars) */
  name: string;
  /** Project location (optional, max 500 chars) */
  location: string;
  /** Current construction phase */
  current_phase: string; // ConstructionPhase
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Whether form is currently saving */
  isSaving: boolean;
  /** Whether form has unsaved changes */
  isDirty: boolean;
  /** Field-level validation errors */
  fieldErrors: {
    name?: string;
    location?: string;
    current_phase?: string;
  };
  /** Error loading initial data */
  loadError: string | null;
  /** Error saving form */
  saveError: string | null;
  /** Whether delete is in progress */
  isDeleting: boolean;
  /** Error deleting project */
  deleteError: string | null;
}
