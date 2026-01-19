# HomeBuild AI Assistant — Authentication Architecture Specification (MVP)

## 0. Scope, constraints, and non-goals

### Scope (what we are building)
- **Authentication method**: Supabase Auth **email + password** only.
- **Flows supported**:
  - **Sign up** (email + password)
  - **Sign in** (email + password)
  - **Sign out**
- **Auth-gated application**: all project/chat/document/memory/profile functionality is only available when authenticated (per PRD requirement: “Supabase user authentication to save project progress”).

### Explicit non-goals (out of scope)
- **Password recovery / reset** (even though some templates mention it).
- OAuth/social login providers.
- 2FA, magic links, SSO.

### Compatibility requirements (must not break existing documented behavior)
- **Frontend ↔ backend contract**: browser calls FastAPI at `PUBLIC_API_URL` (default `http://localhost:5001`) with `Authorization: Bearer <supabase_access_token>` as implemented in `frontend/src/lib/apiClient.ts`.
- **Backend auth model**: FastAPI verifies the token via Supabase (`supabase.auth.get_user(token)`) as implemented in `backend/app/api/dependencies.py`.
- **Data model assumptions**: `public.profiles.id` references `auth.users.id`, created via trigger `on_auth_user_created` (see `supabase/migrations/20251222100200_create_core_tables.sql`).
- **Astro deployment**: SSR is enabled through `@astrojs/node` standalone adapter (`frontend/astro.config.mjs`).

## 1. User interface architecture

### 1.1 Route map and auth/non-auth mode behavior

#### Public (non-auth) routes
- `GET /login`
  - **Purpose**: sign in
  - **Behavior if already authenticated**: redirect to `redirectTo` (if safe), else `/projects`
- `GET /signup`
  - **Purpose**: sign up
  - **Behavior if already authenticated**: redirect to `redirectTo` (if safe), else `/projects`

#### Protected (auth-required) routes
These routes must redirect unauthenticated users to `GET /login?redirectTo=<current_path_and_query>`.
- `GET /` (currently wraps `ChatInterface` in `ProtectedRoute`)
- `GET /projects/new`
- `GET /projects/:projectId/chat` (already SSR via `export const prerender = false;`)
- Any additional `/projects/:projectId/*` pages (files/facts/settings) as they are implemented.

### 1.2 Layouts and page composition

#### `AuthLayout` (Astro, public)
**Purpose**: minimal HTML shell for auth routes, no dependency on authenticated state.
- Responsible for:
  - SEO/meta defaults for auth pages
  - Mounting one React island: `AuthForm`

#### `AppLayout` (Astro, protected)
**Purpose**: authenticated shell for all protected pages.
- Responsible for:
  - **Server-side guard**: check `Astro.locals.user` (set by middleware); redirect if missing
  - Consistent navigation frame (header/sidebar as needed)
  - Including a **Sign out** action (links/button)

Recommended navigation elements for authenticated mode:
- App title / home link
- “Projects” link (as soon as a projects list view exists)
- Optional user indicator (email)
- **Sign out** button

### 1.3 Separation of responsibilities (Astro vs React)

#### Astro pages (server-rendered shells)
**Own:**
- Route-level auth gating (SSR redirect decisions) using `Astro.locals.user`.
- Static structure/layout and routing concerns.
- Passing `redirectTo` into React islands when appropriate (optional; React can also read it from `window.location.search`).

**Do not own:**
- Handling email/password form state, async calls, loading states.
- Mapping Supabase errors into user-facing strings.

#### React islands (client-side interactive components)

##### `AuthForm` (`frontend/src/components/AuthForm.tsx`) — extend/adjust responsibilities
**Own:**
- Controlled inputs (email/password), client-side validation, UX (loading/disabled).
- Calling the **frontend auth contract** (see §3.3) to perform login/signup and establish session.
- Redirecting after success using safe redirect rules (`useAuthRedirect`).

**Do not own:**
- Any direct coupling to FastAPI auth (FastAPI does not authenticate users; it only validates JWT).
- Any server-only secret handling.

