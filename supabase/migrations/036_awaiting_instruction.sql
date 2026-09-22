-- Migration 036: Awaiting Instruction tracking ("WI" hunts)
--
-- A hunt goes "Awaiting Instruction" when trophies have arrived but the
-- client hasn't yet told the workshop how they want each one mounted.
-- Production can't proceed until that's given. Staff need to see who's
-- been silent for 2+ weeks so nobody gets forgotten, and reminders should
-- go out automatically rather than relying on someone to remember.

ALTER TABLE client_hunts
  ADD COLUMN IF NOT EXISTS awaiting_instruction       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instruction_requested_at   timestamptz,
  ADD COLUMN IF NOT EXISTS instruction_received_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_instruction_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS instruction_reminder_count int NOT NULL DEFAULT 0;

COMMENT ON COLUMN client_hunts.awaiting_instruction IS
  'True when trophies have arrived but the client has not yet specified mount types — matches the "WI" ref prefix used historically';

-- ── Mark a hunt as awaiting instruction — starts the 2-week reminder clock ───
CREATE OR REPLACE FUNCTION public.start_awaiting_instruction(p_hunt_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM staff_profiles WHERE id = auth.uid() AND is_active;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Only staff can flag a hunt as awaiting instruction';
  END IF;

  UPDATE client_hunts SET
    awaiting_instruction     = true,
    instruction_requested_at = COALESCE(instruction_requested_at, now()),
    instruction_received_at  = NULL
  WHERE id = p_hunt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_awaiting_instruction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_awaiting_instruction(uuid) TO authenticated;

-- ── Mark instructions as received — stops the reminder clock ─────────────────
CREATE OR REPLACE FUNCTION public.mark_instruction_received(p_hunt_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM staff_profiles WHERE id = auth.uid() AND is_active;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Only staff can mark instructions as received';
  END IF;

  UPDATE client_hunts SET
    awaiting_instruction    = false,
    instruction_received_at = now()
  WHERE id = p_hunt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_instruction_received(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_instruction_received(uuid) TO authenticated;

-- ── View: everyone currently awaiting instruction, with reminder due-ness ───
CREATE OR REPLACE VIEW public.v_awaiting_instruction AS
SELECT
  ch.id                         AS hunt_id,
  ch.client_id,
  ch.ref_number,
  ch.year,
  ch.instruction_requested_at,
  ch.last_instruction_reminder_at,
  ch.instruction_reminder_count,
  c.full_name                   AS client_name,
  c.email                       AS client_email,
  c.client_number,
  GREATEST(
    0,
    EXTRACT(DAY FROM now() - COALESCE(ch.last_instruction_reminder_at, ch.instruction_requested_at))::int
  ) AS days_since_last_contact,
  (COALESCE(ch.last_instruction_reminder_at, ch.instruction_requested_at) <= now() - interval '14 days')
    AS reminder_due
FROM client_hunts ch
JOIN clients c ON c.id = ch.client_id
WHERE ch.awaiting_instruction = true
  AND ch.status = 'active';

-- RLS on the view follows the underlying tables' policies automatically via security_invoker
ALTER VIEW public.v_awaiting_instruction SET (security_invoker = true);
