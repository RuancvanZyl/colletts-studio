-- Open Water Timing Platform — core schema
-- Run in a NEW Supabase project dedicated to the swim meet.
-- Do NOT run against the Apex Trophy Solutions / Collett's Studio project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  location text,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed')),
  registration_close_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- age_groups — meet-defined brackets used to award medals within a race,
-- independent of what race the swimmer entered.
-- ---------------------------------------------------------------------------
create table age_groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  min_age int not null,
  max_age int not null,
  sort_order int not null default 0,
  check (min_age <= max_age)
);

-- ---------------------------------------------------------------------------
-- race_categories — an actual race within the event (e.g. "1km Open Water",
-- "5km Open Water"). Swimmers in the same category start together.
-- ---------------------------------------------------------------------------
create table race_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  distance_m int not null,
  gender_restriction text check (gender_restriction in ('male', 'female')),
  min_age int,
  max_age int,
  max_participants int,
  entry_fee numeric(10, 2) not null default 0,
  scheduled_start timestamptz,
  next_race_number int not null default 1,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- swimmers — a person; can register across multiple events over time.
-- ---------------------------------------------------------------------------
create table swimmers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  date_of_birth date not null,
  gender text not null check (gender in ('male', 'female')),
  club text,
  emergency_contact_name text not null,
  emergency_contact_phone text not null,
  medical_notes text,
  created_at timestamptz not null default now()
);

create index idx_swimmers_email on swimmers (lower(email));

-- ---------------------------------------------------------------------------
-- registrations
-- ---------------------------------------------------------------------------
create table registrations (
  id uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references swimmers(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  category_id uuid not null references race_categories(id) on delete cascade,
  race_number int not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'no_show', 'disqualified')),
  waiver_signed boolean not null default false,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (event_id, race_number),
  unique (swimmer_id, category_id)
);

create index idx_registrations_event on registrations (event_id);
create index idx_registrations_category on registrations (category_id);

-- ---------------------------------------------------------------------------
-- timing_chips — physical chip/tag inventory
-- ---------------------------------------------------------------------------
create table timing_chips (
  id uuid primary key default gen_random_uuid(),
  chip_code text not null unique,
  status text not null default 'available'
    check (status in ('available', 'assigned', 'lost', 'retired')),
  registration_id uuid unique references registrations(id) on delete set null,
  assigned_at timestamptz
);

-- ---------------------------------------------------------------------------
-- race_sessions — the live run of a category on race day
-- ---------------------------------------------------------------------------
create table race_sessions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null unique references race_categories(id) on delete cascade,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'staging', 'countdown', 'live', 'finished')),
  countdown_seconds int,
  countdown_started_at timestamptz,
  gun_time timestamptz,
  finished_at timestamptz
);

-- ---------------------------------------------------------------------------
-- scan_events — append-only audit log of every scan (check-in & finish)
-- ---------------------------------------------------------------------------
create table scan_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references race_sessions(id) on delete cascade,
  chip_code text not null,
  registration_id uuid references registrations(id) on delete set null,
  scan_type text not null check (scan_type in ('checkin', 'finish')),
  scanned_at timestamptz not null default now(),
  station_id text,
  is_duplicate boolean not null default false,
  note text
);

create index idx_scan_events_session on scan_events (session_id);
create index idx_scan_events_registration on scan_events (registration_id, scan_type);
