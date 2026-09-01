-- Migration 033: Automatic client journey updates
--
-- Whenever a trophy moves to a new department, the hunter is told — automatically,
-- in plain language, from wherever in the app the move happened. Staff can never
-- forget to keep a client informed because nobody has to remember.

-- ── Friendly, hunter-facing copy for each stage ──────────────────────────────
CREATE OR REPLACE FUNCTION public.client_stage_message(p_dept text, p_species text)
RETURNS TABLE (title text, body text) LANGUAGE sql IMMUTABLE AS $$
  SELECT t.title, t.body FROM (VALUES
    ('receiving',       'Your ' || COALESCE(p_species,'trophy') || ' has arrived',
                        'Good news — your trophy has arrived safely at our workshop and has been logged, tagged and photographed. We will keep you posted as it moves through each stage.'),
    ('skinning',        'Skinning has started',
                        'Our team has begun carefully skinning your ' || COALESCE(p_species,'trophy') || '. This is delicate work around the face and ears, and it sets up the quality of the finished mount.'),
    ('salting',         'Your cape is being salted',
                        'The skin is now being salted and cured. This preserves it properly and prepares it for tanning.'),
    ('cleaning_bleach', 'Cleaning and bleaching underway',
                        'Your skull and horns are being cleaned and bleached to a bright, even finish.'),
    ('tannery',         'At the tannery',
                        'Your skin is now at the tannery. This is the longest stage of the process — usually a few weeks — and it is what makes the hide soft, durable and ready to mount.'),
    ('dip_pack',        'Being dipped and packed',
                        'Your trophy is being treated and packed ready for shipping.'),
    ('storage',         'Safely in storage',
                        'Your trophy is stored securely with us while it waits for the next stage.'),
    ('mounting',        'Mounting has begun',
                        'This is the exciting part — your ' || COALESCE(p_species,'trophy') || ' is being mounted onto its form. The pose and expression come to life at this stage.'),
    ('finishing',       'Finishing touches',
                        'Our finishing artist is now working on the fine detail — eyes, nose, colour and texture. This is what makes a mount look truly alive.'),
    ('quality_check',   'Final quality inspection',
                        'Your trophy is going through our final quality inspection before we sign it off.'),
    ('photos',          'Photographs being taken',
                        'We are photographing your finished trophy. You will receive the pictures shortly.'),
    ('packing',         'Being packed for you',
                        'Your finished trophy is being carefully crated and packed, ready to make its way to you.'),
    ('administration',  'Final paperwork',
                        'We are completing the final paperwork and arranging dispatch. Nearly there.')
  ) AS t(dept, title, body)
  WHERE t.dept = p_dept;
$$;

-- ── Trigger: notify the client whenever their trophy changes department ──────
CREATE OR REPLACE FUNCTION public.notify_client_of_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_client_id uuid;
  v_species   text;
  v_mount     text;
  v_title     text;
  v_body      text;
BEGIN
  -- Only job cards, and only when the department actually changed
  IF NEW.doc_type <> 'job_card' THEN RETURN NEW; END IF;
  IF NEW.current_department IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.current_department IS NOT DISTINCT FROM OLD.current_department THEN
    RETURN NEW;
  END IF;

  SELECT ch.client_id INTO v_client_id
  FROM client_hunts ch WHERE ch.id = NEW.hunt_id;
  IF v_client_id IS NULL THEN RETURN NEW; END IF;

  v_species := NEW.form_data->>'species';
  v_mount   := NEW.form_data->>'mount_type';

  SELECT m.title, m.body INTO v_title, v_body
  FROM public.client_stage_message(NEW.current_department, v_species) m;

  -- Unknown stage — skip rather than send something confusing
  IF v_title IS NULL THEN RETURN NEW; END IF;

  INSERT INTO client_notifications
    (client_id, hunt_doc_id, hunt_id, type, stage, title, body, species, mount_type)
  VALUES
    (v_client_id, NEW.id, NEW.hunt_id, 'milestone', NEW.current_department,
     v_title, v_body, v_species, v_mount);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_stage ON hunt_documents;
CREATE TRIGGER trg_notify_client_stage
  AFTER INSERT OR UPDATE OF current_department ON hunt_documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_of_stage_change();

-- ── Let hunters read their own notifications ─────────────────────────────────
DROP POLICY IF EXISTS "hunter_read_own_notifs" ON client_notifications;
CREATE POLICY "hunter_read_own_notifs" ON client_notifications
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "hunter_update_own_notifs" ON client_notifications;
CREATE POLICY "hunter_update_own_notifs" ON client_notifications
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
