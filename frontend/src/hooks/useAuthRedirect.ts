/**
 * useAuthRedirect Hook
 * 
 * Custom hook for handling safe redirects after authentication.
 * Validates redirect targets to prevent open redirect vulnerabilities.
 */

import { useEffect, useState } from 'react';

/**
 * Validates if a redirect path is safe to use
 * Only allows relative paths that start with / and don't contain //
 * 
 * @param path - Path to validate
 * @returns true if path is safe to redirect to
 */
function isSafeRedirectPath(path: string): boolean {
  // Must start with /
  if (!path.startsWith('/')) {
    return false;
  }

  // Must not contain // (prevents protocol-relative URLs)
  if (path.includes('//')) {
    return false;
  }

  // Must not contain dangerous characters or patterns
  if (path.includes('javascript:') || path.includes('data:')) {
    return false;
  }

  return true;
}

/**
 * Extracts and validates redirectTo parameter from URL query string
 * 
 * @param defaultRedirect - Default redirect path if none specified or invalid
 * @returns Safe redirect path
 */
function getRedirectPath(defaultRedirect: string = '/projects'): string {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return defaultRedirect;
  }

  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get('redirectTo');

  // If no redirect parameter, use default
  if (!redirectTo) {
    return defaultRedirect;
  }

  // Validate the redirect path
  if (isSafeRedirectPath(redirectTo)) {
    return redirectTo;
  }

  // If invalid, use default
  console.warn(
    `Invalid redirectTo parameter: ${redirectTo}. Using default redirect.`
  );
  return defaultRedirect;
}

/**
 * Custom hook for managing authentication redirects
 * 
 * @param defaultRedirect - Default path to redirect to after auth (default: '/projects')
 * @returns Object with redirectTo path and performRedirect function
 */
export function useAuthRedirect(defaultRedirect: string = '/projects') {
  const [redirectTo, setRedirectTo] = useState<string>(defaultRedirect);

  useEffect(() => {
    // Parse redirect path on mount
    const path = getRedirectPath(defaultRedirect);
    setRedirectTo(path);
  }, [defaultRedirect]);

  /**
   * Performs the redirect to the stored path
   */
  const performRedirect = () => {
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  };

  /**
   * Builds a URL with the current redirectTo preserved as a query parameter
   * Useful for switching between login/signup while preserving redirect target
   * 
   * @param basePath - Base path to append redirectTo parameter to
   * @returns Full path with redirectTo query parameter
   */
  const buildUrlWithRedirect = (basePath: string): string => {
    if (redirectTo === defaultRedirect) {
      // Don't add query param if using default
      return basePath;
    }
    return `${basePath}?redirectTo=${encodeURIComponent(redirectTo)}`;
  };

  return {
    redirectTo,
    performRedirect,
    buildUrlWithRedirect,
  };
}
