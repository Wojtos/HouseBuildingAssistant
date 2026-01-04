# API Endpoint Implementation Plan: Profile Endpoints

## 1. Endpoint Overview
Implementation of user profile management endpoints as specified in Section 2.1 of the REST API Plan. These endpoints allow authenticated users to retrieve and update their personal preferences and profile information.

## 2. Request Details

### GET /api/profiles/me
- **HTTP Method:** GET
- **URL Structure:** `/api/profiles/me`
- **Parameters:** None
- **Authentication:** Required (Supabase JWT)

### PUT /api/profiles/me
- **HTTP Method:** PUT
- **URL Structure:** `/api/profiles/me`
- **Authentication:** Required (Supabase JWT)
- **Request Body:** `ProfileUpdateRequest`
    - `full_name`: string (optional, max 255)
    - `preferred_units`: "METRIC" | "IMPERIAL" (optional)
    - `language`: string (optional, 2-char ISO 639-1)

## 3. Used Types
- **Schemas (app/schemas/profile.py):**
    - `ProfileResponse`: DTO for profile information.
    - `ProfileUpdateRequest`: Command model for profile updates.
- **Models (app/db/models.py):**
    - `Profile`: Database model.
- **Enums (app/db/enums.py):**
    - `MeasurementUnit`: METRIC, IMPERIAL.

## 4. Response Details
- **200 OK:** Profile retrieved or updated successfully. Returns `ProfileResponse`.
- **401 Unauthorized:** Missing or invalid authentication token.
- **404 Not Found:** Profile record not found for the authenticated user.
- **422 Unprocessable Entity:** Validation failed for input fields.
- **500 Internal Server Error:** Database or unexpected error.

## 5. Data Flow
1. **Request Reception:** FastAPI router receives the request.
2. **Authentication:** `get_current_user` dependency extracts `user_id` from JWT.
3. **Service Logic:**
    - `GET`: `ProfileService.get_profile(user_id)` fetches record from `profiles` table.
    - `PUT`: `ProfileService.update_profile(user_id, updates)` performs a partial update on the `profiles` table.
4. **Response:** Service returns the model, which is mapped to `ProfileResponse`.

## 6. Security Considerations
- **Authentication:** Enforced by `get_current_user` dependency.
- **Authorization:** Implicitly enforced as users can only access their own profile via `auth.uid() = id` logic (derived from the token's `sub` claim).
- **Validation:** Pydantic models enforce string lengths, regex patterns for language codes, and enum constraints.

## 7. Error Handling
- **Missing Profile:** If a user exists in Auth but not in the `profiles` table, return 404.
- **Database Connection:** Standard 500 error if Supabase is unreachable.
- **Invalid UUID:** Handled by the dependency (401).

## 8. Performance
- **Caching:** GET requests can benefit from `ETag` headers for conditional requests if needed in the future.
- **Database Index:** `profiles.id` is the primary key (indexed).

## 9. Implementation Steps
1. Create `backend/app/services/profile_service.py` with `get_profile` and `update_profile` methods.
2. Create `backend/app/api/profiles.py` router.
3. Implement `GET /me` using `profile_service`.
4. Implement `PUT /me` using `profile_service`.
5. Register the router in `backend/app/main.py`.
6. Add unit tests for both endpoints.

