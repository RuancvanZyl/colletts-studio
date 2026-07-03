-- Migration 019: Pipeline tracking — stall detection, process type, photo requirements

-- 1. Add last_moved_at to hunt_documents (timestamp of last department change)
ALTER TABLE hunt_documents
  ADD COLUMN IF NOT EXISTS last_moved_at  timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS process_type   text DEFAULT 'taxidermy'
    CHECK (process_type IN ('taxidermy','dip_pack','pre_tan','skulls')),
  ADD COLUMN IF NOT EXISTS completion_photo_paths  text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS completion_notes        text,
  ADD COLUMN IF NOT EXISTS completed_by_name       text,
  ADD COLUMN IF NOT EXISTS stall_alerted_at        timestamptz;

-- 2. Backfill last_moved_at from updated_at where it exists
UPDATE hunt_documents SET last_moved_at = updated_at WHERE last_moved_at IS NULL AND updated_at IS NOT NULL;

-- 3. Index for stall queries (finding jobs that haven't moved)
CREATE INDEX IF NOT EXISTS idx_hunt_docs_moved ON hunt_documents(current_department, last_moved_at)
  WHERE status != 'complete';

-- 4. Add process_type to client_hunts so we know at the hunt level
ALTER TABLE client_hunts
  ADD COLUMN IF NOT EXISTS process_type text DEFAULT 'taxidermy';

-- 5. Stage history stored inside form_data JSONB is fine for now.
--    Add a separate stage_history table for better querying.
CREATE TABLE IF NOT EXISTS trophy_stage_history (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hunt_doc_id     uuid REFERENCES hunt_documents(id) ON DELETE CASCADE,
  department      text NOT NULL,
  completed_by    uuid REFERENCES staff_profiles(id),
  completed_by_name text,
  photo_paths     text[] DEFAULT '{}',
  notes           text,
  completed_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_doc ON trophy_stage_history(hunt_doc_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_dept ON trophy_stage_history(department, completed_at);

-- RLS
ALTER TABLE trophy_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read stage history"
  ON trophy_stage_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "Staff insert stage history"
  ON trophy_stage_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

-- 6. Alerts table — stalled trophies, client checkpoints, etc.
CREATE TABLE IF NOT EXISTS workshop_alerts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type      text NOT NULL CHECK (alert_type IN ('stalled','missing_trophy','payment_due','client_checkpoint','dept_overdue')),
  severity        text NOT NULL DEFAULT 'yellow' CHECK (severity IN ('red','yellow','green')),
  hunt_doc_id     uuid REFERENCES hunt_documents(id) ON DELETE CASCADE,
  hunt_id         uuid REFERENCES client_hunts(id) ON DELETE CASCADE,
  title           text NOT NULL,
  body            text,
  target_dept     text,
  resolved        boolean DEFAULT false,
  resolved_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_dept       ON workshop_alerts(target_dept, resolved, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_hunt_doc   ON workshop_alerts(hunt_doc_id);

ALTER TABLE workshop_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read alerts"
  ON workshop_alerts FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "Staff update alerts"
  ON workshop_alerts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "Staff insert alerts"
  ON workshop_alerts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

-- 7. Function: scan for stalled trophies and insert alerts
CREATE OR REPLACE FUNCTION generate_stall_alerts()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  stall_thresholds CONSTANT jsonb := '{
    "receiving": 24, "skinning": 48, "salting": 72,
    "cleaning_bleach": 96, "dip_pack": 48, "tannery": 336,
    "storage": 720, "mounting": 168, "finishing": 96,
    "quality_check": 24, "photos": 24, "packing": 48,
    "administration": 72
  }';
  rec RECORD;
  threshold_hours integer;
  hours_stalled   numeric;
  sev text;
  cnt integer := 0;
BEGIN
  FOR rec IN
    SELECT d.id, d.title, d.current_department, d.last_moved_at, d.hunt_id,
           h.client_id
    FROM hunt_documents d
    JOIN client_hunts h ON h.id = d.hunt_id
    WHERE d.status NOT IN ('complete','cancelled')
      AND d.last_moved_at IS NOT NULL
  LOOP
    threshold_hours := (stall_thresholds ->> rec.current_department)::integer;
    IF threshold_hours IS NULL THEN CONTINUE; END IF;

    hours_stalled := EXTRACT(EPOCH FROM (now() - rec.last_moved_at)) / 3600;
    IF hours_stalled < threshold_hours THEN CONTINUE; END IF;

    -- Severity: >2x threshold = red, else yellow
    sev := CASE WHEN hours_stalled > threshold_hours * 2 THEN 'red' ELSE 'yellow' END;

    -- Only insert if no unresolved alert for this doc already
    IF NOT EXISTS (
      SELECT 1 FROM workshop_alerts
      WHERE hunt_doc_id = rec.id AND alert_type = 'stalled' AND resolved = false
    ) THEN
      INSERT INTO workshop_alerts (alert_type, severity, hunt_doc_id, hunt_id, title, body, target_dept)
      VALUES (
        'stalled', sev, rec.id, rec.hunt_id,
        'Trophy stalled: ' || rec.title,
        'Has not moved from ' || rec.current_department || ' for ' || round(hours_stalled) || ' hours.',
        rec.current_department
      );
      cnt := cnt + 1;
    END IF;
  END LOOP;
  RETURN cnt;
END;
$$;

-- 8. Trigger: update last_moved_at when current_department changes
CREATE OR REPLACE FUNCTION update_last_moved_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_department IS DISTINCT FROM OLD.current_department THEN
    NEW.last_moved_at := now();
    -- Auto-resolve any stall alerts for this doc
    UPDATE workshop_alerts
    SET resolved = true, resolved_at = now()
    WHERE hunt_doc_id = NEW.id AND alert_type = 'stalled' AND resolved = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_last_moved_at ON hunt_documents;
CREATE TRIGGER trg_last_moved_at
  BEFORE UPDATE ON hunt_documents
  FOR EACH ROW EXECUTE FUNCTION update_last_moved_at();
