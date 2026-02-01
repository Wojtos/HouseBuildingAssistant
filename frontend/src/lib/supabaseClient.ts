/**
 * Supabase Client Configuration
 * 
 * Provides authenticated Supabase client and utility functions for authentication.
 */

import { createClient, type AuthError } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
// For SSR, prefer process.env (runtime) over import.meta.env (build-time)
// For client-side, import.meta.env is inlined at build time
const getEnvVar = (key: string, fallback: string): string => {
  // Try process.env first (for SSR runtime)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string;
  }
  // Fall back to import.meta.env (build-time for client, runtime for dev)
  const metaEnv = import.meta.env as Record<string, string>;
  return metaEnv[key] || fallback;
};

const envUrl = getEnvVar('PUBLIC_SUPABASE_URL', 'http://localhost:54321');
// For client-side, always use localhost since host.docker.internal doesn't work from browser
const supabaseUrl = typeof window !== 'undefined' 
  ? envUrl.replace('host.docker.internal', 'localhost')
  : envUrl;
const supabaseAnonKey = getEnvVar('PUBLIC_SUPABASE_ANON_KEY', '');

if (!supabaseAnonKey) {
  console.warn('PUBLIC_SUPABASE_ANON_KEY is not set. Authentication will not work.');
}

/**
 * Supabase client instance
 * Configured to persist session in localStorage
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Check if user is currently authenticated
 * @returns Promise<boolean> true if user has valid session
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

/**
 * Get current access token for API requests
 * @returns Promise<string | null> access token or null if not authenticated
 */
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Map Supabase AuthError to user-friendly message
 * @param error - The error from Supabase auth
 * @returns User-friendly error message
 */
export function mapAuthError(error: unknown): string {
  if (!error) return 'An unknown error occurred.';

  const authError = error as AuthError;
  const message = authError.message?.toLowerCase() || '';

  // Map specific error messages
  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'Invalid email or password. Please try again.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }

  if (message.includes('user already registered')) {
    return 'An account with this email already exists.';
  }

  if (message.includes('password should be at least')) {
    return 'Password must be at least 8 characters long.';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Return original message as fallback
  return authError.message || 'Authentication failed. Please try again.';
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
