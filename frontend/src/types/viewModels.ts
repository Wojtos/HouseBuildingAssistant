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
