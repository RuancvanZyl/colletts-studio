-- Checks which of the recent SQL files are in your database. Read only: it changes nothing.
-- Paste into SQL Editor, click Run. Every line should say true.
select * from (values
  ('067 phone notifications table',          to_regclass('public.push_subscriptions') is not null),
  ('069 receiving sheets',                   to_regclass('public.hunt_receivings') is not null),
  ('070 arrival alerts',                     exists (select 1 from pg_proc where proname = 'mark_arrived')),
  ('071 missing parts follow-up',            to_regclass('public.part_followups') is not null),
  ('072 saved drafts',                       to_regclass('public.client_drafts') is not null),
  ('073 local clients need no documents',    exists (select 1 from pg_proc where proname = '_no_documents_for_local')),
  ('074 receiving issues',                   exists (select 1 from pg_proc where proname = 'staff_decide_receiving_issue')),
  ('075 price list and automatic quote',     coalesce((select count(*) from mount_prices), 0) > 800 and exists (select 1 from pg_proc where proname = 'hunter_submit_payment_proof')),
  ('076 change after deposit and credit',    to_regclass('public.client_credits') is not null and exists (select 1 from pg_proc where proname = 'hunter_reopen_quote')),
  ('077 tanning already done',               coalesce((select prosrc like '%tanning already done%' from pg_proc where proname = 'hunter_finish_choices' limit 1), false)),
  ('078 photos in messages',                 (select count(*) from information_schema.columns where table_name = 'client_messages' and column_name in ('attachments', 'push_sent')) = 2
                                              and exists (select 1 from storage.buckets where id = 'message-files')),
  ('079 messages show in notifications',     exists (select 1 from pg_trigger where tgname = 'trg_notify_client_of_message')),
  ('080 history and kept messages',         to_regclass('public.audit_log') is not null and exists (select 1 from pg_trigger where tgname = 'trg_messages_are_kept')),
  ('Phones that have notifications on',      coalesce((select count(*) from push_subscriptions), 0) > 0)
) as t(what, ok)
order by what;
