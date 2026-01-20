-- Seed data for local development
-- This file is automatically run after migrations during `supabase db reset`

-- =============================================================================
-- MOCK AUTH USER FOR LOCAL DEVELOPMENT
-- =============================================================================

-- Insert mock user into auth.users (required for foreign key from profiles)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'mock@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Insert corresponding profile for the mock user
INSERT INTO public.profiles (
    id,
    full_name,
    preferred_units,
    language,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Mock User',
    'METRIC',
    'en',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
