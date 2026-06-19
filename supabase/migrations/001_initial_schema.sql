-- ============================================================
-- Collett's Wildlife Artistry — Initial Schema
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- ── Species reference ────────────────────────────────────────
create table species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  scientific_name text,
  category text check (category in ('plains_game','dangerous_game','bird','fish','other')),
  created_at timestamptz default now()
);

-- ── Outfitters / professional hunters ───────────────────────
create table outfitters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  country text,
  province text,
  farm_name text,
  commission_pct numeric(5,2),
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  created_at timestamptz default now()
);

-- ── Clients ──────────────────────────────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  address text,
  country text,
  nationality text,
  passport_number text,
  passport_expiry date,
  outfitter_id uuid references outfitters(id),
  onboarding_status text not null default 'not_started'
    check (onboarding_status in ('not_started','in_progress','complete')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_clients_outfitter on clients(outfitter_id);
create index idx_clients_name on clients(full_name);

-- ── Onboarding checklist ─────────────────────────────────────
create table onboarding_step_templates (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null,
  is_required boolean default true
);

create table client_onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  template_id uuid not null references onboarding_step_templates(id),
  completed boolean default false,
  completed_at timestamptz,
  completed_by uuid references auth.users(id)
);

-- Seed default onboarding steps
insert into onboarding_step_templates (label, sort_order, is_required) values
  ('Contract signed', 1, true),
  ('Deposit received', 2, true),
  ('Shipping address confirmed', 3, true),
  ('CITES / permit requirements noted', 4, false),
  ('Client briefed on lead times', 5, true);

-- ── Receiving batches (shipments from farms) ─────────────────
create table receiving_batches (
  id uuid primary key default gen_random_uuid(),
  received_date date not null default current_date,
  outfitter_id uuid references outfitters(id),
  source_other text,
  received_by uuid references auth.users(id),
  notes text,
  created_at timestamptz default now()
);

-- ── Mount types ───────────────────────────────────────────────
create table mount_types (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

insert into mount_types (name) values
  ('Shoulder Mount'),
  ('Full Mount'),
  ('Euro Mount'),
  ('Pedestal Mount'),
  ('Rug'),
  ('Skull Cap'),
  ('Tan to Fur'),
  ('Custom');

-- ── Specimens (canonical trophy record) ──────────────────────
create table specimens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  species_id uuid references species(id),
  species_name text,                        -- fallback free-text if species not in table yet
  hunt_date date,
  hunt_location text,
  outfitter_id uuid references outfitters(id),
  tag_number text unique,
  destination text check (destination in ('local','export')),
  receiving_batch_id uuid references receiving_batches(id),
  intake_condition text check (intake_condition in ('salted','frozen','wet_salted','cape_only','fresh','other')),
  current_location text,
  -- 'expected' = instructions exist, trophy not yet physically received
  -- 'received' = ground staff logged it in
  status text not null default 'expected' check (status in ('expected','received')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_specimens_client on specimens(client_id);
create index idx_specimens_status on specimens(status);
create index idx_specimens_tag on specimens(tag_number);

-- ── Attachments (photos for specimens and jobs) ───────────────
create table attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('specimen','job')),
  entity_id uuid not null,
  storage_path text not null,
  caption text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index idx_attachments_entity on attachments(entity_type, entity_id);

-- ── Departments ───────────────────────────────────────────────
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int default 0
);

insert into departments (name, sort_order) values
  ('Receiving', 1),
  ('Skin Processing', 2),
  ('Skull Processing', 3),
  ('Storage', 4),
  ('Tannery', 5),
  ('Mounting', 6),
  ('Finishing', 7),
  ('Quality Control', 8),
  ('Packing & Shipping', 9);

-- ── Jobs (production order per specimen) ─────────────────────
create type job_phase as enum (
  'intake',
  'skin_processing',
  'skull_processing',
  'storage_pre',
  'tannery',
  'storage_post',
  'mounting',
  'finishing',
  'quality_check',
  'packing',
  'shipped',
  'delivered'
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  specimen_id uuid not null references specimens(id),
  mount_type_id uuid references mount_types(id),
  instructions text,
  instructions_received_at timestamptz,
  current_phase job_phase not null default 'intake',
  assigned_department_id uuid references departments(id),
  assigned_staff_id uuid references auth.users(id),
  -- Clock starts when BOTH deposit cleared AND specimen received
  production_started_at timestamptz,
  due_date date,
  rush boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_jobs_specimen on jobs(specimen_id);
create index idx_jobs_phase on jobs(current_phase);
create index idx_jobs_due on jobs(due_date);

-- ── Job phase history (full audit trail) ─────────────────────
create table job_phase_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  phase job_phase not null,
  entered_at timestamptz default now(),
  exited_at timestamptz,
  staff_id uuid references auth.users(id),
  notes text
);

