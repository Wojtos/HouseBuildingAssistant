-- Migration: Add trigger to auto-create profiles on user signup
-- This ensures the on_auth_user_created trigger exists

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, created_at, updated_at)
    values (new.id, new.raw_user_meta_data->>'full_name', now(), now());
    return new;
end;
$$ language plpgsql security definer;

comment on function public.handle_new_user is 'Automatically creates a profile entry when a new user signs up';

-- Trigger to create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Create profiles for any existing users without one
INSERT INTO public.profiles (id, full_name, created_at, updated_at)
SELECT id, raw_user_meta_data->>'full_name', created_at, now()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
