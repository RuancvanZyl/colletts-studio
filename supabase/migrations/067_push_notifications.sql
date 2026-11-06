-- Migration 067: phone / computer notifications. A person turns notifications on once on a device; the device is remembered here.
-- When a team message is sent the server tells the recipients' devices (function send-push).

alter table staff_messages add column if not exists push_sent boolean not null default false;
-- messages that already exist never trigger a notification
update staff_messages set push_sent = true where not push_sent;

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id);
alter table push_subscriptions enable row level security;
drop policy if exists "see my own devices" on push_subscriptions;
create policy "see my own devices" on push_subscriptions for select to authenticated using (user_id = auth.uid());
grant select on push_subscriptions to authenticated;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_agent text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_agent, 300))
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end;
$$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create or replace function public.remove_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end;
$$;
revoke all on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.remove_push_subscription(text) to authenticated;

-- Check (should say true, true):
select (select count(*) from information_schema.tables where table_name = 'push_subscriptions') = 1 as table_ready,
       (select count(*) from information_schema.columns where table_name = 'staff_messages' and column_name = 'push_sent') = 1 as column_ready;
