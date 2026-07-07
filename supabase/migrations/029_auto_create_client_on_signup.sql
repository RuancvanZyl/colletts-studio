-- Migration 029: Auto-create clients row when a new auth user registers
-- Fires on INSERT into auth.users (runs as SECURITY DEFINER, bypasses RLS)

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.clients (
    auth_user_id,
    full_name,
    email,
    phone,
    client_type,
    onboarding_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'client_type', 'export'),
    'in_progress'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop if exists to allow re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Add unique constraint on auth_user_id if not already there
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_auth_user_id_key;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_auth_user_id_key UNIQUE (auth_user_id);
