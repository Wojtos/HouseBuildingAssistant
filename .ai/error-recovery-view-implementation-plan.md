# View Implementation Plan: Error / Recovery Views (403, 404, Offline)

## 1. Overview
Error/recovery views provide consistent, user-friendly handling for authorization (403), not-found (404), and offline/connectivity scenarios. They must avoid leaking sensitive details, offer clear next actions, and be accessible (proper headings, focus management).

## 2. View Routing
- **403**: `/403`
- **404**: `/404`
- **Offline**: `/offline`
- **Usage**:
  - Project shell and API client redirect here (or show inline banners with the same components).

## 3. Component Structure

```
ErrorPage.astro (per route)
└─ <ErrorView client:load variant="403|404|offline" />
   ├─ ErrorIllustration (optional)
   ├─ ErrorTitle
   ├─ ErrorDescription
   ├─ PrimaryCTAButton
   ├─ SecondaryCTAButton (optional)
   └─ DebugDetails (hidden in prod; optional)
```

## 4. Component Details

### `403.astro`, `404.astro`, `offline.astro`
- **Component description**: Route shells that mount the shared React `ErrorView`.
- **Main elements**: `<main>` with centered content; `<h1>`.
- **Handled events**: none.
- **Validation**: none.
- **Types**: none.
- **Props**: none.

### `ErrorView` (React)
- **Component description**: Displays the correct messaging and CTAs per variant.
- **Main elements**:
  - `<h1>` title
  - `<p>` description
  - CTA buttons/links
- **Handled events**:
  - Primary CTA click navigation
  - Secondary CTA click navigation
- **Validation**: none.
- **Types (ViewModel)**
  - `ErrorViewVM`:
    - `variant: '403' | '404' | 'offline'`
    - `title: string`
    - `description: string`
    - `primaryCta: { label: string; href: string }`
    - `secondaryCta?: { label: string; href: string }`
- **Props**:
  - `variant: '403' | '404' | 'offline'`
  - `returnTo?: string` (optional; allows “Go back”)

## 5. Types
New type:
- `ErrorViewVM` (see above)

## 6. State Management
Mostly static. Optional:
- Parse `returnTo` query param for navigation (validate as same-origin path, starts with `/`).

## 7. API Integration
No direct API calls.
Integration points:
- Central API client should map errors:
  - `401` → redirect to `/login?redirectTo=<current>`
  - `403` → redirect to `/403?returnTo=/projects`
  - `404` → redirect to `/404?returnTo=/projects`
- Offline detection:
  - `navigator.onLine` and `window` online/offline events
  - Network fetch failures should show offline recovery (either inline or route to `/offline`)

## 8. User Interactions
- **403**:
  - Message: “You don’t have access to that resource.”
  - Primary CTA: “Back to projects” → `/projects`
- **404**:
  - Message: “We couldn’t find that page / project / document.”
  - Primary CTA: “Back to projects” → `/projects`
  - Secondary CTA: “Back to files” when relevant (if `returnTo` includes `/files`)
- **Offline**:
  - Message: “You’re offline. Check your connection.”
  - Primary CTA: “Retry” → reload current page (or navigate to `returnTo`)
  - Secondary CTA: “Back to projects”

## 9. Conditions and Validation
- Don’t reveal whether a forbidden resource exists (403 vs 404 messaging should be generic and not leak IDs).
- Validate `returnTo` to prevent open redirects.

## 10. Error Handling
- If `returnTo` invalid/missing, default to `/projects`.
- If user is not authenticated, prefer redirect to `/login` over showing 403/404 for protected routes.

## 11. Implementation Steps
1. Add Astro routes: `src/pages/403.astro`, `src/pages/404.astro`, `src/pages/offline.astro`.
2. Implement shared `ErrorView` React component with variants.
3. Add safe `returnTo` parsing helper and integrate into API error handling strategy.
4. Add optional inline “offline banner” that routes to `/offline` when disconnected.
