/**
 * Astro Middleware for Authentication
 *
 * Handles route protection and user session management.
 * Sets Astro.locals.user for authenticated requests.
 *
 * Public paths are accessible without authentication.
 * Protected paths redirect to /login with return URL.
 */

import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerInstance } from '../db/supabase.server';

/**
 * Paths that don't require authentication
 * Includes auth pages and auth API endpoints
 */
const PUBLIC_PATHS = [
  // Auth pages (server-rendered)
  '/login',
  '/signup',
  // Auth API endpoints
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
];

/**
 * Check if a path is public (doesn't require auth)
 * Handles exact matches and path prefixes
 */
function isPublicPath(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  // Allow static assets and special Astro paths
  if (
    pathname.startsWith('/_') || // Astro internals
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2')
  ) {
    return true;
  }

  return false;
}

/**
 * Build safe redirect URL for login
 * Encodes the current path as redirectTo parameter
 */
function buildLoginRedirectUrl(currentPath: string): string {
  // Don't include the path if it's just root
  if (currentPath === '/') {
    return '/login';
  }

  // Encode the current path for safe URL usage
  return `/login?redirectTo=${encodeURIComponent(currentPath)}`;
}

export const onRequest = defineMiddleware(
  async ({ locals, cookies, url, request, redirect }, next) => {
    const pathname = url.pathname;

    // Skip auth check for public paths
    if (isPublicPath(pathname)) {
      return next();
    }

    // Create Supabase server instance with cookie handling
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // IMPORTANT: Always get user first before any other operations
    // This refreshes the session if needed and validates the JWT
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Middleware auth error:', error.message);
    }

    if (user) {
      // Set user in locals for use in pages and components
      locals.user = {
        id: user.id,
        email: user.email,
      };
    } else {
      // No authenticated user - redirect to login
      const loginUrl = buildLoginRedirectUrl(pathname + url.search);
      return redirect(loginUrl, 302);
    }

    return next();
  }
);
