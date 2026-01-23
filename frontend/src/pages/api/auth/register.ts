/**
 * Register API Endpoint
 *
 * POST /api/auth/register
 * Creates new user account and establishes session via cookies.
 */

import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../../db/supabase.server';

/**
 * Request body for registration
 */
interface RegisterRequest {
  email: string;
  password: string;
}

/**
 * Validates the register request body
 */
function validateRequest(body: unknown): body is RegisterRequest {
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

    // Validate password length
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase server client (handles cookies)
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Attempt sign up
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      // Map common Supabase auth errors to user-friendly messages
      let message = 'Registration failed. Please try again.';
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('user already registered') || errorMessage.includes('already exists')) {
        message = 'An account with this email already exists.';
      } else if (errorMessage.includes('password should be at least')) {
        message = 'Password must be at least 8 characters long.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        message = 'Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('invalid email')) {
        message = 'Please enter a valid email address.';
      }

      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if session was established (immediate login) or email confirmation required
    if (!data.session) {
      // This shouldn't happen based on user's config (immediate session)
      // But handle gracefully in case Supabase config changes
      return new Response(
        JSON.stringify({
          user: data.user ? { id: data.user.id, email: data.user.email } : null,
          needsEmailConfirmation: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Success - return session for client-side storage
    return new Response(
      JSON.stringify({
        user: {
          id: data.user!.id,
          email: data.user!.email,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Registration error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
