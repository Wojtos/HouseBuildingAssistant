# Authentication View Setup

## Overview
The authentication views provide sign-in and sign-up functionality using Supabase Auth.

## Routes
- `/login` - Sign in page
- `/signup` - Sign up page

## Environment Variables
Create a `.env` file in the `frontend` directory with the following variables:

```env
PUBLIC_SUPABASE_URL=your-project-url.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in your Supabase project settings at:
https://app.supabase.com/project/_/settings/api

## Features

### Security
- Safe redirect validation (prevents open redirect vulnerabilities)
- Client-side validation before API calls
- Auto-redirect if already authenticated
- Session persistence and auto-refresh

### User Experience
- Email and password validation
- User-friendly error messages
- Loading states during authentication
- Ability to switch between login/signup while preserving redirect target
- Support for email confirmation flow (if enabled in Supabase)

### Accessibility
- Proper ARIA labels and roles
- Screen reader support
- Keyboard navigation
- Focus management

## Components

### `AuthForm.tsx`
Main authentication form component that handles both sign-in and sign-up modes.

**Props:**
- `mode`: 'login' | 'signup'
- `redirectTo?`: Optional redirect target (defaults to /projects)

### `InlineErrorBanner.tsx`
Shared error display component used across the application.

### Custom Hooks

#### `useAuthRedirect()`
Manages safe authentication redirects with query parameter preservation.

**Returns:**
- `redirectTo`: Validated redirect path
- `performRedirect()`: Execute the redirect
- `buildUrlWithRedirect(basePath)`: Build URL with redirect parameter

## Utilities

### `supabaseClient.ts`
Configured Supabase client with helper functions:

- `getAccessToken()`: Get current access token for API calls
- `isAuthenticated()`: Check if user has active session
- `signOut()`: Sign out current user
- `mapAuthError(error)`: Convert Supabase errors to user-friendly messages

## Validation Rules

### Email
- Required field
- Basic email format validation (client-side)
- Supabase performs additional server-side validation

### Password
- **Sign in**: Must not be empty
- **Sign up**: Minimum 8 characters
- Supabase enforces additional password policies

## Error Handling

The auth view handles the following error scenarios:

- Invalid credentials → "Email or password is incorrect."
- Email not confirmed → "Check your email to confirm your account."
- Rate limiting → "Too many attempts. Try again later."
- User already exists → "An account with this email already exists."
- Network errors → "Connection problem. Please try again."

## Flow Examples

### Sign In Flow
1. User enters email and password
2. Client validates input
3. Call `supabase.auth.signInWithPassword()`
4. On success: redirect to `redirectTo` or `/projects`
5. On error: display user-friendly error message

### Sign Up Flow
1. User enters email and password (8+ chars)
2. Client validates input
3. Call `supabase.auth.signUp()`
4. **If auto-login enabled**: Redirect immediately
5. **If email confirmation required**: Show confirmation message
6. On error: display user-friendly error message

### Redirect Flow
1. User visits protected route (e.g., `/projects/123`)
2. App detects no session, redirects to `/login?redirectTo=/projects/123`
3. User signs in
4. App redirects to `/projects/123` (original destination)

## Testing

To test the authentication views:

1. Ensure Supabase project is configured and environment variables are set
2. Start the dev server: `npm run dev`
3. Navigate to `http://localhost:4001/login`
4. Test sign-up flow
5. Test sign-in flow
6. Test error scenarios (wrong password, invalid email, etc.)
7. Test redirect flow by visiting `/login?redirectTo=/some-path`

## Future Enhancements

Potential improvements not yet implemented:

- OAuth providers (Google, GitHub, etc.)
- Password reset flow
- Remember me functionality
- Two-factor authentication
- Account verification status display
