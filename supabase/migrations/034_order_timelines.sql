-- Migration 034: Order timelines — deposit-triggered production milestones
--
-- The production clock starts when the deposit is confirmed. That can happen
-- two ways:
--   1. Automatically via a Xero payment webhook (not yet connected — see
--      supabase/functions/xero-payment-webhook once Xero credentials exist)
--   2. Manually by management, for cash payments — via start_order_timeline()
--
-- Order size (small/medium/large) is classified from the hunt's mount types
-- and determines the milestone schedule. Only admin/studio_manager can amend
-- a deadline once set, and a reason is required every time.

ALTER TABLE client_hunts
  ADD COLUMN IF NOT EXISTS order_size            text CHECK (order_size IN ('small','medium','large')),
  ADD COLUMN IF NOT EXISTS timeline_started_at    timestamptz,
  ADD COLUMN IF NOT EXISTS timeline_started_by    uuid REFERENCES staff_profiles(id),
  ADD COLUMN IF NOT EXISTS timeline_started_via   text CHECK (timeline_started_via IN ('xero','cash_manual')),
  ADD COLUMN IF NOT EXISTS deadline_original      date,
  ADD COLUMN IF NOT EXISTS deadline_current       date,
  ADD COLUMN IF NOT EXISTS milestones             jsonb,
  ADD COLUMN IF NOT EXISTS deadline_amendments    jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN client_hunts.deadline_amendments IS
  'Array of {amended_at, amended_by, previous_deadline, new_deadline, reason}';

-- ── Start the production clock for a hunt ────────────────────────────────────
-- Classifies order size from the hunt's job cards' mount types, sets the
-- timeline start date, and computes the milestone schedule + deadline.
CREATE OR REPLACE FUNCTION public.start_order_timeline(
  p_hunt_id uuid,
  p_via     text DEFAULT 'cash_manual'  -- 'xero' | 'cash_manual'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role          text;
  v_mount_types   text[];
  v_full_count    int;
  v_shoulder_count int;
  v_total         int;
  v_size          text;
  v_start         timestamptz := now();
  v_m1 date; v_m2 date; v_m3 date; v_m4 date;
  v_milestones    jsonb;
  v_deadline      date;
BEGIN
  -- Only staff (any active) can trigger this — the Xero webhook runs as
  -- service role, cash-manual is called from the app by a logged-in user.
  IF p_via = 'cash_manual' THEN
    SELECT role INTO v_role FROM staff_profiles WHERE id = auth.uid() AND is_active;
    IF v_role IS NULL OR v_role NOT IN ('admin','studio_manager') THEN
      RAISE EXCEPTION 'Only management can start an order timeline';
    END IF;
  END IF;

  -- Gather mount types for every job card on this hunt
  SELECT array_agg(form_data->>'mount_type') INTO v_mount_types
  FROM hunt_documents
  WHERE hunt_id = p_hunt_id AND doc_type = 'job_card';

  v_total := COALESCE(array_length(v_mount_types, 1), 0);
  SELECT count(*) INTO v_full_count
    FROM unnest(v_mount_types) m WHERE m IN ('Full Mount','Pedestal Mount','Life Cast','Rug Mount on Felt');
  SELECT count(*) INTO v_shoulder_count
    FROM unnest(v_mount_types) m WHERE m IN ('Shoulder Mount','Offset Shoulder Mount','Half Mount');

  -- Classification — mirrors src/lib/orderTimeline.ts classifyOrderSize()
  IF v_full_count >= 4 OR v_shoulder_count >= 6 OR (v_total > 5 AND (v_full_count > 0 OR v_shoulder_count > 0)) THEN
    v_size := 'large';
  ELSIF v_full_count >= 1 OR v_shoulder_count >= 2 THEN
    v_size := 'medium';
  ELSE
    v_size := 'small';
  END IF;

  v_m1 := (v_start + interval '90 days')::date;
  v_m2 := (v_start + interval '150 days')::date;

  IF v_size = 'small' THEN
    v_m3 := (v_start + interval '180 days')::date;
    v_deadline := v_m3;
    v_milestones := jsonb_build_array(
      jsonb_build_object('key','m1','label','Milestone 1 — Skin & Skull Prep','due_date',v_m1,'completed',false),
      jsonb_build_object('key','m2','label','Milestone 2 — Tannery','due_date',v_m2,'completed',false),
      jsonb_build_object('key','m3','label','Milestone 3 — Completion','due_date',v_m3,'completed',false)
    );
  ELSIF v_size = 'medium' THEN
    v_m3 := (v_start + interval '270 days')::date;
    v_deadline := v_m3;
    v_milestones := jsonb_build_array(
      jsonb_build_object('key','m1','label','Milestone 1 — Skin & Skull Prep','due_date',v_m1,'completed',false),
      jsonb_build_object('key','m2','label','Milestone 2 — Tannery','due_date',v_m2,'completed',false),
      jsonb_build_object('key','m3','label','Milestone 3 — Completion','due_date',v_m3,'completed',false)
    );
  ELSE
    v_m3 := (v_start + interval '365 days')::date;
    v_m4 := (v_start + interval '425 days')::date;
    v_deadline := v_m4;
    v_milestones := jsonb_build_array(
      jsonb_build_object('key','m1','label','Milestone 1 — Skin & Skull Prep','due_date',v_m1,'completed',false),
      jsonb_build_object('key','m2','label','Milestone 2 — Tannery','due_date',v_m2,'completed',false),
      jsonb_build_object('key','m3','label','Milestone 3 — Production Complete','due_date',v_m3,'completed',false),
      jsonb_build_object('key','m4','label','Milestone 4 — Dispatch & Clearing','due_date',v_m4,'completed',false)
    );
  END IF;

  UPDATE client_hunts SET
    order_size          = v_size,
    timeline_started_at = v_start,
    timeline_started_by = auth.uid(),
    timeline_started_via = p_via,
    deadline_original   = v_deadline,
    deadline_current    = v_deadline,
    milestones          = v_milestones
  WHERE id = p_hunt_id;

  RETURN jsonb_build_object('order_size', v_size, 'deadline', v_deadline, 'milestones', v_milestones);
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_order_timeline(uuid, text) TO authenticated;

-- ── Amend a deadline — management only, reason required ──────────────────────
CREATE OR REPLACE FUNCTION public.amend_order_deadline(
  p_hunt_id  uuid,
  p_new_date date,
  p_reason   text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role  text;
  v_prev  date;
  v_entry jsonb;
BEGIN
  SELECT role INTO v_role FROM staff_profiles WHERE id = auth.uid() AND is_active;
  IF v_role IS NULL OR v_role NOT IN ('admin','studio_manager') THEN
    RAISE EXCEPTION 'Only management can amend an order deadline';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A reason is required to amend a deadline';
  END IF;

  SELECT deadline_current INTO v_prev FROM client_hunts WHERE id = p_hunt_id;

  v_entry := jsonb_build_object(
    'amended_at', now(),
    'amended_by', auth.uid(),
    'previous_deadline', v_prev,
    'new_deadline', p_new_date,
    'reason', p_reason
  );

  UPDATE client_hunts SET
    deadline_current   = p_new_date,
    deadline_amendments = deadline_amendments || jsonb_build_array(v_entry)
  WHERE id = p_hunt_id;

  RETURN v_entry;
END;
$$;

GRANT EXECUTE ON FUNCTION public.amend_order_deadline(uuid, date, text) TO authenticated;
