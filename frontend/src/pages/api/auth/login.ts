/**
 * Login API Endpoint
 *
 * POST /api/auth/login
 * Authenticates user with email/password and establishes session via cookies.
 */

import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../../db/supabase.server';

/**
 * Request body for login
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Validates the login request body
 */
function validateRequest(body: unknown): body is LoginRequest {
  if (!body || typeof body !== 'object') return false;
  const { email, password } = body as Record<string, unknown>;
  return typeof email === 'string' && typeof password === 'string';
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json();

    if (!validateRequest(body)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request. Email and password are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate password is not empty
    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase server client (handles cookies)
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      // Map common Supabase auth errors to user-friendly messages
      let message = 'Authentication failed. Please try again.';
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid credentials')) {
        message = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('email not confirmed')) {
        message = 'Please confirm your email address before signing in.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        message = 'Network error. Please check your connection and try again.';
      }

      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Success - return session for client-side storage
    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Login error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
