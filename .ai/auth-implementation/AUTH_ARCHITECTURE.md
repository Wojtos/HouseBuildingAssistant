# Auth View Architecture Diagram

## 📊 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           login.astro / signup.astro                 │   │
│  │         (Astro Page - Server Rendered)               │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                     │
│                        │ Mounts with client:load             │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AuthForm.tsx                            │   │
│  │           (React Island - Hydrated)                  │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  useAuthRedirect()                            │  │   │
│  │  │  - Parse redirectTo from URL                  │  │   │
│  │  │  - Validate redirect path                     │  │   │
│  │  │  - Build URLs with redirect                   │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  Form State (useState)                        │  │   │
│  │  │  - email                                      │  │   │
│  │  │  - password                                   │  │   │
│  │  │  - isSubmitting                               │  │   │
│  │  │  - errorMessage                               │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  UI Elements                                  │  │   │
│  │  │  - Email Input                                │  │   │
│  │  │  - Password Input                             │  │   │
│  │  │  - Submit Button                              │  │   │
│  │  │  - Switch Mode Link                           │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  InlineErrorBanner.tsx (conditional)          │  │   │
│  │  │  - Displays error messages                    │  │   │
│  │  │  - ARIA live region                           │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         │ Auth API Calls                     │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           supabaseClient.ts                          │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  Supabase Client Instance                    │   │   │
│  │  │  - signInWithPassword()                      │   │   │
│  │  │  - signUp()                                  │   │   │
│  │  │  - getSession()                              │   │   │
│  │  │  - signOut()                                 │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  Helper Functions                            │   │   │
│  │  │  - getAccessToken()                          │   │   │
│  │  │  - isAuthenticated()                         │   │   │
│  │  │  - mapAuthError()                            │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Auth Service                       │
│  - Email/Password Authentication                             │
│  - Session Management                                        │
│  - Token Generation                                          │
│  - Email Confirmation (optional)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Authentication Flow Diagram

### Sign In Flow
```
┌─────────────┐
│   User      │
│ Visits      │
│ /login      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  login.astro loads                      │
│  Mounts AuthForm with mode="login"      │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  useAuthRedirect() hook                 │
│  - Parses redirectTo from URL           │
│  - Validates path (security check)      │
│  - Sets default to /projects            │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Check if already authenticated         │
│  supabase.auth.getSession()             │
└──────┬──────────────────────────────────┘
       │
       ├─ Session exists? ──► Redirect to target
       │
       └─ No session ──┐
                       │
                       ▼
              ┌─────────────────┐
              │  Display Form   │
              │  - Email input  │
              │  - Password     │
              └────────┬────────┘
                       │
                       │ User enters credentials
                       │ and submits
                       ▼
              ┌─────────────────────────┐
              │  Client Validation      │
              │  - Email format         │
              │  - Password non-empty   │
              └────────┬────────────────┘
                       │
                       ├─ Invalid? ──► Show error message
                       │
                       └─ Valid ──┐
                                  │
                                  ▼
                         ┌───────────────────────┐
                         │  Set isSubmitting     │
                         │  Disable form         │
                         │  Show loading spinner │
                         └──────┬────────────────┘
                                │
                                ▼
                         ┌──────────────────────────┐
                         │  supabase.auth           │
                         │  .signInWithPassword()   │
                         └──────┬───────────────────┘
                                │
                                ├─ Error? ──► mapAuthError()
                                │             Show user-friendly message
                                │
                                └─ Success ──┐
                                             │
                                             ▼
                                    ┌────────────────┐
                                    │  Session       │
                                    │  created       │
                                    └────────┬───────┘
                                             │
                                             ▼
                                    ┌────────────────┐
                                    │  Redirect to   │
                                    │  target path   │
                                    └────────────────┘
```

### Sign Up Flow
```
┌─────────────┐
│   User      │
│ Visits      │
│ /signup     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  signup.astro loads                     │
│  Mounts AuthForm with mode="signup"     │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Display Form                           │
│  - Email input                          │
│  - Password (min 8 chars)               │
└──────┬──────────────────────────────────┘
       │
       │ User enters credentials
       │ and submits
       ▼
┌─────────────────────────────────────────┐
│  Client Validation                      │
│  - Email format                         │
│  - Password >= 8 chars                  │
└──────┬──────────────────────────────────┘
       │
       ├─ Invalid? ──► Show error message
       │
       └─ Valid ──┐
                  │
                  ▼
         ┌─────────────────────┐
         │  supabase.auth      │
         │  .signUp()          │
         └──────┬──────────────┘
                │
                ├─ Error? ──► mapAuthError()
                │             (e.g., "User already exists")
                │
                └─ Success ──┐
                             │
                             ▼
                    ┌────────────────────────┐
                    │  Check session         │
                    └────────┬───────────────┘
                             │
                             ├─ Session exists (auto-login) ──► Redirect
                             │
                             └─ No session (email confirm) ──► Show message
                                "Check your email to confirm"
```

