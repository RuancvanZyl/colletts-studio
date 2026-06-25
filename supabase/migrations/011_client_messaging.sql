-- Migration 011: Client messaging + notification system
-- Run in Supabase SQL Editor → New query → Run without RLS

-- ── Message threads per client ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  hunt_id         uuid REFERENCES client_hunts(id) ON DELETE SET NULL,

  -- Direction
  direction       text NOT NULL CHECK (direction IN ('outbound','inbound')),
  -- Channel
  channel         text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','in_app','whatsapp','sms')),

  subject         text,
  body            text NOT NULL,
  html_body       text,

  -- Outbound: who sent it
  sent_by         uuid REFERENCES staff_profiles(id),
  -- Inbound: email address it came from
  from_email      text,

  -- Email threading
  email_thread_id text,
  email_message_id text,

  -- Status
  status          text DEFAULT 'sent' CHECK (status IN ('draft','sent','delivered','read','failed')),
  read_at         timestamptz,
  sent_at         timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_client   ON client_messages(client_id, sent_at DESC);
CREATE INDEX idx_messages_hunt     ON client_messages(hunt_id);
CREATE INDEX idx_messages_thread   ON client_messages(email_thread_id);
CREATE INDEX idx_messages_channel  ON client_messages(channel, direction);

-- ── Message templates ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text NOT NULL CHECK (category IN ('deposit','status_update','completion','shipping','general','document_request')),
  subject     text NOT NULL,
  body        text NOT NULL,
  html_body   text,
  variables   text[],      -- e.g. {client_name}, {ref_number}, {amount}
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE client_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_messages" ON client_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "staff_all_templates" ON message_templates
  FOR ALL USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

-- Hunters can see messages sent to them
CREATE POLICY "hunter_own_messages" ON client_messages
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- ── Default message templates ─────────────────────────────────────────────────
INSERT INTO message_templates (name, category, subject, body, variables) VALUES

('Deposit Request',
 'deposit',
 'Deposit Required — {ref_number} | Apex Trophy Solutions',
 'Dear {client_name},

Thank you for trusting Apex Trophy Solutions with your trophies from your hunt.

To begin work on your trophies, we require a deposit of {deposit_amount} before production can start.

Reference Number: {ref_number}
Trophies: {species_list}

Please make payment to:
Bank: [BANK DETAILS]
Reference: {ref_number}

Once your deposit is received, we will begin processing your trophies immediately and keep you updated on progress.

If you have any questions, please reply to this email or contact us directly.

Warm regards,
The Apex Trophy Solutions Team',
 ARRAY['{client_name}','{ref_number}','{deposit_amount}','{species_list}']),

('Trophy Received Confirmation',
 'status_update',
 'Trophies Received — {ref_number} | Apex Trophy Solutions',
 'Dear {client_name},

We are pleased to confirm that we have received your trophies safely at Apex Trophy Solutions.

Reference Number: {ref_number}
Date Received: {date_received}
Trophies Received: {species_list}

Your trophies are now being assessed and we will begin the mounting/tanning process as soon as your deposit is confirmed.

We will keep you updated at every stage of the process.

Warm regards,
The Apex Trophy Solutions Team',
 ARRAY['{client_name}','{ref_number}','{date_received}','{species_list}']),

('Work in Progress Update',
 'status_update',
 'Progress Update — {ref_number} | Apex Trophy Solutions',
 'Dear {client_name},

We wanted to give you an update on the progress of your trophies.

Reference Number: {ref_number}
Current Stage: {current_phase}
Estimated Completion: {estimated_completion}

{update_notes}

We will continue to keep you informed as your trophies move through each stage. Please do not hesitate to reach out if you have any questions.

Warm regards,
The Apex Trophy Solutions Team',
 ARRAY['{client_name}','{ref_number}','{current_phase}','{estimated_completion}','{update_notes}']),

('Trophies Completed',
 'completion',
 'Your Trophies are Ready — {ref_number} | Apex Trophy Solutions',
 'Dear {client_name},

Exciting news! Your trophies have been completed and have passed our quality inspection.

Reference Number: {ref_number}
Trophies Completed: {species_list}

OUTSTANDING BALANCE: {balance_due}

Before we can arrange shipping or collection, we kindly ask that you settle the outstanding balance.

Payment Details:
Bank: [BANK DETAILS]
Reference: {ref_number}

Once payment is confirmed, we will arrange shipping/collection as per your instructions.

We hope you are as thrilled with the finished trophies as we are!

Warm regards,
The Apex Trophy Solutions Team',
 ARRAY['{client_name}','{ref_number}','{species_list}','{balance_due}']),

('Shipping Notification',
 'shipping',
 'Trophies Shipped — {ref_number} | Apex Trophy Solutions',
 'Dear {client_name},

Your trophies are on their way!

Reference Number: {ref_number}
Shipped Via: {courier}
Tracking Number: {tracking_number}
Estimated Delivery: {estimated_delivery}
Destination: {destination}

Boxes / Crates: {box_count}

Please ensure someone is available to receive the shipment and inspect the packaging upon arrival. If there are any issues, please contact us immediately.

It has been a pleasure working with you and we look forward to seeing you again.

Warm regards,
The Apex Trophy Solutions Team',
 ARRAY['{client_name}','{ref_number}','{courier}','{tracking_number}','{estimated_delivery}','{destination}','{box_count}']),

('Documents Outstanding',
 'document_request',
 'Outstanding Documents Required — {ref_number} | Apex Trophy Solutions',
 'Dear {client_name},

To proceed with your trophies, we require the following outstanding documents:

Reference Number: {ref_number}
Outstanding: {document_list}

These documents are required for legal compliance and to ensure there are no delays with your shipment.

Please send these to us as soon as possible.

Warm regards,
The Apex Trophy Solutions Team',
 ARRAY['{client_name}','{ref_number}','{document_list}']);
