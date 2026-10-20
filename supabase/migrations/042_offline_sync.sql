-- Migration 042: offline sync support (run AFTER 041).
-- Workers keep working with no internet; their actions are stored on the device with the REAL time and
-- replayed later. These changes let the database (a) record the real time the work was done and
-- (b) ignore an action it has already received (so a repeat after a flaky connection never double-counts).

CREATE TABLE IF NOT EXISTS public.offline_action_log (
  request_id uuid PRIMARY KEY,
  user_id    uuid,
  action     text NOT NULL,
  job_doc_id uuid,
  done_at    timestamptz,
  applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offline_action_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read action log" ON public.offline_action_log;
CREATE POLICY "Staff read action log" ON public.offline_action_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));
GRANT SELECT ON public.offline_action_log TO authenticated;

ALTER TABLE public.job_checklist_progress ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT now();

-- Real time of an action: never in the future, never more than 14 days old
CREATE OR REPLACE FUNCTION public._apex_action_time(p_at timestamptz) RETURNS timestamptz
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_at IS NULL THEN now()
              ELSE GREATEST(LEAST(p_at, now()), now() - interval '14 days') END
$$;

-- Returns true if this request is new (and records it), false if it was already applied
CREATE OR REPLACE FUNCTION public._apex_register_action(p_request uuid, p_action text, p_doc uuid, p_at timestamptz) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF p_request IS NULL THEN RETURN true; END IF;
  INSERT INTO offline_action_log (request_id, user_id, action, job_doc_id, done_at)
  VALUES (p_request, auth.uid(), p_action, p_doc, p_at) ON CONFLICT (request_id) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;

DROP FUNCTION IF EXISTS public.job_mark_opened(uuid);
DROP FUNCTION IF EXISTS public.job_mark_started(uuid);
DROP FUNCTION IF EXISTS public.job_check_item(uuid, uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.job_mark_opened(p_doc uuid, p_at timestamptz DEFAULT NULL, p_request_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t timestamptz := public._apex_action_time(p_at);
BEGIN
  IF public._apex_staff_role() IS NULL THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF NOT public._apex_register_action(p_request_id, 'open', p_doc, t) THEN RETURN; END IF;
  UPDATE hunt_documents SET opened_at = COALESCE(opened_at, t)
  WHERE id = p_doc AND doc_type = 'job_card' AND assigned_to = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.job_mark_started(p_doc uuid, p_at timestamptz DEFAULT NULL, p_request_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_assignee uuid; t timestamptz := public._apex_action_time(p_at);
BEGIN
  IF public._apex_staff_role() IS NULL THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF NOT public._apex_register_action(p_request_id, 'start', p_doc, t) THEN RETURN; END IF;
  SELECT assigned_to INTO v_assignee FROM hunt_documents WHERE id = p_doc AND doc_type = 'job_card';
  IF NOT FOUND THEN RAISE EXCEPTION 'Job card not found'; END IF;
  IF v_assignee IS NOT NULL AND v_assignee <> auth.uid() AND public._apex_staff_role() NOT IN ('admin','studio_manager') THEN
    RAISE EXCEPTION 'This job card is assigned to someone else';
  END IF;
  UPDATE hunt_documents SET
    started_at  = COALESCE(started_at, t),
    started_by  = COALESCE(started_by, auth.uid()),
    opened_at   = COALESCE(opened_at, t),
    assigned_to = COALESCE(assigned_to, auth.uid()),
    assigned_at = COALESCE(assigned_at, t)
  WHERE id = p_doc;
END $$;

CREATE OR REPLACE FUNCTION public.job_check_item(p_doc uuid, p_item uuid, p_done boolean, p_note text DEFAULT NULL,
                                                 p_at timestamptz DEFAULT NULL, p_request_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; t timestamptz := public._apex_action_time(p_at);
BEGIN
  IF public._apex_staff_role() IS NULL THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF NOT public._apex_register_action(p_request_id, 'check', p_doc, t) THEN RETURN; END IF;
  SELECT full_name INTO v_name FROM staff_profiles WHERE id = auth.uid();
  INSERT INTO job_checklist_progress (job_doc_id, item_id, done, done_by, done_by_name, done_at, note)
  VALUES (p_doc, p_item, p_done, auth.uid(), v_name, t, p_note)
  ON CONFLICT (job_doc_id, item_id) DO UPDATE
    SET done = EXCLUDED.done, done_by = EXCLUDED.done_by, done_by_name = EXCLUDED.done_by_name,
        done_at = EXCLUDED.done_at, recorded_at = now(), note = COALESCE(EXCLUDED.note, job_checklist_progress.note)
    WHERE job_checklist_progress.done_at <= EXCLUDED.done_at;   -- an older offline tick never overwrites a newer one
  IF p_done THEN
    UPDATE hunt_documents SET started_at = COALESCE(started_at, t), started_by = COALESCE(started_by, auth.uid()),
           opened_at = COALESCE(opened_at, t), assigned_to = COALESCE(assigned_to, auth.uid()), assigned_at = COALESCE(assigned_at, t)
    WHERE id = p_doc AND doc_type = 'job_card';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.job_mark_opened(uuid, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_mark_started(uuid, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_check_item(uuid, uuid, boolean, text, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.job_mark_opened(uuid, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_mark_started(uuid, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_check_item(uuid, uuid, boolean, text, timestamptz, uuid) TO authenticated;
