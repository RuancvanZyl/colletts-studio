-- Migration 040: staff can resolve the attention flags on the Client Status Board
-- (no job card, awaiting instruction, deposit not paid, waiting too long, profile problem).
-- A resolved flag stays visible, marked as resolved with who / when / why.

CREATE TABLE IF NOT EXISTS public.client_flag_resolutions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  flag_key         text NOT NULL CHECK (flag_key IN ('noJobCard','instruction','deposit','waiting','profile')),
  note             text,
  resolved_by      uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  resolved_by_name text,
  resolved_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, flag_key)
);

ALTER TABLE public.client_flag_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read flag resolutions" ON public.client_flag_resolutions;
CREATE POLICY "Staff read flag resolutions" ON public.client_flag_resolutions FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

DROP POLICY IF EXISTS "Staff write flag resolutions" ON public.client_flag_resolutions;
CREATE POLICY "Staff write flag resolutions" ON public.client_flag_resolutions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

DROP POLICY IF EXISTS "Staff update flag resolutions" ON public.client_flag_resolutions;
CREATE POLICY "Staff update flag resolutions" ON public.client_flag_resolutions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

DROP POLICY IF EXISTS "Staff delete flag resolutions" ON public.client_flag_resolutions;
CREATE POLICY "Staff delete flag resolutions" ON public.client_flag_resolutions FOR DELETE
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_flag_resolutions TO authenticated;
