# View Implementation Plan: Auth (Sign in / Sign up)

## 1. Overview
Auth views allow users to establish a Supabase session required to access all API-backed functionality (projects, chat, documents, memory). They must support a “return to where you left off” flow and consistent handling of expired sessions.

## 2. View Routing
- **Sign in**: `/login`
- **Sign up**: `/signup`
- **Optional unified**: `/auth` (not required if implementing `/login` + `/signup`)
- **Post-auth redirect target**: `redirectTo` query param (e.g. `/login?redirectTo=/projects`)

## 3. Component Structure
Auth pages are Astro routes with a single interactive React island that handles Supabase Auth and redirects.

```
AuthPage.astro
└─ <AuthForm client:load mode="login|signup" />
   ├─ AuthCard
   │  ├─ AuthHeader (title/subtitle)
   │  ├─ AuthFields
   │  │  ├─ EmailInput
   │  │  └─ PasswordInput
   │  ├─ SubmitButton
   │  ├─ InlineErrorBanner
   │  └─ SecondaryActions (toggle login/signup, forgot password placeholder)
   └─ AuthStatusToast (success/failure, optional)
```

## 4. Component Details

### `AuthPage.astro`
- **Component description**: Route shell for `/login` and `/signup`. Minimal markup; mounts React island.
- **Main elements**: `<main>` container, centered card layout.
- **Handled events**: none (delegated to React).
- **Validation conditions**: none.
- **Types**: none.
- **Props**: none.

### `AuthForm` (React)
- **Component description**: Implements sign-in/sign-up flows via Supabase; manages local form state, error messages, and redirect.
- **Main elements**:
  - `<form>` with email/password inputs
  - Submit `<button>`
  - Region for errors (`role="alert"`, `aria-live="polite"`)
  - Link to switch between `/login` and `/signup` (preserving `redirectTo`)
- **Handled events**:
  - `onSubmit`: triggers Supabase auth call
  - `onChange`: updates controlled fields
  - `onClick` “switch mode”: navigate to other auth route
- **Validation conditions (client-side; before calling Supabase)**:
  - Email required; basic email format check (lightweight; Supabase will validate as well)
  - Password required; for signup enforce a minimum length (recommend 8+) to reduce obvious failures
  - Disable submit while request in-flight
- **Types**:
  - **ViewModel**:
    - `AuthFormVM`:
      - `mode: 'login' | 'signup'`
      - `email: string`
      - `password: string`
      - `isSubmitting: boolean`
      - `errorMessage: string | null`
      - `redirectTo: string` (defaults to `/projects`)
- **Props**:
  - `mode: 'login' | 'signup'`
  - `redirectTo?: string` (optional; if not provided, read from query string)

### `InlineErrorBanner` (React, shared)
- **Component description**: Shared “error mapping” UI for auth errors (and later API errors).
- **Main elements**: `<div role="alert">` with message and optional action.
- **Handled events**: optional “Try again”.
- **Validation conditions**: none.
- **Types**:
  - `ErrorBannerVM`:
    - `title?: string`
    - `message: string`
    - `actionLabel?: string`
    - `onAction?: () => void`
- **Props**: matches `ErrorBannerVM`.

## 5. Types
No backend DTOs are directly used in this view (auth is via Supabase SDK). New view model types to add (recommend in `frontend/src/types/viewModels.ts` or colocated near the view):
- `AuthFormVM` (see above)
- `ErrorBannerVM` (shared)

## 6. State Management
- **Local state in `AuthForm`**:
  - `email`, `password`
  - `isSubmitting`
  - `errorMessage`
  - `redirectTo` (parsed once)
- **Suggested custom hook**:
  - `useAuthRedirect()`:
    - Reads `redirectTo` from query string (safe whitelist: only allow same-origin paths starting with `/`)
    - After successful auth, navigates to `redirectTo` (default `/projects`)

## 7. API Integration
Auth is implemented with Supabase JS SDK (no backend REST endpoint):
- **Supabase client**: create `frontend/src/lib/supabaseClient.ts`
  - Uses `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
- **Sign in**: `supabase.auth.signInWithPassword({ email, password })`
- **Sign up**: `supabase.auth.signUp({ email, password })`
- **Session persistence**: rely on Supabase default storage; also expose `getAccessToken()` helper for REST calls.

## 8. User Interactions
- **Sign in success**: redirect to `redirectTo` or `/projects`
- **Sign in failure**: show mapped error (invalid credentials, rate limit, network)
- **Sign up success**: either redirect immediately (if auto-session) or show “check your email” if email confirmation is enabled in Supabase project settings
- **Switch mode**: user can navigate between `/login` and `/signup` while preserving `redirectTo`

## 9. Conditions and Validation
- **Redirect safety**: accept only relative paths (start with `/` and do not contain `//`).
- **Submit gating**: disable submit button when `isSubmitting` or when required fields empty.

## 10. Error Handling
- **Network error**: “Connection problem. Please try again.”
- **Supabase auth error**:
  - Wrong credentials → “Email or password is incorrect.”
  - Too many requests → “Too many attempts. Try again later.”
  - Email confirmation required → “Check your email to confirm your account.”
- **Already authenticated**: if session exists on mount, redirect to `redirectTo` or `/projects`.

## 11. Implementation Steps
1. Create `supabaseClient.ts` using `@supabase/supabase-js` and env vars.
2. Add Astro routes: `src/pages/login.astro` and `src/pages/signup.astro`.
3. Implement `AuthForm` React component (form + Supabase calls + redirect).
4. Implement `useAuthRedirect()` helper and safe `redirectTo` parsing.
5. Add basic shared `InlineErrorBanner` (reused across future views).
6. Add minimal styling (Tailwind + (optional) shadcn/ui Card/Input/Button if adopted).
