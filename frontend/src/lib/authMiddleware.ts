/**
 * Authentication Middleware for Astro Pages
 * 
 * Checks if user is authenticated and redirects to login if not.
 * This runs server-side during SSR.
 */

import { supabase } from '../lib/supabaseClient';

interface AuthMiddlewareOptions {
  /** Path to redirect to if not authenticated (default: '/login') */
  redirectTo?: string;
  /** Current path to return to after login */
  returnTo?: string;
}

/**
 * Check authentication status server-side
 * Returns the current session or null if not authenticated
 */
export async function requireAuth(
  request: Request,
  options: AuthMiddlewareOptions = {}
): Promise<{ authenticated: boolean; session: any; redirectUrl?: string }> {
  const { redirectTo = '/login', returnTo } = options;
  
  // Get session from cookie or authorization header
  const authHeader = request.headers.get('Authorization');
  const cookieHeader = request.headers.get('Cookie');
  
  // Extract access token from cookies if present
  let accessToken: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.replace('Bearer ', '');
  } else if (cookieHeader) {
    // Try to extract from cookie (Supabase stores as sb-access-token)
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    // Check for various cookie patterns
    accessToken = cookies['sb-access-token'] || cookies['supabase-auth-token'] || null;
  }
  
  if (!accessToken) {
    // No token found, redirect to login
    const url = new URL(request.url);
    const actualReturnTo = returnTo || url.pathname + url.search;
    const redirectUrl = actualReturnTo !== '/' 
      ? `${redirectTo}?redirectTo=${encodeURIComponent(actualReturnTo)}`
      : redirectTo;
    
    return {
      authenticated: false,
      session: null,
      redirectUrl,
    };
  }
  
  // Verify token with Supabase
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      const url = new URL(request.url);
      const actualReturnTo = returnTo || url.pathname + url.search;
      const redirectUrl = actualReturnTo !== '/'
        ? `${redirectTo}?redirectTo=${encodeURIComponent(actualReturnTo)}`
        : redirectTo;
      
      return {
        authenticated: false,
        session: null,
        redirectUrl,
      };
    }
    
    return {
      authenticated: true,
      session: { user },
    };
  } catch (error) {
    console.error('Auth check error:', error);
    
    const url = new URL(request.url);
    const actualReturnTo = returnTo || url.pathname + url.search;
    const redirectUrl = actualReturnTo !== '/'
      ? `${redirectTo}?redirectTo=${encodeURIComponent(actualReturnTo)}`
      : redirectTo;
    
    return {
      authenticated: false,
      session: null,
      redirectUrl,
    };
  }
}
