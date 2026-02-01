/**
 * API Client Utilities
 * 
 * Provides type-safe API request functions with authentication and error handling.
 */

import { getAccessToken } from './supabaseClient';
import type { ErrorResponse } from '../types/api';

/**
 * Base API URL (backend service)
 */
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Generic fetch wrapper with authentication and error handling
 * @param endpoint - API endpoint path (e.g., '/api/projects')
 * @param options - Fetch options
 * @returns Promise<T> - Parsed JSON response
 * @throws Error with user-friendly message
 */
export async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Get access token for authenticated requests
  const token = await getAccessToken();

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers if they're a plain object
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build full URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      // For successful non-JSON responses (like 204 No Content)
      return {} as T;
    }

    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      // Try to parse as ErrorResponse
      if (isErrorResponse(data)) {
        throw new ApiError(
          data.error.message,
          response.status,
          data.error.code,
          data.error.details
        );
      }

      // Generic error
      throw new ApiError(
        data.message || `Request failed with status ${response.status}`,
        response.status
      );
    }

    return data as T;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Generic error
    throw new Error(
      error instanceof Error ? error.message : 'An unexpected error occurred.'
    );
  }
}

/**
 * Type guard to check if response is an ErrorResponse
 */
function isErrorResponse(data: unknown): data is ErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as ErrorResponse).error === 'object'
  );
}

/**
 * Custom API Error class with additional context
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: { field?: string; reason?: string }
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handle API errors and redirect for authentication errors
 * @param error - Error from API call
 * @param redirectTo - Optional redirect path for auth errors
 * @returns User-friendly error message
 */
export function handleApiError(error: unknown, redirectTo?: string): string {
  if (error instanceof ApiError) {
    // Handle 401 Unauthorized
    if (error.statusCode === 401) {
      const loginUrl = redirectTo
        ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
        : '/login';
      window.location.href = loginUrl;
      return 'Session expired. Please sign in again.';
    }

    // Handle 403 Forbidden
    if (error.statusCode === 403) {
      return 'You do not have permission to perform this action.';
    }

    // Handle 404 Not Found
    if (error.statusCode === 404) {
      return 'The requested resource was not found.';
    }

    // Handle 422 Validation Error
    if (error.statusCode === 422 || error.errorCode === 'VALIDATION_ERROR') {
      if (error.details?.field && error.details?.reason) {
        return `${error.details.field}: ${error.details.reason}`;
      }
      return error.message || 'Validation error. Please check your input.';
    }

    // Handle 429 Rate Limited
    if (error.statusCode === 429 || error.errorCode === 'RATE_LIMITED') {
      return 'Too many requests. Please try again later.';
    }

    // Handle 503 Service Unavailable
    if (error.statusCode === 503 || error.errorCode === 'SERVICE_UNAVAILABLE') {
      return 'Service temporarily unavailable. Please try again later.';
    }

    // Return API error message
    return error.message;
  }

  // Handle generic errors
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
