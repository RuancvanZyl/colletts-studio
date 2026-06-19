-- ============================================================
-- Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
alter table species enable row level security;
alter table outfitters enable row level security;
alter table clients enable row level security;
alter table onboarding_step_templates enable row level security;
alter table client_onboarding_steps enable row level security;
alter table receiving_batches enable row level security;
alter table mount_types enable row level security;
alter table specimens enable row level security;
alter table attachments enable row level security;
alter table departments enable row level security;
alter table jobs enable row level security;
alter table job_phase_history enable row level security;
alter table work_sessions enable row level security;
alter table phase_checkpoints enable row level security;
alter table parts enable row level security;
alter table price_list_versions enable row level security;
alter table price_list_items enable row level security;
alter table product_lead_times enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table payments enable row level security;
alter table phase_sla_rules enable row level security;
alter table job_alerts enable row level security;
alter table inventory_items enable row level security;
alter table inventory_usage_log enable row level security;
alter table client_communications enable row level security;
alter table storage_locations enable row level security;
alter table staff_profiles enable row level security;

-- Helper: get current user's role from staff_profiles
create or replace function get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from staff_profiles where id = auth.uid();
$$;

-- Helper: get current user's department
create or replace function get_my_department()
returns uuid
language sql
security definer
stable
as $$
  select department_id from staff_profiles where id = auth.uid();
$$;

-- ── Reference tables: all authenticated staff can read ────────
create policy "staff_read_species" on species for select using (auth.role() = 'authenticated');
create policy "staff_read_mount_types" on mount_types for select using (auth.role() = 'authenticated');
create policy "staff_read_departments" on departments for select using (auth.role() = 'authenticated');
create policy "staff_read_sla_rules" on phase_sla_rules for select using (auth.role() = 'authenticated');
create policy "staff_read_onboarding_templates" on onboarding_step_templates for select using (auth.role() = 'authenticated');
create policy "staff_read_lead_times" on product_lead_times for select using (auth.role() = 'authenticated');
create policy "staff_read_price_versions" on price_list_versions for select using (auth.role() = 'authenticated');
create policy "staff_read_price_items" on price_list_items for select using (auth.role() = 'authenticated');

-- Admin/manager can write reference tables
create policy "admin_write_species" on species for all using (get_my_role() in ('admin','studio_manager'));
create policy "admin_write_mount_types" on mount_types for all using (get_my_role() in ('admin','studio_manager'));
create policy "admin_write_departments" on departments for all using (get_my_role() = 'admin');
create policy "admin_write_sla_rules" on phase_sla_rules for all using (get_my_role() in ('admin','studio_manager'));
create policy "admin_write_lead_times" on product_lead_times for all using (get_my_role() in ('admin','studio_manager'));
create policy "admin_write_price_versions" on price_list_versions for all using (get_my_role() in ('admin','studio_manager','bookkeeper'));
create policy "admin_write_price_items" on price_list_items for all using (get_my_role() in ('admin','studio_manager','bookkeeper'));

-- ── Clients & outfitters ──────────────────────────────────────
create policy "staff_read_clients" on clients for select using (auth.role() = 'authenticated');
create policy "staff_write_clients" on clients for insert with check (get_my_role() in ('admin','studio_manager','ground_staff'));
create policy "staff_update_clients" on clients for update using (get_my_role() in ('admin','studio_manager'));

create policy "staff_read_outfitters" on outfitters for select using (auth.role() = 'authenticated');
create policy "admin_write_outfitters" on outfitters for all using (get_my_role() in ('admin','studio_manager'));

-- ── Specimens ─────────────────────────────────────────────────
create policy "staff_read_specimens" on specimens for select using (auth.role() = 'authenticated');
create policy "ground_staff_insert_specimens" on specimens for insert
  with check (get_my_role() in ('admin','studio_manager','ground_staff'));
create policy "staff_update_specimens" on specimens for update
  using (get_my_role() in ('admin','studio_manager','ground_staff'));

-- ── Receiving batches ─────────────────────────────────────────
create policy "staff_read_batches" on receiving_batches for select using (auth.role() = 'authenticated');
create policy "ground_staff_write_batches" on receiving_batches for insert
  with check (get_my_role() in ('admin','studio_manager','ground_staff'));

-- ── Jobs ──────────────────────────────────────────────────────
-- Department staff only see jobs in their department; admin/manager see all
create policy "read_jobs" on jobs for select
  using (
    get_my_role() in ('admin','studio_manager','bookkeeper')
    or assigned_department_id = get_my_department()
    or assigned_department_id is null
  );

