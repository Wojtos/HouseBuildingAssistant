# View Implementation Plan: Account Settings (Profile Preferences)

## 1. Overview
Account Settings lets the authenticated user view and update profile preferences used across the application (full name, preferred units, language). It must handle the “profile missing” (`404`) case gracefully and provide clear save states.

## 2. View Routing
- **View path**: `/settings/account`
- **Entry points**: global header link (from `/projects`, and from project shell)

## 3. Component Structure

```
AccountSettingsPage.astro
└─ <AccountSettingsView client:load />
   ├─ PageHeader (Back)
   ├─ ProfileForm
   │  ├─ FullNameField
   │  ├─ PreferredUnitsSelect
   │  ├─ LanguageField
   │  ├─ SaveButton
   │  └─ FormStatus (saved/saving/error)
   └─ ApiErrorBanner
```

## 4. Component Details

### `AccountSettingsPage.astro`
- **Component description**: Route shell for `/settings/account`.
- **Main elements**: `<main>`, container.
- **Handled events**: none.
- **Types**: none.
- **Props**: none.

### `AccountSettingsView` (React)
- **Component description**: Loads profile on mount (`GET /api/profiles/me`), binds values to a form, and persists updates via `PUT /api/profiles/me`.
- **Main elements**:
  - `<form>`
  - Inputs/selects
  - Save button with disabled/loading states
  - Status region (`aria-live`)
- **Handled events**:
  - `onMount`: fetch profile
  - `onChange`: update local draft state; track dirty state
  - `onSubmit`: validate and call PUT
- **Validation conditions (per API plan)**
  - `full_name`: optional; max 255 chars (recommend enforce)
  - `preferred_units`: must be `METRIC` or `IMPERIAL` (`MeasurementUnit`)
  - `language`: must be 2 characters (ISO 639-1); enforce `^[a-z]{2}$` (lowercase) or normalize to lowercase
- **Types (DTO + ViewModel)**
  - DTOs:
    - `ProfileResponse`
    - `ProfileUpdateRequest`
    - `MeasurementUnit`
  - ViewModels:
    - `ProfileFormVM`:
      - `full_name: string`
      - `preferred_units: MeasurementUnit`
      - `language: string`
      - `isLoading: boolean`
      - `isSaving: boolean`
      - `isDirty: boolean`
      - `fieldErrors: { full_name?: string; preferred_units?: string; language?: string }`
      - `loadError: string | null`
      - `saveError: string | null`
      - `lastSavedAt?: string`
- **Props**: none.

### `PreferredUnitsSelect` (React)
- **Component description**: select control for `MeasurementUnit`.
- **Main elements**: `<select>` (or shadcn Select).
- **Handled events**: `onChange`.
- **Validation**: value must be `METRIC` or `IMPERIAL`.
- **Types**: `MeasurementUnit`.
- **Props**:
  - `value: MeasurementUnit`
  - `onChange: (value: MeasurementUnit) => void`

## 5. Types
New types recommended:
- `ProfileFormVM` (see above)

## 6. State Management
- Use a “source-of-truth profile” + “draft profile” pattern:
  - On load, set both `loadedProfile` and `draft`.
  - `isDirty = !deepEqual(draft, loadedProfile)` (or track dirty per field).
- Suggested hook:
  - `useProfile()`:
    - `getProfile(): Promise<ProfileResponse>`
    - `updateProfile(patch: ProfileUpdateRequest): Promise<ProfileResponse>`

## 7. API Integration
- `GET /api/profiles/me`
  - Response: `ProfileResponse`
- `PUT /api/profiles/me`
  - Request: `ProfileUpdateRequest`
  - Response: `ProfileResponse`
- Auth header: `Authorization: Bearer <supabase_access_token>`

## 8. User Interactions
- **Load settings**: show skeleton/loading state
- **Edit**: updates draft; enables Save button
- **Save**: validates → PUT → show success state (“Saved”)
- **Navigate away**:
  - MVP: allow navigation without guard; optional confirm dialog if dirty (nice-to-have)

## 9. Conditions and Validation
- Normalize `language` to lowercase and trim whitespace.
- Disable Save button when:
  - `!isDirty` OR `isSaving` OR form has blocking validation errors.

## 10. Error Handling
- `401 UNAUTHORIZED`: redirect to `/login?redirectTo=/settings/account`
- `404 NOT_FOUND` (profile missing): show guided recovery message:
  - “Your profile record wasn’t found. Try signing out and signing back in. If it still happens, contact support.”
- `422 VALIDATION_ERROR`: map to field errors (language length, units enum)
- `503 SERVICE_UNAVAILABLE`: show retry; keep draft.

## 11. Implementation Steps
1. Add Astro route `src/pages/settings/account.astro`.
2. Implement `AccountSettingsView` React island.
3. Add `useProfile` hook with `getProfile` and `updateProfile`.
4. Add client-side validation per API plan.
5. Add status UX (loading/saving/success) and robust 404 handling.
