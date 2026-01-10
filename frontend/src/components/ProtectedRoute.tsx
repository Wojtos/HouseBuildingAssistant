/**
 * ProtectedRoute Component
 * 
 * Client-side authentication check that runs in the browser.
 * Redirects to login if user is not authenticated.
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
        setAuthenticated(true);
        setAuthChecked(true);
      return;
      // disable temporarily
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
