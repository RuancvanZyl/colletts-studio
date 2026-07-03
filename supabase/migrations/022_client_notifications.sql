-- Migration 022: In-app client notifications
-- Fired when trophies advance through checkpoint pipeline stages.

CREATE TABLE IF NOT EXISTS client_notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  hunt_doc_id   uuid REFERENCES hunt_documents(id) ON DELETE CASCADE,
  hunt_id       uuid REFERENCES client_hunts(id) ON DELETE CASCADE,
  type          text NOT NULL DEFAULT 'update'
                  CHECK (type IN ('update','milestone','alert','ready')),
  stage         text,
  title         text NOT NULL,
  body          text,
  species       text,
  mount_type    text,
  read          boolean NOT NULL DEFAULT false,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notifs_client  ON client_notifications(client_id, created_at DESC);
CREATE INDEX idx_client_notifs_unread  ON client_notifications(client_id) WHERE read = false;

ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Staff can insert notifications
CREATE POLICY "staff_insert_notifs" ON client_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
  );

-- Staff can read all notifications
CREATE POLICY "staff_read_notifs" ON client_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
  );

-- Staff can update (mark read) notifications
CREATE POLICY "staff_update_notifs" ON client_notifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
  );
