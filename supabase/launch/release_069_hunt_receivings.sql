-- Migration 069: the delivery details of a receiving, like the top and bottom of the paper receiving sheet:
-- who brought the trophies, whether the workshop collected them or they were delivered, the mileage, and a note.
-- One row each time trophies are received for a hunt (trophies can arrive in more than one delivery).

create table if not exists hunt_receivings (
  id                uuid primary key default gen_random_uuid(),
  hunt_id           uuid not null references client_hunts(id) on delete cascade,
  received_at       timestamptz not null default now(),
  received_by       uuid,
  received_by_name  text,
  delivered_by_name text,
  brought_by        text check (brought_by in ('collected', 'delivered')),
  mileage_km        numeric,
  note              text,
  animals_count     integer,
  created_at        timestamptz not null default now()
);
create index if not exists idx_hunt_receivings_hunt on hunt_receivings (hunt_id, received_at desc);
alter table hunt_receivings enable row level security;
drop policy if exists "staff_read_receivings" on hunt_receivings;
create policy "staff_read_receivings" on hunt_receivings for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
drop policy if exists "staff_add_receivings" on hunt_receivings;
create policy "staff_add_receivings" on hunt_receivings for insert to authenticated
  with check (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
grant select, insert on hunt_receivings to authenticated;

-- Check (should say true):
select count(*) = 1 as receivings_ready from information_schema.tables where table_name = 'hunt_receivings';
