-- Creates or returns a client record for a hunter logging in
-- SECURITY DEFINER bypasses RLS so hunters can always get their own client row
CREATE OR REPLACE FUNCTION public.get_or_create_hunter_client(
  p_full_name text,
  p_email     text DEFAULT NULL,
  p_phone     text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_client_id uuid;
BEGIN
  -- Try to find existing client by auth_user_id
  SELECT id INTO v_client_id FROM public.clients
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

  -- Try to find by email and link
  IF p_email IS NOT NULL THEN
    SELECT id INTO v_client_id FROM public.clients
    WHERE email ILIKE p_email AND auth_user_id IS NULL
    LIMIT 1;

    IF v_client_id IS NOT NULL THEN
      UPDATE public.clients SET auth_user_id = v_user_id WHERE id = v_client_id;
      RETURN v_client_id;
    END IF;
  END IF;

  -- Create new client
  INSERT INTO public.clients (auth_user_id, full_name, email, phone, client_type, onboarding_status)
  VALUES (v_user_id, p_full_name, p_email, p_phone, 'export', 'in_progress')
  ON CONFLICT (auth_user_id) DO UPDATE SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_hunter_client(text, text, text) TO authenticated;