---

## 🗂️ File Dependency Graph

```
login.astro
    │
    └──imports──► AuthForm.tsx
                      │
                      ├──imports──► useAuthRedirect.ts
                      │
                      ├──imports──► supabaseClient.ts
                      │                 │
                      │                 └──imports──► @supabase/supabase-js
                      │
                      ├──imports──► InlineErrorBanner.tsx
                      │
                      └──imports──► types/viewModels.ts
                                        │
                                        └──exported by──► types/index.ts


signup.astro
    │
    └──imports──► AuthForm.tsx (same as above)
```

---

## 🔐 Security Layer Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Redirect Validation                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useAuthRedirect.ts                                   │  │
│  │  - Must start with /                                  │  │
│  │  - Cannot contain //                                  │  │
│  │  - Cannot contain javascript: or data:                │  │
│  │  - Defaults to /projects if invalid                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Layer 2: Input Validation (Client)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AuthForm.tsx                                         │  │
│  │  - Email format check (regex)                         │  │
│  │  - Password length check (8+ for signup)              │  │
│  │  - Required field validation                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Layer 3: Supabase Auth (Server)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Supabase Backend                                     │  │
│  │  - Email uniqueness check                             │  │
│  │  - Password strength enforcement                      │  │
│  │  - Rate limiting                                      │  │
│  │  - Email confirmation (optional)                      │  │
│  │  - JWT token generation                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Layer 4: Session Management                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Supabase Client                                      │  │
│  │  - Auto-refresh tokens                                │  │
│  │  - Secure storage (localStorage)                      │  │
│  │  - Session detection in URL                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 📦 State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                    AuthForm Component                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Local State (useState)                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  formState: {                                      │  │
│  │    email: string                                   │  │
│  │    password: string                                │  │
│  │    isSubmitting: boolean                           │  │
│  │    errorMessage: string | null                     │  │
│  │    redirectTo: string                              │  │
│  │  }                                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  Custom Hook                                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  useAuthRedirect()                                 │  │
│  │    returns: {                                      │  │
│  │      redirectTo: string                            │  │
│  │      performRedirect: () => void                   │  │
│  │      buildUrlWithRedirect: (path) => string        │  │
│  │    }                                               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  External State (Supabase)                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Session (in localStorage)                         │  │
│  │    - access_token                                  │  │
│  │    - refresh_token                                 │  │
│  │    - user metadata                                 │  │
│  │    - expires_at                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘

State Changes:
──────────────

1. User Input
   email/password change ──► setFormState({ ...prev, [field]: value })

2. Form Submit
   Submit button clicked ──► setFormState({ ...prev, isSubmitting: true })

3. Auth Success
   Supabase returns session ──► performRedirect()

4. Auth Error
   Supabase returns error ──► setFormState({ 
                                  ...prev, 
                                  isSubmitting: false,
                                  errorMessage: mappedError 
                               })
```

---

## 🌐 Network Flow

```
Browser                   Frontend                  Supabase
───────                   ────────                  ────────

  │                          │                         │
  │  1. Navigate to /login   │                         │
  ├─────────────────────────►│                         │
  │                          │                         │
  │  2. HTML + JS bundle     │                         │
  │◄─────────────────────────┤                         │
  │                          │                         │
  │  3. Enter credentials    │                         │
  │  4. Submit form          │                         │
  ├─────────────────────────►│                         │
  │                          │                         │
  │                          │  5. POST /auth/v1/token │
  │                          │  Content-Type: JSON     │
  │                          │  { email, password }    │
  │                          ├────────────────────────►│
  │                          │                         │
  │                          │                         │  6. Validate
  │                          │                         │     credentials
  │                          │                         │
  │                          │  7. 200 OK              │
  │                          │  { session, user }      │
  │                          │◄────────────────────────┤
  │                          │                         │
  │  8. Save to localStorage │                         │
  │  9. window.location.href │                         │
  │     = redirectTo         │                         │
  │◄─────────────────────────┤                         │
  │                          │                         │
  │  10. Navigate to target  │                         │
  │                          │                         │
  ▼                          ▼                         ▼
```

---

**Visual Guide Version**: 1.0  
**Last Updated**: January 10, 2026
