-- Migration 041: task flow — assignment, priority, due dates, opened/started tracking,
-- and a required checklist per department that must be complete before a job moves on.

-- 1. Task fields on every job card ------------------------------------------------------------
ALTER TABLE public.hunt_documents
  ADD COLUMN IF NOT EXISTS assigned_to   uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notes   text,
  ADD COLUMN IF NOT EXISTS assigned_by   uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at   timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at     timestamptz,
  ADD COLUMN IF NOT EXISTS started_at    timestamptz,
  ADD COLUMN IF NOT EXISTS started_by    uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority      smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS due_date      date,
  ADD COLUMN IF NOT EXISTS priority_note text;

COMMENT ON COLUMN public.hunt_documents.priority IS '1 = urgent, 2 = high, 3 = normal, 4 = low';

CREATE INDEX IF NOT EXISTS idx_hunt_docs_task_order
  ON public.hunt_documents (assigned_to, priority, due_date) WHERE doc_type = 'job_card';

-- 2. Department checklists ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.department_checklist_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_key       text NOT NULL,
  label          text NOT NULL,
  requires_photo boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 100,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dept_key, label)
);

CREATE TABLE IF NOT EXISTS public.job_checklist_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_doc_id   uuid NOT NULL REFERENCES public.hunt_documents(id) ON DELETE CASCADE,
  item_id      uuid NOT NULL REFERENCES public.department_checklist_items(id) ON DELETE CASCADE,
  done         boolean NOT NULL DEFAULT true,
  done_by      uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  done_by_name text,
  done_at      timestamptz NOT NULL DEFAULT now(),
  note         text,
  UNIQUE (job_doc_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_checklist_progress_job ON public.job_checklist_progress (job_doc_id);

ALTER TABLE public.department_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_checklist_progress     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read checklist items" ON public.department_checklist_items;
CREATE POLICY "Staff read checklist items" ON public.department_checklist_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

DROP POLICY IF EXISTS "Admin write checklist items" ON public.department_checklist_items;
CREATE POLICY "Admin write checklist items" ON public.department_checklist_items FOR ALL
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active AND role IN ('admin','studio_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active AND role IN ('admin','studio_manager')));

DROP POLICY IF EXISTS "Staff read checklist progress" ON public.job_checklist_progress;
CREATE POLICY "Staff read checklist progress" ON public.job_checklist_progress FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_checklist_items TO authenticated;
GRANT SELECT ON public.job_checklist_progress TO authenticated;

-- Starter checklists (taken from the existing station instructions). Receiving is left out on purpose:
-- the Receiving Sheet screen is its protocol. Edit these later in the app.
INSERT INTO public.department_checklist_items (dept_key, label, requires_photo, sort_order) VALUES
  ('skinning', 'Measure and photograph the trophy before skinning', true, 10),
  ('skinning', 'Make the correct incision for the mount type (Y-cut for shoulder, dorsal for full)', false, 20),
  ('skinning', 'Carefully skin around the face — eyes, ears, nose, lips', false, 30),
  ('skinning', 'Remove all flesh and membrane from the inside of the skin', false, 40),
  ('skinning', 'Clean and separate skull if required — label everything with the tag number', false, 50),
  ('skinning', 'Photograph completed skin and skull before moving to salting', true, 60),
  ('salting', 'Lay skin flesh-side up on a clean slanting surface', false, 10),
  ('salting', 'Apply a thick, even layer of coarse salt over the entire flesh side', false, 20),
  ('salting', 'Work salt '||'into all folds — around ears, lips and feet', false, 30),
  ('salting', 'Fold the skin flesh-side in (salt inside)', false, 40),
  ('salting', 'Allow 24–48h to drain — do not stack salted skins', false, 50),
  ('salting', 'Mark complete when skin is fully salted and drained', false, 60),
  ('cleaning_bleach', 'Flesh and clean skin thoroughly — remove all fat and membrane', false, 10),
  ('cleaning_bleach', 'Salt the skin side liberally and fold flesh-side in', false, 20),
  ('cleaning_bleach', 'Allow 24h to drain before moving', false, 30),
  ('cleaning_bleach', 'Bleach horns or skull if required for this mount type', false, 40),
  ('cleaning_bleach', 'Mark complete when cured and ready', false, 50),
  ('tannery', 'Rehydrate salted skin in pickle bath', false, 10),
  ('tannery', 'Shave skin to even thickness', false, 20),
  ('tannery', 'Tan in appropriate tan solution (chrome or vegetable)', false, 30),
  ('tannery', 'Neutralise and oil skin', false, 40),
  ('tannery', 'Mark complete when tanned, soft and dry', false, 50),
  ('storage', 'Check skin/cape is fully dry and free of odour', false, 10),
  ('storage', 'Confirm tag number matches job card', false, 20),
  ('storage', 'Store in designated rack or shelf', false, 30),
  ('storage', 'Mark complete when ready for collection or dispatch', false, 40),
  ('mounting', 'Select correct mannequin or form for species and size', false, 10),
  ('mounting', 'Fit and adjust skin on form — no wrinkles or gaps', false, 20),
  ('mounting', 'Set glass eyes — check expression matches reference photos', false, 30),
  ('mounting', 'Sew all seams tight and blend '||'into skin', false, 40),
  ('mounting', 'Position and secure on habitat base or plaque', false, 50),
  ('finishing', 'Paint nose leather, lips and gums to match reference', false, 10),
  ('finishing', 'Detail eye rims and surrounding skin', false, 20),
  ('finishing', 'Finish ear linings — paint and texture', false, 30),
  ('finishing', 'Complete habitat base or plaque finish', false, 40),
  ('finishing', 'Attach client nameplate if required', false, 50),
  ('quality_check', 'Check facial symmetry and overall proportion', false, 10),
  ('quality_check', 'Inspect all stitching — must be hidden and tight', false, 20),
  ('quality_check', 'Verify paint colour accuracy against reference photos', false, 30),
  ('quality_check', 'Confirm eye positioning and natural expression', false, 40),
  ('quality_check', 'Check base/habitat finish — no rough edges or gaps', false, 50),
  ('photos', 'Set up on clean, neutral background', false, 10),
  ('photos', 'Shoot front, left side, right side and three-quarter views', false, 20),
  ('photos', 'Capture close-up of face and detail work', false, 30),
  ('photos', 'Upload photos to the client file', false, 40),
  ('photos', 'Mark complete to advance to Administration', false, 50),
  ('dip_pack', 'Rehydrate salted skins in clean water — 30–60 min', false, 10),
  ('dip_pack', 'Mix dip solution to correct concentration (follow CITES requirements)', false, 20),
  ('dip_pack', 'Submerge skins fully — minimum 20 minutes', false, 30),
  ('dip_pack', 'Remove, drain and allow to air dry on mesh', false, 40),
  ('dip_pack', 'Label each skin with tag number and species', false, 50),
  ('dip_pack', 'Pack in export-grade containers with moisture packs', false, 60),
  ('packing', 'Wrap mount in acid-free tissue, then bubble wrap', false, 10),
  ('packing', 'Build a custom crate if required — no movement inside', false, 20),
  ('packing', 'Attach client label with delivery address and contact', false, 30),
  ('packing', 'Photograph packed crate before sealing', true, 40),
  ('packing', 'Mark complete when crate is sealed and ready for collection', false, 50),
  ('administration', 'Confirm client delivery address and contact details', false, 10),
  ('administration', 'Generate and send final invoice', false, 20),
  ('administration', 'Confirm payment received before releasing trophy', false, 30),
  ('administration', 'Book courier or arrange self-collection appointment', false, 40),
  ('administration', 'Mark complete when trophy has left the workshop', false, 50)
ON CONFLICT (dept_key, label) DO NOTHING;

-- 3. Staff actions ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._apex_staff_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM staff_profiles WHERE id = auth.uid() AND is_active
$$;

-- Worker opened the card (read receipt) — only counts for the person it is assigned to
CREATE OR REPLACE FUNCTION public.job_mark_opened(p_doc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public._apex_staff_role() IS NULL THEN RAISE EXCEPTION 'Staff only'; END IF;
  UPDATE hunt_documents SET opened_at = COALESCE(opened_at, now())
  WHERE id = p_doc AND doc_type = 'job_card' AND assigned_to = auth.uid();
END $$;

-- Worker started the task. An unassigned job is claimed by whoever starts it.
CREATE OR REPLACE FUNCTION public.job_mark_started(p_doc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_assignee uuid;
BEGIN
  IF public._apex_staff_role() IS NULL THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT assigned_to INTO v_assignee FROM hunt_documents WHERE id = p_doc AND doc_type = 'job_card';
  IF NOT FOUND THEN RAISE EXCEPTION 'Job card not found'; END IF;
  IF v_assignee IS NOT NULL AND v_assignee <> auth.uid() AND public._apex_staff_role() NOT IN ('admin','studio_manager') THEN
    RAISE EXCEPTION 'This job card is assigned to someone else';
  END IF;
  UPDATE hunt_documents SET
    started_at  = COALESCE(started_at, now()),
    started_by  = COALESCE(started_by, auth.uid()),
    opened_at   = COALESCE(opened_at, now()),
    assigned_to = COALESCE(assigned_to, auth.uid()),
    assigned_at = COALESCE(assigned_at, now())
  WHERE id = p_doc;
END $$;

-- Admin: assign / re-prioritise / set due date for one or many job cards
CREATE OR REPLACE FUNCTION public.job_assign(
  p_doc_ids uuid[], p_assignee uuid DEFAULT NULL, p_unassign boolean DEFAULT false,
  p_priority smallint DEFAULT NULL, p_due date DEFAULT NULL, p_clear_due boolean DEFAULT false,
  p_note text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF public._apex_staff_role() IS NULL OR public._apex_staff_role() NOT IN ('admin','studio_manager') THEN
    RAISE EXCEPTION 'Only admins can assign or prioritise jobs';
  END IF;
  UPDATE hunt_documents d SET
    assigned_to   = CASE WHEN p_unassign THEN NULL WHEN p_assignee IS NOT NULL THEN p_assignee ELSE d.assigned_to END,
    assigned_by   = CASE WHEN p_unassign THEN NULL WHEN p_assignee IS NOT NULL AND p_assignee IS DISTINCT FROM d.assigned_to THEN auth.uid() ELSE d.assigned_by END,
    assigned_at   = CASE WHEN p_unassign THEN NULL WHEN p_assignee IS NOT NULL AND p_assignee IS DISTINCT FROM d.assigned_to THEN now() ELSE d.assigned_at END,
    opened_at     = CASE WHEN p_unassign OR (p_assignee IS NOT NULL AND p_assignee IS DISTINCT FROM d.assigned_to) THEN NULL ELSE d.opened_at END,
    started_at    = CASE WHEN p_unassign OR (p_assignee IS NOT NULL AND p_assignee IS DISTINCT FROM d.assigned_to) THEN NULL ELSE d.started_at END,
    started_by    = CASE WHEN p_unassign OR (p_assignee IS NOT NULL AND p_assignee IS DISTINCT FROM d.assigned_to) THEN NULL ELSE d.started_by END,
    priority      = COALESCE(p_priority, d.priority),
    due_date      = CASE WHEN p_clear_due THEN NULL WHEN p_due IS NOT NULL THEN p_due ELSE d.due_date END,
    priority_note = COALESCE(p_note, d.priority_note)
  WHERE d.id = ANY(p_doc_ids) AND d.doc_type = 'job_card';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Worker ticks (or un-ticks) a checklist step on a job
CREATE OR REPLACE FUNCTION public.job_check_item(p_doc uuid, p_item uuid, p_done boolean, p_note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF public._apex_staff_role() IS NULL THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT full_name INTO v_name FROM staff_profiles WHERE id = auth.uid();
  INSERT INTO job_checklist_progress (job_doc_id, item_id, done, done_by, done_by_name, done_at, note)
  VALUES (p_doc, p_item, p_done, auth.uid(), v_name, now(), p_note)
  ON CONFLICT (job_doc_id, item_id) DO UPDATE
    SET done = EXCLUDED.done, done_by = EXCLUDED.done_by, done_by_name = EXCLUDED.done_by_name,
        done_at = EXCLUDED.done_at, note = COALESCE(EXCLUDED.note, job_checklist_progress.note);
  -- ticking the first step counts as starting the task
  IF p_done THEN
    UPDATE hunt_documents SET started_at = COALESCE(started_at, now()), started_by = COALESCE(started_by, auth.uid()),
           opened_at = COALESCE(opened_at, now()), assigned_to = COALESCE(assigned_to, auth.uid()), assigned_at = COALESCE(assigned_at, now())
    WHERE id = p_doc AND doc_type = 'job_card';
  END IF;
END $$;

-- Admin override: move a job on even though its checklist is incomplete (always leaves a note)
CREATE OR REPLACE FUNCTION public.job_force_advance(p_doc uuid, p_next text, p_status text, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF public._apex_staff_role() IS NULL OR public._apex_staff_role() NOT IN ('admin','studio_manager') THEN
    RAISE EXCEPTION 'Only admins can override the checklist';
  END IF;
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required to override the checklist'; END IF;
  SELECT full_name INTO v_name FROM staff_profiles WHERE id = auth.uid();
  PERFORM set_config('apex.override', 'on', true);
  UPDATE hunt_documents SET current_department = p_next, status = p_status,
         completion_notes = COALESCE(completion_notes || E'\n', '') || 'Checklist overridden by ' || coalesce(v_name,'admin') || ': ' || p_reason
  WHERE id = p_doc AND doc_type = 'job_card';
END $$;

-- 4. Enforce the protocol -------------------------------------------------------------------------
-- A job card can only leave a department once every active checklist step for that department
-- is ticked. Admins use job_force_advance (reason required). The SQL editor / service role is exempt.
CREATE OR REPLACE FUNCTION public._job_card_protocol() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_open integer; v_total integer;
BEGIN
  IF NEW.doc_type <> 'job_card' THEN RETURN NEW; END IF;
  IF NEW.current_department IS DISTINCT FROM OLD.current_department AND OLD.current_department IS NOT NULL THEN
    IF auth.uid() IS NOT NULL AND coalesce(current_setting('apex.override', true), '') <> 'on' THEN
      SELECT count(*) FILTER (WHERE NOT EXISTS (
               SELECT 1 FROM job_checklist_progress p WHERE p.job_doc_id = OLD.id AND p.item_id = i.id AND p.done)),
             count(*)
        INTO v_open, v_total
      FROM department_checklist_items i
      WHERE i.dept_key = OLD.current_department AND i.is_active;
      IF v_open > 0 THEN
        RAISE EXCEPTION 'Checklist incomplete: % of % steps still to be ticked. Tick them in My Tasks or the department station first.', v_open, v_total
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
    -- next department: fresh opened/started state, assignment returns to the department pool
    NEW.opened_at := NULL; NEW.started_at := NULL; NEW.started_by := NULL;
    NEW.assigned_to := NULL; NEW.assigned_at := NULL; NEW.assigned_by := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_job_card_protocol ON public.hunt_documents;
CREATE TRIGGER trg_job_card_protocol BEFORE UPDATE ON public.hunt_documents
  FOR EACH ROW EXECUTE FUNCTION public._job_card_protocol();

REVOKE ALL ON FUNCTION public.job_mark_opened(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_mark_started(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_assign(uuid[], uuid, boolean, smallint, date, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_check_item(uuid, uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_force_advance(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.job_mark_opened(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_mark_started(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_assign(uuid[], uuid, boolean, smallint, date, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_check_item(uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_force_advance(uuid, text, text, text) TO authenticated;


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


-- Migration 043: a complete, tamper-proof record of communication (run AFTER 041 and 042).
--
--  * Only department managers and admins can SEND messages (to staff or to clients). Workers can read what is addressed to them.
--  * Every message is kept: nobody can edit or delete it after it is sent.
--  * Admins can see everything (staff and client messages) in one log.
--  * Messages show who has read them (and who has acknowledged them).

-- 1. Who works where, and who manages what ---------------------------------------------------------
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS works_in            text[] NOT NULL DEFAULT '{}',   -- stage keys, e.g. {skinning,salting}
  ADD COLUMN IF NOT EXISTS manages_departments text[] NOT NULL DEFAULT '{}';   -- may message those departments

-- Starter values from the existing code: the leads of each department
UPDATE public.staff_profiles SET
  works_in = CASE lower(split_part(full_name, ' ', 1))
    WHEN 'vince'   THEN ARRAY['receiving','skinning','salting','cleaning_bleach','storage','dip_pack']
    WHEN 'divine'  THEN ARRAY['tannery']
    WHEN 'emanuel' THEN ARRAY['mounting']
    WHEN 'kyle'    THEN ARRAY['mounting','finishing']
    ELSE works_in END,
  manages_departments = CASE lower(split_part(full_name, ' ', 1))
    WHEN 'vince'   THEN ARRAY['receiving','skinning','salting','cleaning_bleach','storage','dip_pack']
    WHEN 'divine'  THEN ARRAY['tannery']
    WHEN 'emanuel' THEN ARRAY['mounting']
    WHEN 'kyle'    THEN ARRAY['mounting','finishing']
    ELSE manages_departments END
WHERE works_in = '{}';

CREATE OR REPLACE FUNCTION public._apex_is_manager() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM staff_profiles
                 WHERE id = auth.uid() AND is_active
                   AND (role IN ('admin','studio_manager') OR cardinality(manages_departments) > 0))
$$;
CREATE OR REPLACE FUNCTION public._apex_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active AND role IN ('admin','studio_manager'))
$$;

-- Client conversations: managers, admins and the bookkeeper (who handles deposits and payments with clients)
CREATE OR REPLACE FUNCTION public._apex_can_message_clients() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public._apex_is_manager()
      OR EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active AND role = 'bookkeeper')
$$;

-- 2. Staff messages ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid UNIQUE,                       -- repeats of the same send are ignored
  sender_id      uuid NOT NULL REFERENCES public.staff_profiles(id),
  sender_name    text,
  recipient_kind text NOT NULL CHECK (recipient_kind IN ('user','department','everyone')),
  recipient_user uuid REFERENCES public.staff_profiles(id),
  recipient_dept text,
  subject        text,
  body           text NOT NULL CHECK (length(trim(body)) > 0),
  priority       smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 4),
  requires_ack   boolean NOT NULL DEFAULT false,
  hunt_doc_id    uuid REFERENCES public.hunt_documents(id) ON DELETE SET NULL,
  hunt_id        uuid REFERENCES public.client_hunts(id) ON DELETE SET NULL,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK ((recipient_kind = 'user' AND recipient_user IS NOT NULL) OR (recipient_kind = 'department' AND recipient_dept IS NOT NULL) OR recipient_kind = 'everyone')
);
CREATE INDEX IF NOT EXISTS idx_staff_messages_sent ON public.staff_messages (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_messages_user ON public.staff_messages (recipient_user);
CREATE INDEX IF NOT EXISTS idx_staff_messages_doc  ON public.staff_messages (hunt_doc_id);

CREATE TABLE IF NOT EXISTS public.staff_message_reads (
  message_id   uuid NOT NULL REFERENCES public.staff_messages(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  read_at      timestamptz NOT NULL DEFAULT now(),
  acknowledged boolean NOT NULL DEFAULT false,
  PRIMARY KEY (message_id, user_id)
);

-- Can this person see this message?
CREATE OR REPLACE FUNCTION public._apex_message_visible(m public.staff_messages, uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles p
    WHERE p.id = uid AND p.is_active AND (
      p.role IN ('admin','studio_manager')
      OR m.sender_id = uid
      OR m.recipient_kind = 'everyone'
      OR (m.recipient_kind = 'user' AND m.recipient_user = uid)
      OR (m.recipient_kind = 'department' AND (m.recipient_dept = ANY (p.works_in) OR m.recipient_dept = ANY (p.manages_departments)))
    )
  )
$$;

ALTER TABLE public.staff_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "See my staff messages" ON public.staff_messages;
CREATE POLICY "See my staff messages" ON public.staff_messages FOR SELECT USING (public._apex_message_visible(staff_messages, auth.uid()));
-- no INSERT / UPDATE / DELETE policies: messages are written only through send_staff_message() and can never be changed

DROP POLICY IF EXISTS "See read receipts" ON public.staff_message_reads;
CREATE POLICY "See read receipts" ON public.staff_message_reads FOR SELECT USING (
  user_id = auth.uid() OR public._apex_is_admin()
  OR EXISTS (SELECT 1 FROM staff_messages m WHERE m.id = message_id AND m.sender_id = auth.uid())
);
GRANT SELECT ON public.staff_messages, public.staff_message_reads TO authenticated;

CREATE OR REPLACE FUNCTION public.send_staff_message(
  p_kind text, p_user uuid, p_dept text, p_subject text, p_body text,
  p_priority smallint DEFAULT 3, p_doc uuid DEFAULT NULL, p_hunt uuid DEFAULT NULL, p_ack boolean DEFAULT false,
  p_at timestamptz DEFAULT NULL, p_request_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me staff_profiles; v_id uuid; t timestamptz := GREATEST(LEAST(COALESCE(p_at, now()), now()), now() - interval '14 days');
        target staff_profiles; v_hunt uuid := p_hunt;
BEGIN
  SELECT * INTO me FROM staff_profiles WHERE id = auth.uid() AND is_active;
  IF NOT FOUND OR NOT public._apex_is_manager() THEN
    RAISE EXCEPTION 'Only department managers and admins can send messages';
  END IF;
  IF p_kind NOT IN ('user','department','everyone') THEN RAISE EXCEPTION 'Unknown recipient type'; END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN RAISE EXCEPTION 'The message is empty'; END IF;

  IF me.role NOT IN ('admin','studio_manager') THEN
    IF p_kind = 'everyone' THEN RAISE EXCEPTION 'Only admins can message everyone'; END IF;
    IF p_kind = 'department' AND NOT (p_dept = ANY (me.manages_departments)) THEN
      RAISE EXCEPTION 'You can only message the departments you manage';
    END IF;
    IF p_kind = 'user' THEN
      SELECT * INTO target FROM staff_profiles WHERE id = p_user AND is_active;
      IF NOT FOUND THEN RAISE EXCEPTION 'That person was not found'; END IF;
      IF target.role NOT IN ('admin','studio_manager') AND NOT (target.works_in && me.manages_departments) THEN
        RAISE EXCEPTION 'You can message admins and people in the departments you manage';
      END IF;
    END IF;
  END IF;

  IF p_doc IS NOT NULL AND v_hunt IS NULL THEN SELECT hunt_id INTO v_hunt FROM hunt_documents WHERE id = p_doc; END IF;

  INSERT INTO staff_messages (request_id, sender_id, sender_name, recipient_kind, recipient_user, recipient_dept, subject, body,
                              priority, requires_ack, hunt_doc_id, hunt_id, sent_at)
  VALUES (p_request_id, me.id, me.full_name, p_kind, CASE WHEN p_kind = 'user' THEN p_user END, CASE WHEN p_kind = 'department' THEN p_dept END,
          NULLIF(trim(p_subject), ''), trim(p_body), COALESCE(p_priority, 3), COALESCE(p_ack, false), p_doc, v_hunt, t)
  ON CONFLICT (request_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN SELECT id INTO v_id FROM staff_messages WHERE request_id = p_request_id; END IF;
  RETURN v_id;
END $$;

-- A recipient marks messages as read (and optionally acknowledged)
CREATE OR REPLACE FUNCTION public.staff_message_mark_read(p_ids uuid[], p_ack boolean DEFAULT false) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active) THEN RAISE EXCEPTION 'Staff only'; END IF;
  INSERT INTO staff_message_reads (message_id, user_id, acknowledged)
  SELECT m.id, auth.uid(), COALESCE(p_ack, false) FROM staff_messages m
  WHERE m.id = ANY (p_ids) AND public._apex_message_visible(m, auth.uid()) AND m.sender_id <> auth.uid()
  ON CONFLICT (message_id, user_id) DO UPDATE SET acknowledged = staff_message_reads.acknowledged OR EXCLUDED.acknowledged;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.send_staff_message(text, uuid, text, text, text, smallint, uuid, uuid, boolean, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_message_mark_read(uuid[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_staff_message(text, uuid, text, text, text, smallint, uuid, uuid, boolean, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_message_mark_read(uuid[], boolean) TO authenticated;

-- 3. Client messages: managers, admins and the bookkeeper only, and a permanent record ------------------------------------------
DROP POLICY IF EXISTS "staff_all_messages" ON public.client_messages;

DROP POLICY IF EXISTS "managers_read_client_messages" ON public.client_messages;
CREATE POLICY "managers_read_client_messages" ON public.client_messages FOR SELECT USING (public._apex_can_message_clients());

DROP POLICY IF EXISTS "managers_send_client_messages" ON public.client_messages;
CREATE POLICY "managers_send_client_messages" ON public.client_messages FOR INSERT
  WITH CHECK (public._apex_can_message_clients() AND direction = 'outbound' AND sent_by = auth.uid());

DROP POLICY IF EXISTS "managers_update_client_messages" ON public.client_messages;
CREATE POLICY "managers_update_client_messages" ON public.client_messages FOR UPDATE
  USING (public._apex_can_message_clients()) WITH CHECK (public._apex_can_message_clients());
-- no DELETE policy: client messages are never deleted

-- Once sent, the content can never change (only read / delivery status may)
CREATE OR REPLACE FUNCTION public._client_message_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
       NEW.body IS DISTINCT FROM OLD.body OR NEW.subject IS DISTINCT FROM OLD.subject OR NEW.html_body IS DISTINCT FROM OLD.html_body
    OR NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.direction IS DISTINCT FROM OLD.direction
    OR NEW.sent_by IS DISTINCT FROM OLD.sent_by OR NEW.sent_at IS DISTINCT FROM OLD.sent_at) THEN
    RAISE EXCEPTION 'A sent message cannot be changed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_client_message_immutable ON public.client_messages;
CREATE TRIGGER trg_client_message_immutable BEFORE UPDATE ON public.client_messages
  FOR EACH ROW EXECUTE FUNCTION public._client_message_immutable();

-- 4. One log of everything, for admins ------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_communication_log WITH (security_invoker = true) AS
SELECT 'staff'::text AS kind, m.id, m.sent_at, m.sender_name AS from_name,
       CASE m.recipient_kind
         WHEN 'user' THEN (SELECT full_name FROM staff_profiles WHERE id = m.recipient_user)
         WHEN 'department' THEN 'Department: ' || m.recipient_dept
         ELSE 'Everyone' END AS to_name,
       m.subject, m.body, m.priority, m.hunt_id, m.hunt_doc_id, NULL::uuid AS client_id,
       (SELECT count(*) FROM staff_message_reads r WHERE r.message_id = m.id)::int AS read_count,
       m.requires_ack
FROM staff_messages m
UNION ALL
SELECT 'client'::text, c.id, COALESCE(c.sent_at, c.created_at),
       CASE WHEN c.direction = 'outbound' THEN COALESCE((SELECT full_name FROM staff_profiles WHERE id = c.sent_by), 'Staff')
            ELSE COALESCE((SELECT full_name FROM clients WHERE id = c.client_id), c.from_email, 'Client') END,
       CASE WHEN c.direction = 'outbound' THEN COALESCE((SELECT full_name FROM clients WHERE id = c.client_id), 'Client') ELSE 'Apex' END,
       c.subject, c.body, 3::smallint, c.hunt_id, NULL::uuid, c.client_id,
       (c.read_at IS NOT NULL)::int, false
FROM client_messages c;
GRANT SELECT ON public.v_communication_log TO authenticated;
