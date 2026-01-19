/**
 * Logout API Endpoint
 *
 * POST /api/auth/logout
 * Signs out user and clears session cookies.
 */

import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../../db/supabase.server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create Supabase server client (handles cookies)
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Sign out - this clears the session server-side
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to sign out. Please try again.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Success - session cookies are cleared by Supabase SSR
    return new Response(null, { status: 200 });
  } catch (err) {
    console.error('Logout error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