##### `ProtectedRoute` (`frontend/src/components/ProtectedRoute.tsx`) — client fallback only
Current `ProtectedRoute` contains a temporary bypass (it immediately marks authenticated). The target architecture is:
- **Primary enforcement**: **server-side** (Astro middleware + page-level checks).
- **Secondary safety net**: keep `ProtectedRoute` as a client-side guard for:
  - hydration edge cases (stale tabs, expired session after initial SSR)
  - routes that are intentionally client-only

In the target design, `ProtectedRoute` must:
- call an auth state function (see §3.4) to detect a valid session
- redirect unauthenticated users to `/login?redirectTo=...`
- show a loading fallback while checking auth

### 1.4 Validation rules and user-facing messages

#### Shared validation rules (client-side, before calling Supabase)
- **Email**
  - Required
  - Must match a basic email format (e.g. `^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$`)
  - Normalize by trimming whitespace
- **Password**
  - Required
  - For **signup**: minimum length **8**
  - For **login**: non-empty (do not enforce strength client-side; Supabase policies may apply server-side)

#### Auth error mapping (user-facing messages)
Use a deterministic mapping layer (existing `mapAuthError()` in `frontend/src/lib/supabaseClient.ts`) and extend as needed:
- Invalid credentials → **“Invalid email or password. Please try again.”**
- Email not confirmed (if enabled) → **“Please confirm your email address before signing in.”**
- User already exists → **“An account with this email already exists.”**
- Password too short → **“Password must be at least 8 characters long.”**
- Network/fetch issues → **“Network error. Please check your connection and try again.”**
- Generic fallback → **“Authentication failed. Please try again.”**

#### UI error presentation
- **Inline per-field errors** (preferred for required/format checks)
- **Single banner** (`InlineErrorBanner`) for:
  - auth provider errors (Supabase)
  - unexpected failures
- Accessibility:
  - banner uses `role="alert"` + `aria-live="polite"`
  - focus management: when submit fails due to validation, focus the first invalid field

### 1.5 Key scenarios (end-to-end)

#### Scenario A: unauthenticated user visits protected page
1. User requests `/projects/new` (or any protected route).
2. **Astro middleware** checks session (cookie-based) and finds no user.
3. Response is a redirect to `/login?redirectTo=/projects/new`.
4. After sign-in, user is redirected back to `/projects/new`.

#### Scenario B: authenticated user opens `/login` or `/signup`
1. Middleware detects a valid session.
2. Auth page redirects to `/projects` (or a safe `redirectTo`).

#### Scenario C: session expires while using the app
1. User is on `/projects/:id/chat`.
2. A FastAPI call returns **401**.
3. Frontend `handleApiError()` redirects to `/login?redirectTo=/projects/:id/chat`.
4. After sign-in, user resumes where they left off.

#### Scenario D: logout
1. User clicks “Sign out”.
2. Session is cleared (cookie + browser client state).
3. User is redirected to `/login`.

#### Scenario E: signup with email confirmation enabled (optional)
1. User signs up successfully but Supabase returns no session.
2. UI shows **“Check your email to confirm your account.”**
3. User returns after confirming and signs in (no recovery/reset flow is provided).

## 2. Backend logic (FastAPI)

### 2.1 Principles
- FastAPI is **not** responsible for credential verification or password storage.
- FastAPI is responsible for:
  - enforcing **authentication** on API endpoints via Bearer JWT
  - enforcing **authorization** (project ownership)
  - validating request bodies via Pydantic
  - returning consistent error responses for the frontend

### 2.2 API endpoint structure (current + required auth posture)

#### Existing API groups (already present)
- **Profiles**: `GET /api/profiles/me`, `PUT /api/profiles/me`
- **Projects**: `POST /api/projects`, etc.
- **Messages/Chat**: `GET /api/projects/:id/messages`, `POST /api/projects/:id/chat`, `POST /api/projects/:id/messages/:messageId/feedback`
- **Project memory**: `GET/PATCH /api/projects/:id/memory`
- **Documents**: under `/api/projects/:id/documents` (must follow same auth rules)

