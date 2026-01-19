/**
 * LogoutButton Component
 *
 * Client-side React component that handles user logout.
 * Calls the /api/auth/logout endpoint and redirects to login page.
 */

import { useState } from 'react';

interface LogoutButtonProps {
  /** Optional custom CSS classes */
  className?: string;
  /** Optional callback after successful logout */
  onLogoutSuccess?: () => void;
}

export function LogoutButton({ className, onLogoutSuccess }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to log out');
      }

      // Call optional callback
      onLogoutSuccess?.();

      // Redirect to login page
      window.location.href = '/login';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-sm text-red-600" role="alert">
          {error}
        </span>
      )}
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={className || 'btn-google-text'}
        aria-busy={isLoading}
      >
        {isLoading ? 'Logging out...' : 'Log out'}
      </button>
    </div>
  );
}

export default LogoutButton;