create policy "write_jobs" on jobs for insert
  with check (get_my_role() in ('admin','studio_manager'));

create policy "update_jobs" on jobs for update
  using (
    get_my_role() in ('admin','studio_manager')
    or (
      get_my_role() = 'department_staff'
      and assigned_department_id = get_my_department()
    )
  );

-- ── Work sessions ─────────────────────────────────────────────
create policy "staff_read_work_sessions" on work_sessions for select using (auth.role() = 'authenticated');
create policy "staff_write_work_sessions" on work_sessions for insert
  with check (get_my_role() in ('admin','studio_manager','department_staff'));
create policy "staff_update_own_sessions" on work_sessions for update
  using (staff_id = auth.uid() or get_my_role() in ('admin','studio_manager'));

-- ── Phase history & checkpoints ───────────────────────────────
create policy "staff_read_phase_history" on job_phase_history for select using (auth.role() = 'authenticated');
create policy "staff_write_phase_history" on job_phase_history for insert
  with check (get_my_role() in ('admin','studio_manager','department_staff'));

create policy "staff_read_checkpoints" on phase_checkpoints for select using (auth.role() = 'authenticated');
create policy "staff_write_checkpoints" on phase_checkpoints for insert
  with check (get_my_role() in ('admin','studio_manager','department_staff'));

-- ── Parts ────────────────────────────────────────────────────
create policy "staff_read_parts" on parts for select using (auth.role() = 'authenticated');
create policy "staff_write_parts" on parts for all
  using (get_my_role() in ('admin','studio_manager','department_staff','ground_staff'));

-- ── Attachments ───────────────────────────────────────────────
create policy "staff_read_attachments" on attachments for select using (auth.role() = 'authenticated');
create policy "staff_write_attachments" on attachments for insert
  with check (auth.role() = 'authenticated');

-- ── Invoices & payments (bookkeeper + admin only) ─────────────
create policy "finance_read_invoices" on invoices for select
  using (get_my_role() in ('admin','studio_manager','bookkeeper'));
create policy "finance_write_invoices" on invoices for all
  using (get_my_role() in ('admin','studio_manager','bookkeeper'));

create policy "finance_read_line_items" on invoice_line_items for select
  using (get_my_role() in ('admin','studio_manager','bookkeeper'));
create policy "finance_write_line_items" on invoice_line_items for all
  using (get_my_role() in ('admin','studio_manager','bookkeeper'));

create policy "finance_read_payments" on payments for select
  using (get_my_role() in ('admin','studio_manager','bookkeeper'));
create policy "finance_write_payments" on payments for all
  using (get_my_role() in ('admin','studio_manager','bookkeeper'));

-- ── Alerts ───────────────────────────────────────────────────
create policy "staff_read_alerts" on job_alerts for select using (auth.role() = 'authenticated');
create policy "staff_ack_alerts" on job_alerts for update
  using (get_my_role() in ('admin','studio_manager'));
-- System (service role) inserts alerts via edge function — no insert policy needed for UI

-- ── Inventory ─────────────────────────────────────────────────
create policy "staff_read_inventory" on inventory_items for select using (auth.role() = 'authenticated');
create policy "admin_write_inventory" on inventory_items for all
  using (get_my_role() in ('admin','studio_manager'));

create policy "staff_read_usage" on inventory_usage_log for select using (auth.role() = 'authenticated');
create policy "staff_write_usage" on inventory_usage_log for insert
  with check (get_my_role() in ('admin','studio_manager','department_staff'));

-- ── Communications ────────────────────────────────────────────
create policy "staff_read_comms" on client_communications for select using (auth.role() = 'authenticated');
create policy "staff_write_comms" on client_communications for insert
  with check (auth.role() = 'authenticated');

-- ── Storage ───────────────────────────────────────────────────
create policy "staff_read_storage" on storage_locations for select using (auth.role() = 'authenticated');
create policy "staff_write_storage" on storage_locations for all
  using (get_my_role() in ('admin','studio_manager','department_staff','ground_staff'));

-- ── Onboarding steps ──────────────────────────────────────────
create policy "staff_read_client_steps" on client_onboarding_steps for select using (auth.role() = 'authenticated');
create policy "staff_write_client_steps" on client_onboarding_steps for all
  using (get_my_role() in ('admin','studio_manager'));

-- ── Staff profiles ────────────────────────────────────────────
create policy "staff_read_profiles" on staff_profiles for select using (auth.role() = 'authenticated');
create policy "own_profile_insert" on staff_profiles for insert with check (id = auth.uid());
create policy "admin_manage_profiles" on staff_profiles for update
  using (get_my_role() = 'admin' or id = auth.uid());