#### Authentication contract (unchanged)
- Client sends `Authorization: Bearer <supabase_access_token>`
- FastAPI dependency `get_current_user()`:
  - extracts token
  - verifies it via Supabase (`supabase.auth.get_user(token)`)
  - returns `user_id: UUID` from the verified user
  - supports `MOCK_AUTH=true` for development

#### Authorization contract (unchanged)
- For project-scoped endpoints, use `verify_project_ownership(project_id, user_id, supabase)` to ensure:
  - 404 if project does not exist
  - 403 if project exists but belongs to a different user

### 2.3 Data models (Supabase)
Authentication ties directly into database ownership via `profiles.id`:
- `public.profiles.id` == `auth.users.id` (created by trigger on user creation)
- `public.projects.user_id` references `public.profiles(id)`
- `public.messages.user_id` references `public.profiles(id)`

Implication:
- The backend must consistently use the Supabase-authenticated user id as the owner key.
- No separate “users” table is required beyond `profiles`.

### 2.4 Input validation mechanism
Use Pydantic request models for all write endpoints:
- Express constraints in schemas (min/max length, enums, numeric bounds).
- For query parameters, use FastAPI `Query(...)` constraints.

Validation outcomes:
- **422** for request validation failures (FastAPI default), but see §2.5 for response shape standardization.

### 2.5 Exception handling and error response standardization

#### Problem (current state)
Frontend expects the standard error envelope (see `frontend/src/types/api.ts`), but many FastAPI errors currently return `{ "detail": "..." }`.

#### Target contract
All API errors returned from FastAPI under `/api/*` should conform to `backend/app/schemas/common.py::ErrorResponse`:
- Authentication failures: `UNAUTHORIZED`
- Authorization failures: `FORBIDDEN`
- Not found: `NOT_FOUND`
- Validation: `VALIDATION_ERROR`
- Rate limiting: `RATE_LIMITED`
- Unexpected: `INTERNAL_ERROR`
- Downstream AI outages/timeouts: `SERVICE_UNAVAILABLE`

#### Mechanism
Add global exception handlers in FastAPI (`backend/app/main.py`):
- handler for `HTTPException` → map status code to `ErrorCode` and return `ErrorResponse`
- handler for request validation (`RequestValidationError`) → return `VALIDATION_ERROR` and populate `details.field/reason` when possible
- handler for generic `Exception` → return `INTERNAL_ERROR`

This enables the frontend’s `fetchJson()` to reliably throw `ApiError` with meaningful messages and preserves existing redirect behavior on 401 via `handleApiError()`.

### 2.6 SSR interaction with FastAPI (no change)
Astro SSR does not proxy FastAPI; the browser still calls FastAPI directly using `PUBLIC_API_URL`.
Therefore:
- SSR auth gating is a **frontend responsibility**.
- Backend remains stateless and relies solely on Bearer tokens.

## 3. Authentication system (Supabase Auth + Astro SSR)

### 3.1 Core decision: cookie-based session for SSR
To support SSR route protection (Astro Node adapter), authentication must be readable on the server.
The recommended mechanism (per `supabase-auth.mdc`) is:
- Use **`@supabase/ssr`** (not auth-helpers) to manage Supabase sessions via cookies.

Outcome:
- Astro middleware can call `supabase.auth.getUser()` server-side and set `Astro.locals.user`.
- Protected pages can redirect before any client JS loads.

### 3.2 Supabase client architecture (frontend)

#### Server-side Supabase client
- Module: `frontend/src/db/supabase.client.ts` (new)
- Factory: `createSupabaseServerInstance({ headers, cookies })`
- Must implement cookie handling using **only**:
  - `cookies.getAll()`
  - `cookies.setAll()`
- Must set secure cookie options (path `/`, `sameSite=lax`, `httpOnly`, `secure` in production).

#### Browser-side Supabase client
- Module: keep `frontend/src/lib/supabaseClient.ts` as the browser client boundary, but evolve it to be compatible with SSR-cookie sessions.
- Responsibilities:
  - expose `getAccessToken()` for FastAPI calls
  - expose `isAuthenticated()` for client fallback checks
  - expose `signOut()` used by UI

