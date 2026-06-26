-- Migration 016: Staff user accounts
-- Run without RLS in Supabase SQL Editor
-- Temp password for all: Apex2026!  (staff must change on first login)

DO $$
DECLARE
  v_abri    uuid := gen_random_uuid();
  v_steve   uuid := gen_random_uuid();
  v_vince   uuid := gen_random_uuid();
  v_divine  uuid := gen_random_uuid();
  v_emanuel uuid := gen_random_uuid();
  v_kyle    uuid := gen_random_uuid();
  v_cecilia uuid := gen_random_uuid();
BEGIN

  -- ── Create auth users ────────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    aud, role
  ) VALUES
    (v_abri,    '00000000-0000-0000-0000-000000000000', 'abri@apextrophy.co.za',
     crypt('Apex2026!', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated'),

    (v_steve,   '00000000-0000-0000-0000-000000000000', 'steve@apextrophy.co.za',
     crypt('Apex2026!', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated'),

    (v_vince,   '00000000-0000-0000-0000-000000000000', 'vince@apextrophy.co.za',
     crypt('Apex2026!', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated'),

    (v_divine,  '00000000-0000-0000-0000-000000000000', 'divine@apextrophy.co.za',
     crypt('Apex2026!', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated'),

    (v_emanuel, '00000000-0000-0000-0000-000000000000', 'emanuel@apextrophy.co.za',
     crypt('Apex2026!', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated'),

    (v_kyle,    '00000000-0000-0000-0000-000000000000', 'kyle@apextrophy.co.za',
     crypt('Apex2026!', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated'),

    (v_cecilia, '00000000-0000-0000-0000-000000000000', 'cecilia@apextrophy.co.za',
     crypt('Apex2026!', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated');

  -- ── Create identities (required for email login) ─────────────────────────
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
  VALUES
    (gen_random_uuid(), v_abri,    jsonb_build_object('sub', v_abri::text,    'email', 'abri@apextrophy.co.za'),    'email', now(), now(), now(), 'abri@apextrophy.co.za'),
    (gen_random_uuid(), v_steve,   jsonb_build_object('sub', v_steve::text,   'email', 'steve@apextrophy.co.za'),   'email', now(), now(), now(), 'steve@apextrophy.co.za'),
    (gen_random_uuid(), v_vince,   jsonb_build_object('sub', v_vince::text,   'email', 'vince@apextrophy.co.za'),   'email', now(), now(), now(), 'vince@apextrophy.co.za'),
    (gen_random_uuid(), v_divine,  jsonb_build_object('sub', v_divine::text,  'email', 'divine@apextrophy.co.za'),  'email', now(), now(), now(), 'divine@apextrophy.co.za'),
    (gen_random_uuid(), v_emanuel, jsonb_build_object('sub', v_emanuel::text, 'email', 'emanuel@apextrophy.co.za'), 'email', now(), now(), now(), 'emanuel@apextrophy.co.za'),
    (gen_random_uuid(), v_kyle,    jsonb_build_object('sub', v_kyle::text,    'email', 'kyle@apextrophy.co.za'),    'email', now(), now(), now(), 'kyle@apextrophy.co.za'),
    (gen_random_uuid(), v_cecilia, jsonb_build_object('sub', v_cecilia::text, 'email', 'cecilia@apextrophy.co.za'), 'email', now(), now(), now(), 'cecilia@apextrophy.co.za');

  -- ── Create staff profiles ─────────────────────────────────────────────────
  INSERT INTO staff_profiles (id, full_name, role, is_active)
  VALUES
    (v_abri,    'Abri',    'studio_manager', true),
    (v_steve,   'Steve',   'studio_manager', true),
    (v_vince,   'Vince',   'taxidermist',    true),
    (v_divine,  'Divine',  'taxidermist',    true),
    (v_emanuel, 'Emanuel', 'taxidermist',    true),
    (v_kyle,    'Kyle',    'taxidermist',    true),
    (v_cecilia, 'Cecilia', 'admin',          true);

END $$;
