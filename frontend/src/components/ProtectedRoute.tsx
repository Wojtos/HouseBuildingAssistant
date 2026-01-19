/**
 * ProtectedRoute Component
 * 
 * Client-side authentication check that runs in the browser.
 * Acts as a secondary safety net for protected content.
 * 
 * Primary protection is handled server-side by Astro middleware.
 * This component handles:
 * - Hydration edge cases (stale tabs, expired sessions after SSR)
 * - Routes that are intentionally client-only
 */

import { useEffect, useState } from 'react';
import { isAuthenticated } from '../lib/supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  /** Show loading while checking auth */
  fallback?: React.ReactNode;
}

/**
 * Wrapper component that checks authentication status
 * and redirects to login if not authenticated
 */
export function ProtectedRoute({
  children,
  redirectTo = '/login',
  fallback = <div className="flex items-center justify-center min-h-screen">Loading...</div>,
}: ProtectedRouteProps) {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await isAuthenticated();
      
      if (!isAuth) {
        // Build redirect URL with return path
        const currentPath = window.location.pathname + window.location.search;
        const returnPath = currentPath !== '/' ? currentPath : '/';
        const loginUrl = returnPath !== '/'
          ? `${redirectTo}?redirectTo=${encodeURIComponent(returnPath)}`
          : redirectTo;
        
        window.location.href = loginUrl;
      } else {
        setAuthenticated(true);
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [redirectTo]);

  if (!authChecked) {
    return <>{fallback}</>;
  }

  return <>{authenticated ? children : null}</>;
}
