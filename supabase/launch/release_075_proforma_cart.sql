-- Migration 075: the shopping-cart journey for hunters.
-- * The 2026 price list now lives in the database (table mount_prices), so a pro-forma quote can be worked out safely on the server.
--   It is loaded from the same list the screens use (scripts/genPricesSql.ts; a unit test checks they still match).
-- * hunter_finish_choices: when a hunter finishes choosing mounts, the quote is built from the price list. If every animal has a price it is
--   sent straight away; if something needs our own price (custom mount, replica, tan only...) it waits as a draft for staff. A quote that
--   staff have edited is never overwritten. The hunter can change their choices and the quote updates, until they accept it.
-- * Leftover skin: the client says what should happen with it (leather work, no thanks, or ask me later); it is written on the animal's card.
--   Leather work is priced by the workshop, so it holds the quote back like any custom order until we have agreed it with the client.
-- * hunter_submit_payment_proof: after a bank transfer the hunter uploads proof; staff are told to check the bank and record the payment.
-- Needs migrations 046, 048 and 061.

create table if not exists mount_prices (
  species     text not null,
  mount       text not null,
  client_type text not null check (client_type in ('export', 'local')),
  price       numeric(12, 2) not null check (price > 0),
  primary key (species, mount, client_type)
);
alter table mount_prices enable row level security;
drop policy if exists "read_mount_prices" on mount_prices;
create policy "read_mount_prices" on mount_prices for select to authenticated using (true);
-- no direct writes: the list changes by migration

alter table quotes add column if not exists auto_made boolean not null default false;
alter table quotes add column if not exists proof_paths text[] not null default '{}';
alter table quotes add column if not exists proof_at timestamptz;
alter table quotes add column if not exists proof_note text;
alter table quotes add column if not exists proof_checked_at timestamptz;

-- one way to save a quote, used by staff and by the automatic pro-forma
create or replace function public._save_quote(p_hunt uuid, p_currency text, p_lines jsonb, p_deposit_percent numeric, p_note text, p_send boolean, p_by uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_q uuid; v_status text; l jsonb; v_i int := 0;
begin
  select client_id into v_client from client_hunts where id = p_hunt;
  if v_client is null then raise exception 'That hunt does not exist'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Add at least one line to the quote'; end if;
  if p_send then
    for l in select * from jsonb_array_elements(p_lines) loop
      if l->>'amount' is null or (l->>'amount')::numeric < 0 then raise exception 'Every line needs an amount before the quote can be sent (%)', l->>'description'; end if;
    end loop;
  end if;

  select id, status into v_q, v_status from quotes where hunt_id = p_hunt and status in ('draft', 'sent', 'declined') order by created_at desc limit 1;
  if v_q is null then
    if exists (select 1 from quotes where hunt_id = p_hunt and status in ('accepted', 'deposit_paid')) then
      raise exception 'This quote has already been accepted';
    end if;
    insert into quotes (hunt_id, client_id, currency, deposit_percent, note, created_by) values (p_hunt, v_client, coalesce(p_currency, 'USD'), coalesce(p_deposit_percent, 50), p_note, p_by) returning id into v_q;
  else
    delete from quote_lines where quote_id = v_q;
    update quotes set currency = coalesce(p_currency, currency), deposit_percent = coalesce(p_deposit_percent, deposit_percent), note = p_note, updated_at = now(), hunter_comment = null where id = v_q;
  end if;

  for l in select * from jsonb_array_elements(p_lines) loop
    if coalesce(trim(l->>'description'), '') = '' then raise exception 'Every line needs a description'; end if;
    v_i := v_i + 1;
    insert into quote_lines (quote_id, hunt_doc_id, description, amount, sort_order, kind, stock_reference)
    values (v_q, nullif(l->>'hunt_doc_id', '')::uuid, trim(l->>'description'), nullif(l->>'amount', '')::numeric, v_i,
            case when l->>'kind' = 'hide_purchase' then 'hide_purchase' else 'item' end, nullif(trim(coalesce(l->>'stock_reference', '')), ''));
  end loop;

  update client_hunts set quote_required = true where id = p_hunt;
  update quotes set status = case when p_send then 'sent' else 'draft' end,
                    sent_at = case when p_send then now() else sent_at end, declined_at = null, updated_at = now()
    where id = v_q;

  if p_send then
    insert into client_notifications (client_id, hunt_id, type, stage, title, body)
    values (v_client, p_hunt, 'alert', 'quote', 'Your quote is ready', 'Open My trophies to see the quote and accept it. We start work once the deposit is in.');
  end if;
  return v_q;
end;
$$;
revoke all on function public._save_quote(uuid, text, jsonb, numeric, text, boolean, uuid) from public, anon, authenticated;

create or replace function public.staff_save_quote(p_hunt uuid, p_currency text, p_lines jsonb, p_deposit_percent numeric, p_note text, p_send boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_q uuid;
begin
  if not public.is_quote_staff() then raise exception 'Only managers can prepare quotes'; end if;
  v_q := public._save_quote(p_hunt, p_currency, p_lines, p_deposit_percent, p_note, p_send, auth.uid());
  update quotes set auto_made = false where id = v_q;   -- once staff have had their hands on it, the app never rebuilds it
  return v_q;
end;
$$;
revoke all on function public.staff_save_quote(uuid, text, jsonb, numeric, text, boolean) from public, anon;
grant execute on function public.staff_save_quote(uuid, text, jsonb, numeric, text, boolean) to authenticated;

-- the hunter has finished choosing: build the pro-forma quote
-- returns: 'sent' (the quote is ready for the hunter), 'staff' (staff must price something first, or already have their own quote),
--          'accepted' (the quote was already accepted; staff deal with anything new), 'nothing' (no mounts chosen yet)
create or replace function public.hunter_finish_choices(p_hunt uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare h record; v_type text; v_lines jsonb; v_unpriced int; v_q record; v_id uuid; v_leather jsonb;
begin
  select hh.id, hh.client_id, c.client_type into h from client_hunts hh join clients c on c.id = hh.client_id where hh.id = p_hunt and c.auth_user_id = auth.uid();
  if not found then raise exception 'That hunt is not on your profile'; end if;
  v_type := case when h.client_type = 'local' then 'local' else 'export' end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'hunt_doc_id', d.id,
           'amount', p.price,
           'description', coalesce(d.form_data->>'species', 'Animal') || ': ' || (d.form_data->>'mount_type') ||
             case when jsonb_array_length(coalesce(d.form_data->'custom'->'combined_with', '[]'::jsonb)) > 0
                  then ' (combined with ' || (select string_agg(x.form_data->>'species', ', ') from hunt_documents x where x.id::text in (select jsonb_array_elements_text(d.form_data->'custom'->'combined_with'))) || ')' else '' end ||
             case when d.form_data->>'mount_type' = 'Replica' and coalesce(d.form_data->'replica'->>'type', '') <> '' then ' (' || (d.form_data->'replica'->>'type') || ')' else '' end
         ) order by d.created_at, d.id), '[]'::jsonb),
         count(*) filter (where p.price is null)
    into v_lines, v_unpriced
    from hunt_documents d
    left join mount_prices p on p.species = d.form_data->>'species' and p.mount = d.form_data->>'mount_type' and p.client_type = v_type
   where d.hunt_id = p_hunt and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending', 'awaiting_arrival')
     and coalesce(d.form_data->>'mount_type', '') not in ('', 'Pending Instructions', 'Custom mount (combined)');
  if jsonb_array_length(v_lines) = 0 then return jsonb_build_object('result', 'nothing'); end if;
  -- leather work is priced by the workshop: one open line per animal, so the quote waits until we have agreed it with the client
  select coalesce(jsonb_agg(jsonb_build_object('hunt_doc_id', d.id, 'amount', null,
           'description', coalesce(d.form_data->>'species', 'Animal') || ': leather work' ||
             case when jsonb_array_length(coalesce(d.form_data->'leather'->'items', '[]'::jsonb)) > 0
                  then ' (' || (select string_agg(x, ', ') from jsonb_array_elements_text(d.form_data->'leather'->'items') x) || ')' else '' end
         ) order by d.created_at, d.id), '[]'::jsonb)
    into v_leather
    from hunt_documents d
   where d.hunt_id = p_hunt and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending', 'awaiting_arrival')
     and coalesce(d.form_data->>'mount_type', '') not in ('', 'Pending Instructions', 'Custom mount (combined)')
     and d.form_data->'leather'->>'choice' = 'leather';
  v_lines := v_lines || v_leather;
  v_unpriced := v_unpriced + jsonb_array_length(v_leather);

  select id, status, auto_made into v_q from quotes where hunt_id = p_hunt order by created_at desc limit 1;
  if found and v_q.status in ('accepted', 'deposit_paid', 'paid') then return jsonb_build_object('result', 'accepted', 'quote_id', v_q.id); end if;
  if found and v_q.status in ('draft', 'sent', 'declined') and not v_q.auto_made then
    update client_hunts set quote_required = true where id = p_hunt;
    return jsonb_build_object('result', 'staff', 'quote_id', v_q.id);
  end if;

  v_id := public._save_quote(p_hunt, case when v_type = 'local' then 'ZAR' else 'USD' end, v_lines, 50, null, v_unpriced = 0, null);
  update quotes set auto_made = true where id = v_id;
  return jsonb_build_object('result', case when v_unpriced = 0 then 'sent' else 'staff' end, 'quote_id', v_id);
