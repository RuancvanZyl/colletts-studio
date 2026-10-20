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
