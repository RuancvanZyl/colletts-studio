-- ============================================================
-- Views and helper functions
-- Run AFTER 002_rls_policies.sql
-- ============================================================

-- ── Alert detection view ──────────────────────────────────────
-- Recomputed on read. Move to a scheduled Edge Function if perf becomes an issue.
create or replace view v_active_alerts as
select
  j.id as job_id,
  j.current_phase,
  j.due_date,
  j.production_started_at,
  c.full_name as client_name,
  sp.species_name,
  -- overdue_paid: invoice paid, job not shipped, past due date
  case
    when j.due_date is not null
      and j.current_phase not in ('shipped','delivered')
      and exists (
        select 1 from invoices i
        join invoice_line_items ili on ili.invoice_id = i.id
        where ili.job_id = j.id and i.status = 'paid'
      )
      and j.due_date < current_date
    then true else false
  end as is_overdue_paid,
  -- missing_target_date: invoice paid, no due date set
  case
    when j.due_date is null
      and j.current_phase not in ('shipped','delivered')
      and exists (
        select 1 from invoices i
        join invoice_line_items ili on ili.invoice_id = i.id
        where ili.job_id = j.id and i.status = 'paid'
      )
    then true else false
  end as is_missing_target_date,
  -- stalled_in_phase: current phase entered longer ago than SLA allows
  case
    when exists (
      select 1 from job_phase_history jph
      join phase_sla_rules sla on sla.phase = jph.phase
      where jph.job_id = j.id
        and jph.phase = j.current_phase
        and jph.exited_at is null
        and (sla.species_category is null or sla.species_category = (
          select s.category from specimens sp2
          join species s on s.id = sp2.species_id
          where sp2.id = j.specimen_id
        ))
        and now() - jph.entered_at > (sla.max_days || ' days')::interval
    )
    then true else false
  end as is_stalled
from jobs j
join specimens sp on sp.id = j.specimen_id
join clients c on c.id = sp.client_id
where j.current_phase not in ('shipped','delivered');

-- ── Dashboard summary function ────────────────────────────────
create or replace function get_dashboard_summary()
returns json
language sql
security definer
stable
as $$
  select json_build_object(
    'jobs_in_progress', (
      select count(*) from jobs
      where current_phase not in ('shipped','delivered')
    ),
    'jobs_overdue', (
      select count(*) from v_active_alerts where is_overdue_paid
    ),
    'jobs_missing_date', (
      select count(*) from v_active_alerts where is_missing_target_date
    ),
    'jobs_stalled', (
      select count(*) from v_active_alerts where is_stalled
    ),
    'specimens_received_today', (
      select count(*) from specimens
      where status = 'received' and created_at::date = current_date
    ),
    'shipments_today', (
      select count(*) from jobs where current_phase = 'shipped'
        and updated_at::date = current_date
    ),
    'low_stock_items', (
      select count(*) from inventory_items
      where quantity_on_hand <= reorder_threshold
    ),
    'unacked_alerts', (
      select count(*) from job_alerts where acknowledged = false
    )
  );
$$;

-- ── Auto-start production trigger ─────────────────────────────
-- Fires when a payment is inserted: if deposit threshold met AND specimen received,
-- sets production_started_at and computes due_date.
create or replace function check_production_gate()
returns trigger
language plpgsql
security definer
as $$
declare
  v_invoice invoices%rowtype;
  v_job jobs%rowtype;
  v_specimen specimens%rowtype;
  v_deposit_paid numeric;
  v_lead_days integer;
begin
  -- Get the invoice this payment is against
  select * into v_invoice from invoices where id = new.invoice_id;

  -- Sum all deposit payments against this invoice
  select coalesce(sum(amount), 0) into v_deposit_paid
  from payments
  where invoice_id = new.invoice_id
    and payment_type = 'deposit';

  -- Add the new payment if it's a deposit
  if new.payment_type = 'deposit' then
    v_deposit_paid := v_deposit_paid + new.amount;
  end if;

  -- Only proceed if deposit threshold is met
  if v_invoice.deposit_amount is null or v_deposit_paid < v_invoice.deposit_amount then
    return new;
  end if;

  -- Find all jobs on this invoice
  for v_job in
    select j.* from jobs j
    join invoice_line_items ili on ili.job_id = j.id
    where ili.invoice_id = new.invoice_id
      and j.production_started_at is null
  loop
    -- Check specimen is physically received
    select * into v_specimen from specimens where id = v_job.specimen_id;
    if v_specimen.status != 'received' then
      continue; -- wait until received
    end if;

    -- Look up lead days for this job
    select lead_days into v_lead_days
    from product_lead_times plt
    where (plt.mount_type_id = v_job.mount_type_id or plt.mount_type_id is null)
    order by plt.mount_type_id nulls last
    limit 1;

    -- Set production_started_at and due_date
    update jobs
    set
      production_started_at = now(),
      due_date = current_date + coalesce(v_lead_days, 90),
      updated_at = now()
    where id = v_job.id;
  end loop;

  return new;
end;
$$;

create trigger trg_check_production_gate
after insert on payments
for each row execute function check_production_gate();

-- ── Same trigger fires when specimen status changes to 'received' ──
create or replace function check_production_gate_on_receive()
returns trigger
language plpgsql
security definer
as $$
declare
  v_job jobs%rowtype;
  v_deposit_paid numeric;
  v_invoice invoices%rowtype;
  v_lead_days integer;
begin
  if new.status != 'received' or old.status = 'received' then
    return new;
  end if;

  for v_job in
    select j.* from jobs j where j.specimen_id = new.id and j.production_started_at is null
  loop
    -- Find the invoice for this job
    select i.* into v_invoice
    from invoices i
    join invoice_line_items ili on ili.invoice_id = i.id
    where ili.job_id = v_job.id
    limit 1;

    if v_invoice.id is null then continue; end if;

    -- Check deposit threshold
    select coalesce(sum(amount), 0) into v_deposit_paid
    from payments
    where invoice_id = v_invoice.id and payment_type = 'deposit';

    if v_invoice.deposit_amount is not null and v_deposit_paid < v_invoice.deposit_amount then
      continue;
    end if;

    select lead_days into v_lead_days
    from product_lead_times plt
    where (plt.mount_type_id = v_job.mount_type_id or plt.mount_type_id is null)
    order by plt.mount_type_id nulls last
    limit 1;

    update jobs
    set
      production_started_at = now(),
      due_date = current_date + coalesce(v_lead_days, 90),
      updated_at = now()
    where id = v_job.id;
  end loop;

  return new;
end;
$$;

create trigger trg_production_gate_on_receive
after update of status on specimens
for each row execute function check_production_gate_on_receive();

-- ── Updated_at auto-update ────────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger touch_clients_updated_at before update on clients
  for each row execute function touch_updated_at();
create trigger touch_specimens_updated_at before update on specimens
  for each row execute function touch_updated_at();
create trigger touch_jobs_updated_at before update on jobs
  for each row execute function touch_updated_at();
create trigger touch_parts_updated_at before update on parts
  for each row execute function touch_updated_at();
