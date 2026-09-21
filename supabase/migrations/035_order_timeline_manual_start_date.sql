-- Migration 035: Allow a manual, backfilled start date for order timelines
--
-- The `invoices` table is empty — no deposit/payment data has ever been
-- recorded in the system, it has all lived outside it (Dropbox, paperwork,
-- memory). Rather than guess a start date from file timestamps, management
-- enters the real deposit-paid date by hand when starting a hunt's timeline.

CREATE OR REPLACE FUNCTION public._apply_order_timeline(
  p_hunt_id     uuid,
  p_via         text,
  p_started_by  uuid,
  p_start_at    timestamptz DEFAULT NULL   -- NULL = now() (live start); a past date = backfill
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mount_types    text[];
  v_full_count     int;
  v_shoulder_count int;
  v_total          int;
  v_size           text;
  v_start          timestamptz := COALESCE(p_start_at, now());
  v_m1 date; v_m2 date; v_m3 date; v_m4 date;
  v_milestones     jsonb;
  v_deadline       date;
  v_rows_updated   int;
BEGIN
  IF v_start > now() THEN
    RAISE EXCEPTION 'The timeline start date cannot be in the future';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM client_hunts WHERE id = p_hunt_id) THEN
    RAISE EXCEPTION 'Hunt % not found', p_hunt_id;
  END IF;

  IF EXISTS (SELECT 1 FROM client_hunts WHERE id = p_hunt_id AND timeline_started_at IS NOT NULL) THEN
    RAISE EXCEPTION 'This hunt''s timeline has already started. Use amend_order_deadline to change the deadline instead.';
  END IF;

  SELECT array_agg(form_data->>'mount_type') INTO v_mount_types
  FROM hunt_documents
  WHERE hunt_id = p_hunt_id AND doc_type = 'job_card';

  v_total := COALESCE(array_length(v_mount_types, 1), 0);
  SELECT count(*) INTO v_full_count
    FROM unnest(v_mount_types) m WHERE m IN ('Full Mount','Pedestal Mount','Life Cast','Rug Mount on Felt');
  SELECT count(*) INTO v_shoulder_count
    FROM unnest(v_mount_types) m WHERE m IN ('Shoulder Mount','Offset Shoulder Mount','Half Mount');

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
    order_size           = v_size,
    timeline_started_at  = v_start,
    timeline_started_by  = p_started_by,
    timeline_started_via = p_via,
    deadline_original    = v_deadline,
    deadline_current      = v_deadline,
    milestones            = v_milestones
  WHERE id = p_hunt_id;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Failed to update hunt %', p_hunt_id;
  END IF;

  RETURN jsonb_build_object('order_size', v_size, 'deadline', v_deadline, 'milestones', v_milestones);
END;
$$;

REVOKE ALL ON FUNCTION public._apply_order_timeline(uuid, text, uuid, timestamptz) FROM PUBLIC;

-- Cash entry point now accepts an optional backfill date — management only.
-- NULL (the default) means "start right now"; a past date backfills history.
CREATE OR REPLACE FUNCTION public.start_order_timeline(
  p_hunt_id  uuid,
  p_start_at timestamptz DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM staff_profiles WHERE id = auth.uid() AND is_active;
  IF v_role IS NULL OR v_role NOT IN ('admin','studio_manager') THEN
    RAISE EXCEPTION 'Only management can start an order timeline';
  END IF;

  RETURN public._apply_order_timeline(p_hunt_id, 'cash_manual', auth.uid(), p_start_at);
END;
$$;

REVOKE ALL ON FUNCTION public.start_order_timeline(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_order_timeline(uuid, timestamptz) TO authenticated;

-- Drop the old single-argument signature — replaced by the one above.
DROP FUNCTION IF EXISTS public.start_order_timeline(uuid);
