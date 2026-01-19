/**
 * AuthForm Component
 *
 * Handles sign in and sign up flows.
 * Manages form state, validation, error handling, and redirects.
 * Styled to match Google's clean, minimal authentication UI.
 */

import { useState, useCallback, useId, type FormEvent } from 'react';
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
 * Field-level error state
 */
interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * API response for registration that may require email confirmation
 */
interface RegisterResponse {
  user?: { id: string; email: string };
  needsEmailConfirmation?: boolean;
  error?: string;
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Building icon for logo - represents house construction
 */
function BuildingIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21h18" />
      <path d="M9 21V9l-6 3V21" />
      <path d="M21 21V9l-6-3v15" />
      <path d="M9 21V6l6-3v18" />
    </svg>
  );
}

/**
 * Spinner component for loading states
 */
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
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
  );
}

/**
 * AuthForm component for authentication flows
 */
export function AuthForm({ mode, redirectTo: redirectToProp }: AuthFormProps) {
  const { redirectTo, performRedirect, buildUrlWithRedirect } = useAuthRedirect(
    redirectToProp || '/projects'
  );

  const emailInputId = useId();
  const passwordInputId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const [formState, setFormState] = useState<AuthFormVM>({
    mode,
    email: '',
    password: '',
    isSubmitting: false,
    errorMessage: null,
    redirectTo,
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  // Note: Authentication check is handled server-side by Astro middleware.
  // If user is already authenticated, they will be redirected before this component mounts.

  const validateField = useCallback(
    (field: 'email' | 'password', value: string): string | undefined => {
      if (field === 'email') {
        if (!value.trim()) {
          return 'Email is required';
        }
        if (!isValidEmail(value.trim())) {
          return 'Enter a valid email address';
        }
      }

      if (field === 'password') {
        if (!value) {
          return 'Password is required';
        }
        if (mode === 'signup' && value.length < 8) {
          return 'Password must be at least 8 characters';
        }
      }

      return undefined;
    },
    [mode]
  );

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      errorMessage: null, // Clear general error when user types
    }));

    // Only validate if field has been touched
    if (touched[field]) {
      const error = validateField(field, value);
      setFieldErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    }
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = field === 'email' ? formState.email : formState.password;
    const error = validateField(field, value);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { email, password } = formState;

    // Validate all fields
    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);

    setFieldErrors({
      email: emailError,
      password: passwordError,
    });

    setTouched({ email: true, password: true });

    // If there are validation errors, focus the first invalid field
    if (emailError) {
      const emailInput = document.getElementById(emailInputId);
      emailInput?.focus();
      return;
    }

    if (passwordError) {
      const passwordInput = document.getElementById(passwordInputId);
      passwordInput?.focus();
      return;
    }

    // Set submitting state
    setFormState((prev) => ({ ...prev, isSubmitting: true, errorMessage: null }));

    try {
      // Determine the API endpoint based on mode
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data: RegisterResponse = await response.json();

      if (!response.ok) {
        // Handle error response from API
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          errorMessage: data.error || 'Authentication failed. Please try again.',
        }));
        return;
      }

      // Handle signup with email confirmation required
      if (mode === 'signup' && data.needsEmailConfirmation) {
        setFormState((prev) => ({ ...prev, isSubmitting: false }));
        setEmailConfirmationSent(true);
        return;
      }

      // Success - redirect to target page
      // Session is now established via cookies by the API
      performRedirect();
    } catch (error) {
      // Handle network or unexpected errors
      console.error('Auth error:', error);
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errorMessage: 'Network error. Please check your connection and try again.',
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

  // Show email confirmation message after successful signup
  if (emailConfirmationSent) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white px-8 py-10 shadow-sm sm:px-12 sm:py-12">
          {/* Success Icon and Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-7 w-7 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-normal text-gray-900">Check your email</h1>
            <p className="mt-3 text-base text-gray-600">
              We&apos;ve sent a confirmation link to:
            </p>
            <p className="mt-1 text-base font-medium text-gray-900">{formState.email}</p>
          </div>

          {/* Instructions */}
          <div className="mb-6 rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Click the link in the email to verify your account.
                  If you don&apos;t see it, check your spam folder.
                </p>
              </div>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already confirmed?{' '}
              <a
                href={buildUrlWithRedirect('/login')}
                className="font-medium text-blue-600 hover:underline focus:outline-none focus:underline"
              >
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Card container */}
      <div className="rounded-lg border border-gray-200 bg-white px-8 py-10 shadow-sm sm:px-12 sm:py-12">
        {/* Logo and Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <BuildingIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-normal text-gray-900">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="mt-2 text-base text-gray-600">
            {mode === 'login'
              ? 'to continue to House Building Assistant'
              : 'for House Building Assistant'}
          </p>
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {/* Email Input */}
          <div>
            <label
              htmlFor={emailInputId}
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id={emailInputId}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formState.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              disabled={formState.isSubmitting}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? emailErrorId : undefined}
              className={`w-full rounded-md border px-4 py-3 text-base text-gray-900 transition-colors duration-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${
                fieldErrors.email
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p
                id={emailErrorId}
                className="mt-2 flex items-center text-sm text-red-600"
                role="alert"
              >
                <svg
                  className="mr-1.5 h-4 w-4 flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor={passwordInputId}
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id={passwordInputId}
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={formState.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              disabled={formState.isSubmitting}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
              className={`w-full rounded-md border px-4 py-3 text-base text-gray-900 transition-colors duration-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${
                fieldErrors.password
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
            />
            {fieldErrors.password && (
              <p
                id={passwordErrorId}
                className="mt-2 flex items-center text-sm text-red-600"
                role="alert"
              >
                <svg
                  className="mr-1.5 h-4 w-4 flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {fieldErrors.password}
              </p>
            )}
            {mode === 'signup' && !fieldErrors.password && (
              <p className="mt-2 text-sm text-gray-500">
                Use 8 or more characters
              </p>
            )}
          </div>

          {/* General Error Banner */}
          {formState.errorMessage && (
            <InlineErrorBanner message={formState.errorMessage} />
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid}
              className="w-full rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            >
              {formState.isSubmitting ? (
                <span className="flex items-center justify-center">
                  <Spinner className="mr-2 h-5 w-5" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </div>

          {/* Mode Switch Link */}
          <div className="pt-4 text-center">
            <p className="text-sm text-gray-600">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <a
                    href={switchModeUrl}
                    className="font-medium text-blue-600 hover:underline focus:outline-none focus:underline"
                  >
                    Create account
                  </a>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <a
                    href={switchModeUrl}
                    className="font-medium text-blue-600 hover:underline focus:outline-none focus:underline"
                  >
                    Sign in
                  </a>
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