end;
$$;
revoke all on function public.hunter_finish_choices(uuid) from public, anon;
grant execute on function public.hunter_finish_choices(uuid) to authenticated;

-- proof of a bank transfer (the files are uploaded to the hunt's documents folder first)
create or replace function public.hunter_submit_payment_proof(p_quote uuid, p_files text[], p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare q record;
begin
  select qq.id, qq.hunt_id, qq.status into q from quotes qq join clients c on c.id = qq.client_id where qq.id = p_quote and c.auth_user_id = auth.uid();
  if not found then raise exception 'That quote is not on your profile'; end if;
  if q.status not in ('accepted', 'deposit_paid') then raise exception 'This quote is not waiting for a payment'; end if;
  if coalesce(cardinality(p_files), 0) = 0 then raise exception 'Add a photo or a PDF of your payment first'; end if;
  update quotes set proof_paths = p_files, proof_at = now(), proof_note = nullif(trim(coalesce(p_note, '')), ''), proof_checked_at = null, updated_at = now() where id = p_quote;
end;
$$;
revoke all on function public.hunter_submit_payment_proof(uuid, text[], text) from public, anon;
grant execute on function public.hunter_submit_payment_proof(uuid, text[], text) to authenticated;

-- staff recording a payment counts as checking the proof
create or replace function public._payment_checks_proof() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update quotes set proof_checked_at = now() where id = new.quote_id and proof_at is not null and proof_checked_at is null;
  return new;
end;
$$;
drop trigger if exists trg_payment_checks_proof on quote_payments;
create trigger trg_payment_checks_proof after insert on quote_payments for each row execute function public._payment_checks_proof();

-- leftover skin: what the client wants done with it. choice: 'leather' (with items), 'none' (they do not want anything, noted) or 'later' (ask me again)
create or replace function public._set_leather(p_doc uuid, p_choice text, p_items text[], p_note text, p_by text, p_by_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_items text[];
begin
  if p_choice not in ('leather', 'none', 'later') then raise exception 'Choose leather work, no thanks, or ask me later'; end if;
  select coalesce(array_agg(trim(x)) filter (where trim(x) <> ''), '{}') into v_items from unnest(coalesce(p_items, '{}')) x;
  if p_choice = 'leather' and cardinality(v_items) = 0 then raise exception 'Choose what you would like made from the leftover skin'; end if;
  if p_choice <> 'leather' then v_items := '{}'; end if;
  update hunt_documents set updated_at = now(),
         form_data = jsonb_set(coalesce(form_data, '{}'::jsonb), '{leather}', jsonb_build_object('choice', p_choice, 'items', to_jsonb(v_items),
           'note', nullif(trim(coalesce(p_note, '')), ''), 'by', p_by, 'by_name', p_by_name, 'at', now()))
   where id = p_doc;
end;
$$;
revoke all on function public._set_leather(uuid, text, text[], text, text, text) from public, anon, authenticated;

create or replace function public.hunter_set_leather(p_doc uuid, p_choice text, p_items text[] default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select c.full_name into v_name from hunt_documents hd join client_hunts h on h.id = hd.hunt_id join clients c on c.id = h.client_id
   where hd.id = p_doc and hd.doc_type = 'job_card' and c.auth_user_id = auth.uid() and hd.status not in ('completed', 'cancelled');
  if not found then raise exception 'That trophy is not on your profile'; end if;
  perform public._set_leather(p_doc, p_choice, p_items, p_note, 'client', v_name);
end;
$$;
revoke all on function public.hunter_set_leather(uuid, text, text[], text) from public, anon;
grant execute on function public.hunter_set_leather(uuid, text, text[], text) to authenticated;

-- staff write down what the client told them (phone, WhatsApp, in person)
create or replace function public.staff_set_leather(p_doc uuid, p_choice text, p_items text[] default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select full_name into v_name from staff_profiles where id = auth.uid() and is_active;
  if v_name is null then raise exception 'Only staff can do this'; end if;
  if not exists (select 1 from hunt_documents where id = p_doc and doc_type = 'job_card') then raise exception 'That animal was not found'; end if;
  perform public._set_leather(p_doc, p_choice, p_items, p_note, 'workshop', v_name);
end;
$$;
revoke all on function public.staff_set_leather(uuid, text, text[], text) from public, anon;
grant execute on function public.staff_set_leather(uuid, text, text[], text) to authenticated;

-- the workshop and the client have agreed the leather work (items and price)
create or replace function public.staff_confirm_leather(p_doc uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select full_name into v_name from staff_profiles where id = auth.uid() and is_active;
  if v_name is null then raise exception 'Only staff can do this'; end if;
  update hunt_documents set updated_at = now(),
         form_data = jsonb_set(form_data, '{leather}', (form_data->'leather') || jsonb_build_object('confirmed_at', now(), 'confirmed_by', v_name, 'confirmed_note', nullif(trim(coalesce(p_note, '')), '')))
   where id = p_doc and doc_type = 'job_card' and form_data->'leather'->>'choice' = 'leather';
  if not found then raise exception 'This animal has no leather work to confirm'; end if;
end;
$$;
revoke all on function public.staff_confirm_leather(uuid, text) from public, anon;
grant execute on function public.staff_confirm_leather(uuid, text) to authenticated;

-- the 2026 price list (export USD, local ZAR)
insert into mount_prices (species, mount, client_type, price) values
('African Wild Cat','Full Mount','export',780),
('African Wild Cat','Half Mount','export',390),
('African Wild Cat','Euro Skull','export',160),
('African Wild Cat','Bleach Only','export',95),
('African Wild Cat','Full Mount','local',7951),
('African Wild Cat','Half Mount','local',3976),
('African Wild Cat','Euro Skull','local',1413),
('African Wild Cat','Bleach Only','local',1110),
('Baboon','Shoulder Mount','export',695),
('Baboon','Offset Shoulder Mount','export',800),
('Baboon','Pedestal Mount','export',830),
('Baboon','Full Mount','export',1500),
('Baboon','Half Mount','export',750),
('Baboon','Euro Skull','export',210),
('Baboon','Bleach Only','export',130),
('Baboon','Shoulder Mount','local',4585),
('Baboon','Pedestal Mount','local',5566),
('Baboon','Full Mount','local',11485),
('Baboon','Half Mount','local',5743),
('Baboon','Euro Skull','local',1880),
('Baboon','Bleach Only','local',1547),
('Baboon (Chacma)','Shoulder Mount','export',695),
('Baboon (Chacma)','Offset Shoulder Mount','export',800),
('Baboon (Chacma)','Pedestal Mount','export',830),
('Baboon (Chacma)','Full Mount','export',1500),
('Baboon (Chacma)','Half Mount','export',750),
('Baboon (Chacma)','Euro Skull','export',210),
('Baboon (Chacma)','Bleach Only','export',130),
('Baboon (Chacma)','Shoulder Mount','local',4585),
('Baboon (Chacma)','Pedestal Mount','local',5566),
('Baboon (Chacma)','Full Mount','local',11485),
('Baboon (Chacma)','Half Mount','local',5743),
('Baboon (Chacma)','Euro Skull','local',1880),
('Baboon (Chacma)','Bleach Only','local',1547),
('Blesbok','Shoulder Mount','export',755),
('Blesbok','Offset Shoulder Mount','export',870),
('Blesbok','Pedestal Mount','export',900),
('Blesbok','Full Mount','export',2540),
('Blesbok','Half Mount','export',1270),
('Blesbok','Euro Skull','export',235),
('Blesbok','Bleach Only','export',130),
('Blesbok','Shoulder Mount','local',6595),
('Blesbok','Pedestal Mount','local',8004),
('Blesbok','Full Mount','local',19489),
('Blesbok','Half Mount','local',9745),
('Blesbok','Euro Skull','local',1891),
('Blesbok','Bleach Only','local',1346),
('Bontebok','Shoulder Mount','export',750),
('Bontebok','Offset Shoulder Mount','export',865),
('Bontebok','Pedestal Mount','export',900),
('Bontebok','Full Mount','export',1620),
('Bontebok','Half Mount','export',810),
('Bontebok','Euro Skull','export',235),
('Bontebok','Bleach Only','export',130),
('Bontebok','Shoulder Mount','local',6595),
('Bontebok','Pedestal Mount','local',8004),
('Bontebok','Full Mount','local',19489),
('Bontebok','Half Mount','local',9745),
('Bontebok','Euro Skull','local',1891),
('Bontebok','Bleach Only','local',1552),
('Buffalo','Shoulder Mount','export',1390),
('Buffalo','Offset Shoulder Mount','export',1595),
('Buffalo','Pedestal Mount','export',1665),
('Buffalo','Euro Skull','export',395),
('Buffalo','Bleach Only','export',230),
('Buffalo','Shoulder Mount','local',14079),
('Buffalo','Pedestal Mount','local',17075),
('Buffalo','Full Mount','local',104497),
('Buffalo','Half Mount','local',52249),
('Buffalo','Euro Skull','local',4033),
('Buffalo','Bleach Only','local',3396),
('Buffalo (Cape)','Shoulder Mount','export',1390),
('Buffalo (Cape)','Offset Shoulder Mount','export',1595),
('Buffalo (Cape)','Pedestal Mount','export',1665),
('Buffalo (Cape)','Euro Skull','export',395),
('Buffalo (Cape)','Bleach Only','export',230),
('Buffalo (Cape)','Shoulder Mount','local',14079),
('Buffalo (Cape)','Pedestal Mount','local',17075),
('Buffalo (Cape)','Full Mount','local',104497),
('Buffalo (Cape)','Half Mount','local',52249),
('Buffalo (Cape)','Euro Skull','local',4033),
('Buffalo (Cape)','Bleach Only','local',3396),
('Burchell''s Zebra','Shoulder Mount','export',1100),
('Burchell''s Zebra','Offset Shoulder Mount','export',1265),
('Burchell''s Zebra','Pedestal Mount','export',1315),
('Burchell''s Zebra','Full Mount','export',4390),
('Burchell''s Zebra','Half Mount','export',2195),
('Burchell''s Zebra','Euro Skull','export',355),
('Burchell''s Zebra','Bleach Only','export',210),
('Burchell''s Zebra','Shoulder Mount','local',8709),
('Burchell''s Zebra','Pedestal Mount','local',10563),
('Burchell''s Zebra','Full Mount','local',40731),
('Burchell''s Zebra','Half Mount','local',20366),
('Burchell''s Zebra','Euro Skull','local',2692),
('Burchell''s Zebra','Bleach Only','local',2226),
('Bushbuck','Shoulder Mount','export',695),
('Bushbuck','Offset Shoulder Mount','export',800),
('Bushbuck','Pedestal Mount','export',830),
('Bushbuck','Full Mount','export',1620),
('Bushbuck','Half Mount','export',810),
('Bushbuck','Euro Skull','export',235),
('Bushbuck','Bleach Only','export',130),
('Bushbuck','Shoulder Mount','local',6595),
('Bushbuck','Pedestal Mount','local',8004),
('Bushbuck','Full Mount','local',19871),
('Bushbuck','Half Mount','local',9936),
('Bushbuck','Euro Skull','local',1681),
('Bushbuck','Bleach Only','local',1346),
('Bushpig','Shoulder Mount','export',695),
('Bushpig','Offset Shoulder Mount','export',800),
('Bushpig','Pedestal Mount','export',725),
('Bushpig','Full Mount','export',1620),
('Bushpig','Half Mount','export',810),
('Bushpig','Euro Skull','export',315),
('Bushpig','Bleach Only','export',200),
('Bushpig','Shoulder Mount','local',6295),
('Bushpig','Pedestal Mount','local',7647),
('Bushpig','Full Mount','local',17810),
('Bushpig','Half Mount','local',8905),
('Bushpig','Euro Skull','local',2389),
('Bushpig','Bleach Only','local',1577),
('Caracal','Full Mount','export',1130),
('Caracal','Half Mount','export',565),
('Caracal','Euro Skull','export',175),
('Caracal','Bleach Only','export',95),
('Caracal','Full Mount','local',12128),
('Caracal','Half Mount','local',6064),
('Caracal','Euro Skull','local',1413),
('Caracal','Bleach Only','local',1213),
('Civet','Full Mount','export',925),
('Civet','Half Mount','export',463),
('Civet','Euro Skull','export',175),
('Civet','Bleach Only','export',95),
('Civet','Full Mount','local',11472),
('Civet','Half Mount','local',5736),
('Civet','Euro Skull','local',1413),
('Civet','Bleach Only','local',1213),
('Civet (African)','Full Mount','export',925),
('Civet (African)','Half Mount','export',463),
('Civet (African)','Euro Skull','export',175),
('Civet (African)','Bleach Only','export',95),
('Civet (African)','Full Mount','local',11472),
('Civet (African)','Half Mount','local',5736),
('Civet (African)','Euro Skull','local',1413),
('Civet (African)','Bleach Only','local',1213),
('Crocodile','Full Mount','local',1844),
('Crocodile','Half Mount','local',922),
('Crocodile','Euro Skull','local',4627),
('Crocodile','Bleach Only','local',3924),
('Crocodile (Nile)','Full Mount','local',1844),
('Crocodile (Nile)','Half Mount','local',922),
('Crocodile (Nile)','Euro Skull','local',4627),
('Crocodile (Nile)','Bleach Only','local',3924),
('Duiker','Shoulder Mount','export',555),
('Duiker','Offset Shoulder Mount','export',640),
('Duiker','Pedestal Mount','export',585),
('Duiker','Full Mount','export',1130),
('Duiker','Half Mount','export',565),
('Duiker','Euro Skull','export',175),
('Duiker','Bleach Only','export',95),
('Duiker','Shoulder Mount','local',4886),
('Duiker','Pedestal Mount','local',6059),
('Duiker','Full Mount','local',11848),
('Duiker','Half Mount','local',5924),
('Duiker','Euro Skull','local',1413),
('Duiker','Bleach Only','local',1110),
('Duiker (Common)','Shoulder Mount','export',555),
('Duiker (Common)','Offset Shoulder Mount','export',640),
('Duiker (Common)','Pedestal Mount','export',585),
('Duiker (Common)','Full Mount','export',1130),
('Duiker (Common)','Half Mount','export',565),
('Duiker (Common)','Euro Skull','export',175),
('Duiker (Common)','Bleach Only','export',95),
('Duiker (Common)','Shoulder Mount','local',4886),
('Duiker (Common)','Pedestal Mount','local',6059),
('Duiker (Common)','Full Mount','local',11848),
('Duiker (Common)','Half Mount','local',5924),
('Duiker (Common)','Euro Skull','local',1413),
('Duiker (Common)','Bleach Only','local',1110),
('Duiker (Grey)','Shoulder Mount','export',555),
('Duiker (Grey)','Offset Shoulder Mount','export',640),
('Duiker (Grey)','Pedestal Mount','export',585),
('Duiker (Grey)','Full Mount','export',1130),
('Duiker (Grey)','Half Mount','export',565),
('Duiker (Grey)','Euro Skull','export',175),
('Duiker (Grey)','Bleach Only','export',95),
('Duiker (Grey)','Shoulder Mount','local',4886),
('Duiker (Grey)','Pedestal Mount','local',6059),
('Duiker (Grey)','Full Mount','local',11848),
('Duiker (Grey)','Half Mount','local',5924),
('Duiker (Grey)','Euro Skull','local',1413),
('Duiker (Grey)','Bleach Only','local',1110),
('Eland','Shoulder Mount','export',1155),
('Eland','Offset Shoulder Mount','export',1330),
('Eland','Pedestal Mount','export',1390),
('Eland','Full Mount','export',13860),
('Eland','Half Mount','export',6930),
('Eland','Euro Skull','export',355),
('Eland','Bleach Only','export',210),
('Eland','Shoulder Mount','local',11804),
('Eland','Pedestal Mount','local',15748),
('Eland','Full Mount','local',104497),
('Eland','Half Mount','local',52249),
('Eland','Euro Skull','local',3015),
('Eland','Bleach Only','local',2699),
('Eland (Common)','Shoulder Mount','export',1155),
('Eland (Common)','Offset Shoulder Mount','export',1330),
('Eland (Common)','Pedestal Mount','export',1390),
('Eland (Common)','Full Mount','export',13860),
('Eland (Common)','Half Mount','export',6930),
('Eland (Common)','Euro Skull','export',355),
('Eland (Common)','Bleach Only','export',210),
('Eland (Common)','Shoulder Mount','local',11804),
('Eland (Common)','Pedestal Mount','local',15748),
('Eland (Common)','Full Mount','local',104497),
('Eland (Common)','Half Mount','local',52249),
('Eland (Common)','Euro Skull','local',3015),
('Eland (Common)','Bleach Only','local',2699),
('Elephant','Shoulder Mount','export',15750),
('Elephant','Bleach Only','export',925),
('Elephant','Shoulder Mount','local',114484),
('Elephant','Pedestal Mount','local',138848),
('Elephant','Full Mount','local',809832),
('Elephant','Half Mount','local',404916),
('Fallow Deer','Shoulder Mount','export',695),
('Fallow Deer','Offset Shoulder Mount','export',800),
('Fallow Deer','Pedestal Mount','export',830),
('Fallow Deer','Full Mount','export',2890),
('Fallow Deer','Half Mount','export',1445),
('Fallow Deer','Euro Skull','export',235),
('Fallow Deer','Bleach Only','export',130),
('Fallow Deer','Shoulder Mount','local',6595),
('Fallow Deer','Pedestal Mount','local',8004),
('Fallow Deer','Full Mount','local',19476),
('Fallow Deer','Half Mount','local',9738),
('Fallow Deer','Euro Skull','local',1891),
('Fallow Deer','Bleach Only','local',1552),
('Gemsbok','Shoulder Mount','export',1040),
('Gemsbok','Offset Shoulder Mount','export',1195),
('Gemsbok','Pedestal Mount','export',1250),
('Gemsbok','Full Mount','export',3700),
('Gemsbok','Half Mount','export',1850),
('Gemsbok','Euro Skull','export',335),
('Gemsbok','Bleach Only','export',210),
('Gemsbok','Shoulder Mount','local',8547),
('Gemsbok','Pedestal Mount','local',10369),
('Gemsbok','Full Mount','local',41100),
('Gemsbok','Half Mount','local',20550),
('Gemsbok','Euro Skull','local',2498),
('Gemsbok','Bleach Only','local',2231),
('Genet','Full Mount','export',870),
('Genet','Half Mount','export',435),
('Genet','Euro Skull','export',160),
('Genet','Bleach Only','export',95),
('Genet','Full Mount','local',8538),
('Genet','Half Mount','local',4269),
('Genet','Euro Skull','local',1256),
('Genet','Bleach Only','local',1110),
('Genet (Small-spotted)','Full Mount','export',870),
('Genet (Small-spotted)','Half Mount','export',435),
('Genet (Small-spotted)','Euro Skull','export',160),
('Genet (Small-spotted)','Bleach Only','export',95),
('Genet (Small-spotted)','Full Mount','local',8538),
('Genet (Small-spotted)','Half Mount','local',4269),
('Genet (Small-spotted)','Euro Skull','local',1256),
('Genet (Small-spotted)','Bleach Only','local',1110),
('Genet Cat','Full Mount','export',870),
('Genet Cat','Half Mount','export',435),
('Genet Cat','Euro Skull','export',160),
('Genet Cat','Bleach Only','export',95),
('Genet Cat','Full Mount','local',8538),
('Genet Cat','Half Mount','local',4269),
('Genet Cat','Euro Skull','local',1256),
('Genet Cat','Bleach Only','local',1110),
('Giraffe','Shoulder Mount','export',4850),
('Giraffe','Offset Shoulder Mount','export',5580),
('Giraffe','Pedestal Mount','export',5820),
('Giraffe','Euro Skull','export',415),
('Giraffe','Bleach Only','export',255),
('Giraffe','Shoulder Mount','local',25179),
('Giraffe','Pedestal Mount','local',30537),
('Giraffe','Full Mount','local',130177),
('Giraffe','Half Mount','local',65089),
('Giraffe','Euro Skull','local',4766),
('Giraffe','Bleach Only','local',4191),
('Giraffe (Cape)','Shoulder Mount','export',4850),
('Giraffe (Cape)','Offset Shoulder Mount','export',5580),
('Giraffe (Cape)','Pedestal Mount','export',5820),
('Giraffe (Cape)','Euro Skull','export',415),
('Giraffe (Cape)','Bleach Only','export',255),
('Giraffe (Cape)','Shoulder Mount','local',25179),
('Giraffe (Cape)','Pedestal Mount','local',30537),
('Giraffe (Cape)','Full Mount','local',130177),
('Giraffe (Cape)','Half Mount','local',65089),
('Giraffe (Cape)','Euro Skull','local',4766),
('Giraffe (Cape)','Bleach Only','local',4191),
('Giraffe (Southern)','Shoulder Mount','export',4850),
('Giraffe (Southern)','Offset Shoulder Mount','export',5580),
('Giraffe (Southern)','Pedestal Mount','export',5820),
('Giraffe (Southern)','Euro Skull','export',415),
('Giraffe (Southern)','Bleach Only','export',255),
('Giraffe (Southern)','Shoulder Mount','local',25179),
('Giraffe (Southern)','Pedestal Mount','local',30537),
('Giraffe (Southern)','Full Mount','local',130177),
('Giraffe (Southern)','Half Mount','local',65089),
('Giraffe (Southern)','Euro Skull','local',4766),
('Giraffe (Southern)','Bleach Only','local',4191),
('Grey Rhebok','Shoulder Mount','export',580),
('Grey Rhebok','Offset Shoulder Mount','export',665),
('Grey Rhebok','Pedestal Mount','export',695),
('Grey Rhebok','Full Mount','export',980),
('Grey Rhebok','Half Mount','export',490),
('Grey Rhebok','Euro Skull','export',175),
('Grey Rhebok','Bleach Only','export',95),
('Grey Rhebok','Shoulder Mount','local',5486),
('Grey Rhebok','Pedestal Mount','local',6658),
('Grey Rhebok','Full Mount','local',13098),
('Grey Rhebok','Half Mount','local',6549),
('Grey Rhebok','Euro Skull','local',1413),
('Grey Rhebok','Bleach Only','local',1110),
('Grysbok','Shoulder Mount','export',440),
('Grysbok','Offset Shoulder Mount','export',505),
('Grysbok','Pedestal Mount','export',530),
('Grysbok','Full Mount','export',750),
('Grysbok','Half Mount','export',375),
('Grysbok','Euro Skull','export',160),
('Grysbok','Bleach Only','export',95),
('Grysbok','Shoulder Mount','local',4678),
('Grysbok','Pedestal Mount','local',5670),
('Grysbok','Full Mount','local',10830),
('Grysbok','Half Mount','local',5415),
('Grysbok','Euro Skull','local',1413),
('Grysbok','Bleach Only','local',1110),
('Grysbok (Cape)','Shoulder Mount','export',440),
('Grysbok (Cape)','Offset Shoulder Mount','export',505),
('Grysbok (Cape)','Pedestal Mount','export',530),
('Grysbok (Cape)','Full Mount','export',750),
('Grysbok (Cape)','Half Mount','export',375),
('Grysbok (Cape)','Euro Skull','export',160),
('Grysbok (Cape)','Bleach Only','export',95),
('Grysbok (Cape)','Shoulder Mount','local',4678),
('Grysbok (Cape)','Pedestal Mount','local',5670),
('Grysbok (Cape)','Full Mount','local',10830),
('Grysbok (Cape)','Half Mount','local',5415),
('Grysbok (Cape)','Euro Skull','local',1413),
('Grysbok (Cape)','Bleach Only','local',1110),
('Hartebeest','Shoulder Mount','export',925),
('Hartebeest','Offset Shoulder Mount','export',1060),
('Hartebeest','Pedestal Mount','export',1110),
('Hartebeest','Full Mount','export',3696),
('Hartebeest','Half Mount','export',1848),
('Hartebeest','Euro Skull','export',310),
('Hartebeest','Bleach Only','export',185),
('Hartebeest','Shoulder Mount','local',7866),
('Hartebeest','Pedestal Mount','local',9539),
('Hartebeest','Full Mount','local',36177),
('Hartebeest','Half Mount','local',18089),
('Hartebeest','Euro Skull','local',2498),
('Hartebeest','Bleach Only','local',1547),
('Hartebeest (Red)','Shoulder Mount','export',925),
('Hartebeest (Red)','Offset Shoulder Mount','export',1060),
('Hartebeest (Red)','Pedestal Mount','export',1110),
('Hartebeest (Red)','Full Mount','export',3696),
('Hartebeest (Red)','Half Mount','export',1848),
('Hartebeest (Red)','Euro Skull','export',310),
('Hartebeest (Red)','Bleach Only','export',185),
('Hartebeest (Red)','Shoulder Mount','local',7866),
('Hartebeest (Red)','Pedestal Mount','local',9539),
('Hartebeest (Red)','Full Mount','local',36177),
('Hartebeest (Red)','Half Mount','local',18089),
('Hartebeest (Red)','Euro Skull','local',2498),
('Hartebeest (Red)','Bleach Only','local',1547),
('Hippo','Shoulder Mount','export',4465),
('Hippo','Euro Skull','export',750),
('Hippo','Bleach Only','export',390),
('Hippo','Shoulder Mount','local',33206),
('Hippo','Pedestal Mount','local',40276),
('Hippo','Full Mount','local',185109),
('Hippo','Half Mount','local',92555),
('Hippo','Euro Skull','local',8526),
('Hippo','Bleach Only','local',5525),
('Hyena','Shoulder Mount','export',695),
('Hyena','Offset Shoulder Mount','export',800),
('Hyena','Pedestal Mount','export',830),
('Hyena','Full Mount','export',2890),
('Hyena','Half Mount','export',1445),
('Hyena','Euro Skull','export',290),
('Hyena','Bleach Only','export',185),
('Hyena','Shoulder Mount','local',10314),
('Hyena','Pedestal Mount','local',12516),
('Hyena','Full Mount','local',26561),
('Hyena','Half Mount','local',13281),
('Hyena','Euro Skull','local',2881),
('Hyena','Bleach Only','local',2244),
('Hyena (Spotted)','Shoulder Mount','export',695),
('Hyena (Spotted)','Offset Shoulder Mount','export',800),
('Hyena (Spotted)','Pedestal Mount','export',830),
('Hyena (Spotted)','Full Mount','export',2890),
('Hyena (Spotted)','Half Mount','export',1445),
('Hyena (Spotted)','Euro Skull','export',290),
('Hyena (Spotted)','Bleach Only','export',185),
('Hyena (Spotted)','Shoulder Mount','local',10314),
('Hyena (Spotted)','Pedestal Mount','local',12516),
('Hyena (Spotted)','Full Mount','local',26561),
('Hyena (Spotted)','Half Mount','local',13281),
('Hyena (Spotted)','Euro Skull','local',2881),
('Hyena (Spotted)','Bleach Only','local',2244),
('Impala','Shoulder Mount','export',750),
('Impala','Offset Shoulder Mount','export',865),
('Impala','Pedestal Mount','export',900),
('Impala','Full Mount','export',1620),
('Impala','Half Mount','export',810),
('Impala','Euro Skull','export',235),
('Impala','Bleach Only','export',130),
('Impala','Shoulder Mount','local',6595),
('Impala','Pedestal Mount','local',8004),
('Impala','Full Mount','local',19489),
('Impala','Half Mount','local',9745),
('Impala','Euro Skull','local',1891),
('Impala','Bleach Only','local',1552),
('Jackal','Shoulder Mount','export',555),
('Jackal','Offset Shoulder Mount','export',640),
('Jackal','Pedestal Mount','export',665),
('Jackal','Full Mount','export',1075),
('Jackal','Half Mount','export',538),
('Jackal','Euro Skull','export',175),
('Jackal','Bleach Only','export',95),
('Jackal','Shoulder Mount','local',4585),
('Jackal','Pedestal Mount','local',5566),
('Jackal','Full Mount','local',12625),
('Jackal','Half Mount','local',6313),
('Jackal','Euro Skull','local',1413),
('Jackal','Bleach Only','local',1110),
('Jackal (Black-backed)','Shoulder Mount','export',555),
('Jackal (Black-backed)','Offset Shoulder Mount','export',640),
('Jackal (Black-backed)','Pedestal Mount','export',665),
('Jackal (Black-backed)','Full Mount','export',1075),
('Jackal (Black-backed)','Half Mount','export',538),
('Jackal (Black-backed)','Euro Skull','export',175),
('Jackal (Black-backed)','Bleach Only','export',95),
('Jackal (Black-backed)','Shoulder Mount','local',4585),
('Jackal (Black-backed)','Pedestal Mount','local',5566),
('Jackal (Black-backed)','Full Mount','local',12625),
('Jackal (Black-backed)','Half Mount','local',6313),
('Jackal (Black-backed)','Euro Skull','local',1413),
('Jackal (Black-backed)','Bleach Only','local',1110),
('Klipspringer','Shoulder Mount','export',555),
('Klipspringer','Offset Shoulder Mount','export',640),
('Klipspringer','Pedestal Mount','export',665),
('Klipspringer','Full Mount','export',1130),
('Klipspringer','Half Mount','export',565),
('Klipspringer','Euro Skull','export',175),
('Klipspringer','Bleach Only','export',95),
('Klipspringer','Shoulder Mount','local',4886),
('Klipspringer','Pedestal Mount','local',5937),
('Klipspringer','Full Mount','local',11837),
('Klipspringer','Half Mount','local',5919),
('Klipspringer','Euro Skull','local',1413),
('Klipspringer','Bleach Only','local',1110),
('Kudu','Shoulder Mount','export',1040),
('Kudu','Offset Shoulder Mount','export',1195),
('Kudu','Pedestal Mount','export',1250),
('Kudu','Full Mount','export',5200),
('Kudu','Half Mount','export',2600),
('Kudu','Euro Skull','export',290),
('Kudu','Bleach Only','export',185),
('Kudu','Shoulder Mount','local',10614),
('Kudu','Pedestal Mount','local',12874),
('Kudu','Full Mount','local',48668),
('Kudu','Half Mount','local',24334),
('Kudu','Euro Skull','local',2498),
('Kudu','Bleach Only','local',2231),
('Kudu (Greater)','Shoulder Mount','export',1040),
('Kudu (Greater)','Offset Shoulder Mount','export',1195),
('Kudu (Greater)','Pedestal Mount','export',1250),
('Kudu (Greater)','Full Mount','export',5200),
('Kudu (Greater)','Half Mount','export',2600),
('Kudu (Greater)','Euro Skull','export',290),
('Kudu (Greater)','Bleach Only','export',185),
('Kudu (Greater)','Shoulder Mount','local',10614),
('Kudu (Greater)','Pedestal Mount','local',12874),
('Kudu (Greater)','Full Mount','local',48668),
('Kudu (Greater)','Half Mount','local',24334),
('Kudu (Greater)','Euro Skull','local',2498),
('Kudu (Greater)','Bleach Only','local',2231),
('Lechwe','Shoulder Mount','local',8547),
('Lechwe','Pedestal Mount','local',10369),
('Lechwe','Full Mount','local',36177),
('Lechwe','Half Mount','local',18089),
('Lechwe','Euro Skull','local',2498),
('Lechwe','Bleach Only','local',1547),
('Lechwe (Red)','Shoulder Mount','local',8547),
('Lechwe (Red)','Pedestal Mount','local',10369),
('Lechwe (Red)','Full Mount','local',36177),
('Lechwe (Red)','Half Mount','local',18089),
('Lechwe (Red)','Euro Skull','local',2498),
('Lechwe (Red)','Bleach Only','local',1547),
('Leopard','Shoulder Mount','export',1675),
('Leopard','Full Mount','export',4040),
('Leopard','Half Mount','export',2020),
('Leopard','Euro Skull','export',245),
('Leopard','Bleach Only','export',140),
('Leopard','Shoulder Mount','local',12370),
('Leopard','Pedestal Mount','local',15009),
('Leopard','Full Mount','local',40464),
('Leopard','Half Mount','local',20232),
('Leopard','Euro Skull','local',3311),
('Leopard','Bleach Only','local',2881),
('Lion','Shoulder Mount','export',1675),
('Lion','Pedestal Mount','export',2010),
('Lion','Full Mount','export',6355),
('Lion','Half Mount','export',3178),
('Lion','Euro Skull','export',315),
('Lion','Bleach Only','export',200),
('Lion','Shoulder Mount','local',17510),
('Lion','Pedestal Mount','local',21235),
('Lion','Full Mount','local',58830),
('Lion','Half Mount','local',29415),
('Lion','Euro Skull','local',4712),
('Lion','Bleach Only','local',4184),
('Nyala','Shoulder Mount','export',810),
('Nyala','Offset Shoulder Mount','export',930),
('Nyala','Pedestal Mount','export',970),
('Nyala','Full Mount','export',3465),
('Nyala','Half Mount','export',1733),
('Nyala','Euro Skull','export',245),
('Nyala','Bleach Only','export',140),
('Nyala','Shoulder Mount','local',8547),
('Nyala','Pedestal Mount','local',10369),
('Nyala','Full Mount','local',35607),
('Nyala','Half Mount','local',17804),
('Nyala','Euro Skull','local',2498),
('Nyala','Bleach Only','local',1547),
('Oribi','Shoulder Mount','export',580),
('Oribi','Offset Shoulder Mount','export',665),
('Oribi','Pedestal Mount','export',695),
('Oribi','Full Mount','export',980),
('Oribi','Half Mount','export',490),
('Oribi','Euro Skull','export',175),
('Oribi','Bleach Only','export',95),
('Oribi','Shoulder Mount','local',5486),
('Oribi','Pedestal Mount','local',6658),
('Oribi','Full Mount','local',13098),
('Oribi','Half Mount','local',6549),
('Oribi','Euro Skull','local',1413),
('Oribi','Bleach Only','local',1110),
('Ostrich','Shoulder Mount','local',5532),
('Ostrich','Pedestal Mount','local',6713),
('Ostrich','Full Mount','local',31617),
('Ostrich','Half Mount','local',15809),
('Ostrich','Euro Skull','local',1413),
('Ostrich','Bleach Only','local',609),
('Plains Zebra','Shoulder Mount','export',1100),
('Plains Zebra','Offset Shoulder Mount','export',1265),
('Plains Zebra','Pedestal Mount','export',1315),
('Plains Zebra','Full Mount','export',4390),
('Plains Zebra','Half Mount','export',2195),
('Plains Zebra','Euro Skull','export',355),
('Plains Zebra','Bleach Only','export',210),
('Plains Zebra','Shoulder Mount','local',8709),
('Plains Zebra','Pedestal Mount','local',10563),
('Plains Zebra','Full Mount','local',40731),
('Plains Zebra','Half Mount','local',20366),
('Plains Zebra','Euro Skull','local',2692),
('Plains Zebra','Bleach Only','local',2226),
('Reedbuck (Common)','Shoulder Mount','export',695),
('Reedbuck (Common)','Offset Shoulder Mount','export',800),
('Reedbuck (Common)','Pedestal Mount','export',830),
('Reedbuck (Common)','Full Mount','export',2020),
('Reedbuck (Common)','Half Mount','export',1010),
('Reedbuck (Common)','Euro Skull','export',235),
('Reedbuck (Common)','Bleach Only','export',130),
('Reedbuck (Common)','Shoulder Mount','local',7473),
('Reedbuck (Common)','Pedestal Mount','local',9071),
('Reedbuck (Common)','Full Mount','local',32763),
('Reedbuck (Common)','Half Mount','local',16382),
('Reedbuck (Common)','Euro Skull','local',1891),
('Reedbuck (Common)','Bleach Only','local',1547),
('Reedbuck (Mountain)','Shoulder Mount','export',635),
('Reedbuck (Mountain)','Offset Shoulder Mount','export',730),
('Reedbuck (Mountain)','Pedestal Mount','export',765),
('Reedbuck (Mountain)','Full Mount','export',1100),
('Reedbuck (Mountain)','Half Mount','export',550),
('Reedbuck (Mountain)','Euro Skull','export',175),
('Reedbuck (Mountain)','Bleach Only','export',95),
('Reedbuck (Mountain)','Shoulder Mount','local',5486),
('Reedbuck (Mountain)','Pedestal Mount','local',6658),
('Reedbuck (Mountain)','Full Mount','local',13098),
('Reedbuck (Mountain)','Half Mount','local',6549),
('Reedbuck (Mountain)','Euro Skull','local',1565),
('Reedbuck (Mountain)','Bleach Only','local',1346),
('Reedbuck (Vaal)','Shoulder Mount','export',580),
('Reedbuck (Vaal)','Offset Shoulder Mount','export',665),
('Reedbuck (Vaal)','Pedestal Mount','export',695),
('Reedbuck (Vaal)','Full Mount','export',980),
('Reedbuck (Vaal)','Half Mount','export',490),
('Reedbuck (Vaal)','Euro Skull','export',175),
('Reedbuck (Vaal)','Bleach Only','export',95),
('Reedbuck (Vaal)','Shoulder Mount','local',5486),
('Reedbuck (Vaal)','Pedestal Mount','local',6658),
('Reedbuck (Vaal)','Full Mount','local',13098),
('Reedbuck (Vaal)','Half Mount','local',6549),
('Reedbuck (Vaal)','Euro Skull','local',1413),
('Reedbuck (Vaal)','Bleach Only','local',1110),
('Rhebok (Grey / Vaal)','Shoulder Mount','export',580),
('Rhebok (Grey / Vaal)','Offset Shoulder Mount','export',665),
('Rhebok (Grey / Vaal)','Pedestal Mount','export',695),
('Rhebok (Grey / Vaal)','Full Mount','export',980),
('Rhebok (Grey / Vaal)','Half Mount','export',490),
('Rhebok (Grey / Vaal)','Euro Skull','export',175),
('Rhebok (Grey / Vaal)','Bleach Only','export',95),
('Rhebok (Grey / Vaal)','Shoulder Mount','local',5486),
('Rhebok (Grey / Vaal)','Pedestal Mount','local',6658),
('Rhebok (Grey / Vaal)','Full Mount','local',13098),
('Rhebok (Grey / Vaal)','Half Mount','local',6549),
('Rhebok (Grey / Vaal)','Euro Skull','local',1413),
('Rhebok (Grey / Vaal)','Bleach Only','local',1110),
('Sable','Shoulder Mount','export',1040),
('Sable','Offset Shoulder Mount','export',1195),
('Sable','Pedestal Mount','export',1250),
('Sable','Full Mount','export',4390),
('Sable','Half Mount','export',2195),
('Sable','Euro Skull','export',310),
('Sable','Bleach Only','export',185),
('Sable','Shoulder Mount','local',10614),
('Sable','Pedestal Mount','local',12874),
('Sable','Full Mount','local',48668),
('Sable','Half Mount','local',24334),
('Sable','Euro Skull','local',2881),
('Sable','Bleach Only','local',2578),
('Serval','Full Mount','export',1215),
('Serval','Half Mount','export',608),
('Serval','Euro Skull','export',175),
('Serval','Bleach Only','export',95),
('Serval','Full Mount','local',12874),
('Serval','Half Mount','local',6437),
('Serval','Euro Skull','local',1413),
('Serval','Bleach Only','local',1110),
('Springbok','Shoulder Mount','export',695),
('Springbok','Offset Shoulder Mount','export',800),
('Springbok','Pedestal Mount','export',830),
('Springbok','Full Mount','export',2020),
('Springbok','Half Mount','export',1010),
('Springbok','Euro Skull','export',235),
('Springbok','Bleach Only','export',130),
('Springbok','Shoulder Mount','local',5486),
('Springbok','Pedestal Mount','local',6658),
('Springbok','Full Mount','local',14415),
('Springbok','Half Mount','local',7208),
('Springbok','Euro Skull','local',1680),
('Springbok','Bleach Only','local',1110),
('Steenbok','Shoulder Mount','export',555),
('Steenbok','Offset Shoulder Mount','export',640),
('Steenbok','Pedestal Mount','export',585),
('Steenbok','Full Mount','export',1130),
('Steenbok','Half Mount','export',565),
('Steenbok','Euro Skull','export',175),
('Steenbok','Bleach Only','export',95),
('Steenbok','Shoulder Mount','local',4886),
('Steenbok','Pedestal Mount','local',5937),
('Steenbok','Full Mount','local',11837),
('Steenbok','Half Mount','local',5919),
('Steenbok','Euro Skull','local',1413),
('Steenbok','Bleach Only','local',1110),
('Tsessebe','Shoulder Mount','export',810),
('Tsessebe','Offset Shoulder Mount','export',930),
('Tsessebe','Pedestal Mount','export',970),
('Tsessebe','Full Mount','export',2080),
('Tsessebe','Half Mount','export',1040),
('Tsessebe','Euro Skull','export',290),
('Tsessebe','Bleach Only','export',185),
('Tsessebe','Shoulder Mount','local',6849),
('Tsessebe','Pedestal Mount','local',8314),
('Tsessebe','Full Mount','local',19786),
('Tsessebe','Half Mount','local',9893),
('Tsessebe','Euro Skull','local',2498),
('Tsessebe','Bleach Only','local',1547),
('Vaal Rhebok','Shoulder Mount','export',580),
('Vaal Rhebok','Offset Shoulder Mount','export',665),
('Vaal Rhebok','Pedestal Mount','export',695),
('Vaal Rhebok','Full Mount','export',980),
('Vaal Rhebok','Half Mount','export',490),
('Vaal Rhebok','Euro Skull','export',175),
('Vaal Rhebok','Bleach Only','export',95),
('Vaal Rhebok','Shoulder Mount','local',5486),
('Vaal Rhebok','Pedestal Mount','local',6658),
('Vaal Rhebok','Full Mount','local',13098),
('Vaal Rhebok','Half Mount','local',6549),
('Vaal Rhebok','Euro Skull','local',1413),
('Vaal Rhebok','Bleach Only','local',1110),
('Vervet Monkey','Full Mount','export',665),
('Vervet Monkey','Half Mount','export',333),
('Vervet Monkey','Euro Skull','export',160),
('Vervet Monkey','Bleach Only','export',95),
('Vervet Monkey','Full Mount','local',7951),
('Vervet Monkey','Half Mount','local',3976),
('Vervet Monkey','Euro Skull','local',1413),
('Vervet Monkey','Bleach Only','local',1110),
('Warthog','Shoulder Mount','export',695),
('Warthog','Offset Shoulder Mount','export',800),
('Warthog','Pedestal Mount','export',830),
('Warthog','Full Mount','export',1620),
('Warthog','Half Mount','export',810),
('Warthog','Euro Skull','export',315),
('Warthog','Bleach Only','export',200),
('Warthog','Shoulder Mount','local',5775),
('Warthog','Pedestal Mount','local',7005),
('Warthog','Full Mount','local',15051),
('Warthog','Half Mount','local',7526),
('Warthog','Euro Skull','local',2498),
('Warthog','Bleach Only','local',1547),
('Warthog (Common)','Shoulder Mount','export',695),
('Warthog (Common)','Offset Shoulder Mount','export',800),
('Warthog (Common)','Pedestal Mount','export',830),
('Warthog (Common)','Full Mount','export',1620),
('Warthog (Common)','Half Mount','export',810),
('Warthog (Common)','Euro Skull','export',315),
('Warthog (Common)','Bleach Only','export',200),
('Warthog (Common)','Shoulder Mount','local',5775),
('Warthog (Common)','Pedestal Mount','local',7005),
('Warthog (Common)','Full Mount','local',15051),
('Warthog (Common)','Half Mount','local',7526),
('Warthog (Common)','Euro Skull','local',2498),
('Warthog (Common)','Bleach Only','local',1547),
('Waterbuck','Shoulder Mount','export',1040),
('Waterbuck','Offset Shoulder Mount','export',1195),
('Waterbuck','Pedestal Mount','export',1250),
('Waterbuck','Full Mount','export',4045),
('Waterbuck','Half Mount','export',2023),
('Waterbuck','Euro Skull','export',290),
('Waterbuck','Bleach Only','export',185),
('Waterbuck','Shoulder Mount','local',9009),
('Waterbuck','Pedestal Mount','local',10927),
('Waterbuck','Full Mount','local',41100),
('Waterbuck','Half Mount','local',20550),
('Waterbuck','Euro Skull','local',2498),
('Waterbuck','Bleach Only','local',2226),
('Waterbuck (Common)','Shoulder Mount','export',1040),
('Waterbuck (Common)','Offset Shoulder Mount','export',1195),
('Waterbuck (Common)','Pedestal Mount','export',1250),
('Waterbuck (Common)','Full Mount','export',4045),
('Waterbuck (Common)','Half Mount','export',2023),
('Waterbuck (Common)','Euro Skull','export',290),
('Waterbuck (Common)','Bleach Only','export',185),
('Waterbuck (Common)','Shoulder Mount','local',9009),
('Waterbuck (Common)','Pedestal Mount','local',10927),
('Waterbuck (Common)','Full Mount','local',41100),
('Waterbuck (Common)','Half Mount','local',20550),
('Waterbuck (Common)','Euro Skull','local',2498),
('Waterbuck (Common)','Bleach Only','local',2226),
('Wild Cat','Full Mount','export',780),
('Wild Cat','Half Mount','export',390),
('Wild Cat','Euro Skull','export',160),
('Wild Cat','Bleach Only','export',95),
('Wild Cat','Full Mount','local',7951),
('Wild Cat','Half Mount','local',3976),
('Wild Cat','Euro Skull','local',1413),
('Wild Cat','Bleach Only','local',1110),
('Wild cat (African)','Full Mount','export',780),
('Wild cat (African)','Half Mount','export',390),
('Wild cat (African)','Euro Skull','export',160),
('Wild cat (African)','Bleach Only','export',95),
('Wild cat (African)','Full Mount','local',7951),
('Wild cat (African)','Half Mount','local',3976),
('Wild cat (African)','Euro Skull','local',1413),
('Wild cat (African)','Bleach Only','local',1110),
('Wildcat','Full Mount','export',780),
('Wildcat','Half Mount','export',390),
('Wildcat','Euro Skull','export',160),
('Wildcat','Bleach Only','export',95),
('Wildcat','Full Mount','local',7951),
('Wildcat','Half Mount','local',3976),
('Wildcat','Euro Skull','local',1413),
('Wildcat','Bleach Only','local',1110),
('Wildebeest (Black)','Shoulder Mount','export',810),
('Wildebeest (Black)','Offset Shoulder Mount','export',930),
('Wildebeest (Black)','Pedestal Mount','export',970),
('Wildebeest (Black)','Full Mount','export',3240),
('Wildebeest (Black)','Half Mount','export',1620),
('Wildebeest (Black)','Euro Skull','export',290),
('Wildebeest (Black)','Bleach Only','export',185),
('Wildebeest (Black)','Shoulder Mount','local',8547),
('Wildebeest (Black)','Pedestal Mount','local',10369),
('Wildebeest (Black)','Full Mount','local',36183),
('Wildebeest (Black)','Half Mount','local',18092),
('Wildebeest (Black)','Euro Skull','local',2498),
('Wildebeest (Black)','Bleach Only','local',2226),
('Wildebeest (Blue)','Shoulder Mount','export',980),
('Wildebeest (Blue)','Offset Shoulder Mount','export',1130),
('Wildebeest (Blue)','Pedestal Mount','export',1180),
('Wildebeest (Blue)','Full Mount','export',4045),
('Wildebeest (Blue)','Half Mount','export',2023),
('Wildebeest (Blue)','Euro Skull','export',310),
('Wildebeest (Blue)','Bleach Only','export',185),
('Wildebeest (Blue)','Shoulder Mount','local',9009),
('Wildebeest (Blue)','Pedestal Mount','local',10927),
('Wildebeest (Blue)','Full Mount','local',41100),
('Wildebeest (Blue)','Half Mount','local',20550),
('Wildebeest (Blue)','Euro Skull','local',2615),
('Wildebeest (Blue)','Bleach Only','local',2226),
('Zebra','Shoulder Mount','export',1100),
('Zebra','Offset Shoulder Mount','export',1265),
('Zebra','Pedestal Mount','export',1315),
('Zebra','Full Mount','export',4390),
('Zebra','Half Mount','export',2195),
('Zebra','Euro Skull','export',355),
('Zebra','Bleach Only','export',210),
('Zebra','Shoulder Mount','local',8709),
('Zebra','Pedestal Mount','local',10563),
('Zebra','Full Mount','local',40731),
('Zebra','Half Mount','local',20366),
('Zebra','Euro Skull','local',2692),
('Zebra','Bleach Only','local',2226),
('Zebra (Burchell''s)','Shoulder Mount','export',1100),
('Zebra (Burchell''s)','Offset Shoulder Mount','export',1265),
('Zebra (Burchell''s)','Pedestal Mount','export',1315),
('Zebra (Burchell''s)','Full Mount','export',4390),
('Zebra (Burchell''s)','Half Mount','export',2195),
('Zebra (Burchell''s)','Euro Skull','export',355),
('Zebra (Burchell''s)','Bleach Only','export',210),
('Zebra (Burchell''s)','Shoulder Mount','local',8709),
('Zebra (Burchell''s)','Pedestal Mount','local',10563),
('Zebra (Burchell''s)','Full Mount','local',40731),
('Zebra (Burchell''s)','Half Mount','local',20366),
('Zebra (Burchell''s)','Euro Skull','local',2692),
('Zebra (Burchell''s)','Bleach Only','local',2226),
('Zebra (Cape)','Shoulder Mount','export',1100),
('Zebra (Cape)','Offset Shoulder Mount','export',1265),
('Zebra (Cape)','Pedestal Mount','export',1315),
('Zebra (Cape)','Full Mount','export',4390),
('Zebra (Cape)','Half Mount','export',2195),
('Zebra (Cape)','Euro Skull','export',355),
('Zebra (Cape)','Bleach Only','export',210),
('Zebra (Cape)','Shoulder Mount','local',8709),
('Zebra (Cape)','Pedestal Mount','local',10563),
('Zebra (Cape)','Full Mount','local',40731),
('Zebra (Cape)','Half Mount','local',20366),
('Zebra (Cape)','Euro Skull','local',2692),
('Zebra (Cape)','Bleach Only','local',2226),
('Zebra (Plains)','Shoulder Mount','export',1100),
('Zebra (Plains)','Offset Shoulder Mount','export',1265),
('Zebra (Plains)','Pedestal Mount','export',1315),
('Zebra (Plains)','Full Mount','export',4390),
('Zebra (Plains)','Half Mount','export',2195),
('Zebra (Plains)','Euro Skull','export',355),
('Zebra (Plains)','Bleach Only','export',210),
('Zebra (Plains)','Shoulder Mount','local',8709),
('Zebra (Plains)','Pedestal Mount','local',10563),
('Zebra (Plains)','Full Mount','local',40731),
('Zebra (Plains)','Half Mount','local',20366),
('Zebra (Plains)','Euro Skull','local',2692),
('Zebra (Plains)','Bleach Only','local',2226)
on conflict (species, mount, client_type) do update set price = excluded.price;

-- Check (should say true):
select count(*) > 800 as proforma_cart_ready from mount_prices;
