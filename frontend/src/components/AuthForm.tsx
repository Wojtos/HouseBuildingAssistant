/**
 * AuthForm Component
 * 
 * Handles sign in and sign up flows using Supabase authentication.
 * Manages form state, validation, error handling, and redirects.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { supabase, mapAuthError, isAuthenticated } from '../lib/supabaseClient';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { InlineErrorBanner } from './InlineErrorBanner';
import type { AuthFormVM } from '../types/viewModels';

interface AuthFormProps {
  /** Mode determines sign in or sign up flow */
  mode: 'login' | 'signup';
  /** Optional redirect target (defaults to query param or /projects) */
  redirectTo?: string;
}

/**
 * Validates email format (basic client-side validation)
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password meets minimum requirements
 */
function isValidPassword(password: string, mode: 'login' | 'signup'): boolean {
  if (mode === 'signup') {
    // For signup, enforce minimum 8 characters
    return password.length >= 8;
  }
  // For login, just require non-empty
  return password.length > 0;
}

/**
 * AuthForm component for authentication flows
 */
export function AuthForm({ mode, redirectTo: redirectToProp }: AuthFormProps) {
  const { redirectTo, performRedirect, buildUrlWithRedirect } = useAuthRedirect(
    redirectToProp || '/projects'
  );

  const [formState, setFormState] = useState<AuthFormVM>({
    mode,
    email: '',
    password: '',
    isSubmitting: false,
    errorMessage: null,
    redirectTo,
  });

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        // User is already logged in, redirect
        performRedirect();
      }
    };
    checkAuth();
  }, [performRedirect]);

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      errorMessage: null, // Clear error when user types
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { email, password } = formState;

    // Client-side validation
    if (!email.trim()) {
      setFormState((prev) => ({
        ...prev,
        errorMessage: 'Email is required.',
      }));
      return;
    }

    if (!isValidEmail(email)) {
      setFormState((prev) => ({
        ...prev,
        errorMessage: 'Please enter a valid email address.',
      }));
      return;
    }

    if (!password) {
      setFormState((prev) => ({
        ...prev,
        errorMessage: 'Password is required.',
      }));
      return;
    }

    if (mode === 'signup' && !isValidPassword(password, mode)) {
      setFormState((prev) => ({
        ...prev,
        errorMessage: 'Password must be at least 8 characters long.',
      }));
      return;
    }

    // Set submitting state
    setFormState((prev) => ({ ...prev, isSubmitting: true, errorMessage: null }));

    try {
      if (mode === 'login') {
        // Sign in with password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          // Success - redirect
          performRedirect();
        }
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (data.session) {
          // Auto-login enabled, redirect immediately
          performRedirect();
        } else if (data.user && !data.session) {
          // Email confirmation required
          setFormState((prev) => ({
            ...prev,
            isSubmitting: false,
            errorMessage: 'Check your email to confirm your account.',
          }));
        }
      }
    } catch (error) {
      // Map error to user-friendly message
      const errorMessage = mapAuthError(error);
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errorMessage,
      }));
    }
  };

  const isFormValid =
    formState.email.trim() !== '' &&
    formState.password !== '' &&
    !formState.isSubmitting;

  const switchModeUrl =
    mode === 'login'
      ? buildUrlWithRedirect('/signup')
      : buildUrlWithRedirect('/login');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <a
                  href={switchModeUrl}
                  className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Sign up
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <a
                  href={switchModeUrl}
                  className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Sign in
                </a>
              </>
            )}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-lg bg-white px-6 py-8 shadow sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formState.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={formState.isSubmitting}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={formState.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={formState.isSubmitting}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 sm:text-sm"
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                />
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters long
                </p>
              )}
            </div>

            {/* Error Banner */}
            {formState.errorMessage && (
              <InlineErrorBanner message={formState.errorMessage} />
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={!isFormValid}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
              >
                {formState.isSubmitting ? (
                  <span className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : mode === 'login' ? (
                  'Sign in'
                ) : (
                  'Sign up'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