-- ── Work sessions (live clock-in/out per job) ────────────────
create table work_sessions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  staff_id uuid not null references auth.users(id),
  department_id uuid references departments(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index idx_work_sessions_active on work_sessions(staff_id) where ended_at is null;

-- ── Phase checkpoints (proof of work before advancing) ───────
create table phase_checkpoints (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  phase job_phase not null,
  staff_id uuid not null references auth.users(id),
  comment text,
  attachment_id uuid references attachments(id),
  created_at timestamptz default now(),
  constraint checkpoint_has_proof check (comment is not null or attachment_id is not null)
);

-- ── Part tracking (individual skull/skin/etc per job) ────────
create type part_type as enum (
  'skull','horns','cape_skin','full_skin','tusks','antlers','full_body'
);

create table parts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  part_type part_type not null,
  tag_number text,
  current_phase job_phase,
  current_location text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_parts_job on parts(job_id);
create index idx_parts_tag on parts(tag_number);

-- ── Pricing ───────────────────────────────────────────────────
create table price_list_versions (
  id uuid primary key default gen_random_uuid(),
  effective_date date not null,
  currency text not null default 'ZAR',
  notes text,
  is_active boolean default false
);

create table price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_version_id uuid not null references price_list_versions(id) on delete cascade,
  species_id uuid references species(id),
  species_name text,                        -- free-text fallback
  mount_type_id uuid not null references mount_types(id),
  base_price numeric(12,2) not null,
  unique (price_list_version_id, species_id, mount_type_id)
);

create table product_lead_times (
  id uuid primary key default gen_random_uuid(),
  species_category text,
  mount_type_id uuid references mount_types(id),
  lead_days integer not null
);

-- ── Invoices & payments ───────────────────────────────────────
create table invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  invoice_number text unique not null,
  status text not null default 'draft'
    check (status in ('draft','sent','partially_paid','paid','overdue','cancelled')),
  issue_date date default current_date,
  due_date date,
  currency text default 'ZAR',
  deposit_amount numeric(12,2),
  notes text,
  created_at timestamptz default now()
);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  job_id uuid references jobs(id),
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) generated always as (quantity * unit_price) stored
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_type text check (payment_type in ('deposit','progress','final')),
  paid_at timestamptz default now(),
  method text check (method in ('eft','card','cash','payfast')),
  payfast_payment_id text,
  notes text
);

-- ── SLA & alerts ─────────────────────────────────────────────
create table phase_sla_rules (
  id uuid primary key default gen_random_uuid(),
  species_category text,
  mount_type_id uuid references mount_types(id),
  phase job_phase not null,
  max_days integer not null
);

create table job_alerts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  alert_type text not null check (alert_type in (
    'overdue_paid','stalled_in_phase','missing_target_date'
  )),
  triggered_at timestamptz default now(),
  acknowledged boolean default false,
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz
);

create index idx_job_alerts_unacked on job_alerts(job_id) where acknowledged = false;

-- ── Inventory ─────────────────────────────────────────────────
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text,
  quantity_on_hand numeric(12,2) default 0,
  reorder_threshold numeric(12,2) default 0,
  unit_cost numeric(12,2),
  supplier text,
  created_at timestamptz default now()
);

create table inventory_usage_log (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id),
  job_id uuid references jobs(id),
  quantity_used numeric(12,2) not null,
  used_at timestamptz default now(),
  logged_by uuid references auth.users(id)
);

-- ── Communications log ────────────────────────────────────────
create table client_communications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  channel text check (channel in ('email','call','whatsapp','sms','in_person')),
  summary text not null,
  occurred_at timestamptz default now(),
  logged_by uuid references auth.users(id)
);

-- ── Storage locations ─────────────────────────────────────────
create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  zone text not null,           -- 'Skulls','Hides','Tusks','Horns','Full Bodies'
  rack text not null,           -- e.g. 'R-12'
  bin text not null,            -- e.g. 'B-05'
  capacity int default 1,
  current_part_id uuid references parts(id),
  created_at timestamptz default now(),
  unique (zone, rack, bin)
);

-- ── Staff profiles (extends auth.users) ──────────────────────
create table staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'department_staff'
    check (role in ('admin','studio_manager','department_staff','ground_staff','bookkeeper')),
  department_id uuid references departments(id),
  is_active boolean default true,
  created_at timestamptz default now()
);
