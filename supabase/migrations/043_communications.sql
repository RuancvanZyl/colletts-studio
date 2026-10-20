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