### 3.3 Frontend auth API contract (Astro routes)
To ensure server-set cookies (SSR compatibility), define a minimal auth API under Astro:
- `POST /api/auth/login`
  - body: `{ email: string, password: string }`
  - action: `supabase.auth.signInWithPassword(...)`
  - result: `200` on success, `400` on auth failure
- `POST /api/auth/register`
  - body: `{ email: string, password: string }`
  - action: `supabase.auth.signUp(...)`
  - result:
    - `200` if session established
    - `200` with `{ needsEmailConfirmation: true }` if configured and no session is returned
- `POST /api/auth/logout`
  - action: `supabase.auth.signOut()` and clear cookies
  - result: `200`

These endpoints are part of the **frontend** (Astro), not FastAPI, and exist solely to establish/clear SSR-readable sessions.

### 3.4 Astro middleware (route protection and user injection)
Add Astro middleware (`frontend/src/middleware/index.ts`) using `defineMiddleware`:
- Define `PUBLIC_PATHS = ['/login', '/signup', '/api/auth/login', '/api/auth/register', '/api/auth/logout']`
- For all other paths:
  - create server Supabase instance
  - call `supabase.auth.getUser()` first
  - if user exists: set `locals.user = { id, email }`
  - else: redirect to `/login?redirectTo=<safe_current_path>`

### 3.5 Server-side rendering changes in selected pages (Astro)
Given the Node adapter in `frontend/astro.config.mjs`, SSR is available. Pages should adopt:
- **Protected pages**: check `Astro.locals.user` and redirect if missing (defense-in-depth even with middleware).
- **Auth pages**: if `Astro.locals.user` exists, redirect away (avoid showing login to signed-in users).

Existing dynamic page behavior to preserve:
- `src/pages/projects/[projectId]/chat.astro` has `export const prerender = false;` — keep it.

### 3.6 Sign out UX integration
Add a reusable UI element to authenticated layout:
- `SignOutButton` (React island) or a simple form/button that calls `POST /api/auth/logout` then navigates to `/login`.

### 3.7 Security considerations
- **Open redirect prevention**: keep and reuse `useAuthRedirect()` safe path validation rules.
- **Cookie safety**: server cookies must be `httpOnly`, `sameSite=lax`; `secure` in production.
- **No secret leakage**: only Supabase **anon** keys are used client-side; server-only env vars must not be `PUBLIC_*`.
- **Authorization remains server-side**: FastAPI still validates project ownership; frontend redirects are UX, not security.

## 4. Module and contract inventory (what exists vs what is introduced)

### Frontend (existing, to be used/extended)
- `frontend/src/pages/login.astro`, `frontend/src/pages/signup.astro`
- `frontend/src/components/AuthForm.tsx`
- `frontend/src/hooks/useAuthRedirect.ts`
- `frontend/src/lib/supabaseClient.ts` (browser auth utilities)
- `frontend/src/lib/apiClient.ts` (FastAPI client; attaches Bearer token)
- `frontend/src/components/ProtectedRoute.tsx` (must be re-enabled as real guard, not bypassed)
- `frontend/src/components/InlineErrorBanner.tsx`

### Frontend (new, to be introduced for SSR auth)
- `frontend/src/db/supabase.client.ts` — server Supabase client factory using `@supabase/ssr`
- `frontend/src/middleware/index.ts` — global auth middleware
- `frontend/src/pages/api/auth/login.ts`
- `frontend/src/pages/api/auth/register.ts`
- `frontend/src/pages/api/auth/logout.ts`
- `frontend/src/components/SignOutButton.tsx` (optional but recommended)
- Layout shells (optional but recommended):
  - `frontend/src/layouts/AuthLayout.astro`
  - `frontend/src/layouts/AppLayout.astro`

### Backend (existing, to be relied on)
- `backend/app/api/dependencies.py::get_current_user` (JWT verification)
- `backend/app/api/dependencies.py::verify_project_ownership`
- `backend/app/api/*` routers
- `backend/app/schemas/common.py::ErrorResponse` (standard envelope to enforce globally)

### Backend (changes required to meet contract)
- Add FastAPI exception handlers in `backend/app/main.py` to always return `ErrorResponse` for `/api/*`.

