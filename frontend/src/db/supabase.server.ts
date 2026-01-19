/**
 * Supabase Server Client for SSR
 *
 * Uses @supabase/ssr for cookie-based session management.
 * This client is used in Astro middleware and API routes.
 *
 * IMPORTANT: Only use getAll/setAll for cookie operations.
 * Never use individual get/set/remove methods.
 */

import type { AstroCookies } from 'astro';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Cookie configuration for auth tokens
 * - httpOnly: prevents XSS access to tokens
 * - secure: only sent over HTTPS (except localhost)
 * - sameSite: prevents CSRF attacks
 */
export const cookieOptions: CookieOptionsWithName = {
  name: 'sb-auth',
  path: '/',
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: 'lax',
};

/**
 * Parse cookie header string into array of name/value pairs
 * Required by @supabase/ssr getAll interface
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];

  return cookieHeader.split(';').map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    return { name, value: rest.join('=') };
  });
}

/**
 * Context required for creating server Supabase instance
 */
interface ServerContext {
  headers: Headers;
  cookies: AstroCookies;
}

/**
 * Creates a Supabase client for server-side use (middleware, API routes)
 *
 * @param context - Astro request context with headers and cookies
 * @returns Typed Supabase client with cookie-based auth
 *
 * @example
 * ```ts
 * // In API route
 * export const POST: APIRoute = async ({ request, cookies }) => {
 *   const supabase = createSupabaseServerInstance({ headers: request.headers, cookies });
 *   const { data: { user } } = await supabase.auth.getUser();
 * };
 * ```
 */
export function createSupabaseServerInstance(context: ServerContext) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Ensure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, options)
        );
      },
    },
  });

  return supabase;
}
