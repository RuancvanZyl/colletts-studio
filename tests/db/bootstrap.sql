CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.uid', true), '')::uuid $$;
CREATE ROLE authenticated; CREATE ROLE anon;
CREATE TABLE public.staff_profiles (id uuid PRIMARY KEY, full_name text, role text NOT NULL DEFAULT 'department_staff', is_active boolean NOT NULL DEFAULT true, department_id uuid, email text);
CREATE TABLE public.clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, auth_user_id uuid);
CREATE TABLE public.client_hunts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES public.clients(id));
CREATE TABLE public.hunt_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hunt_id uuid REFERENCES public.client_hunts(id), doc_type text, title text,
  status text DEFAULT 'in_progress', current_department text, form_data jsonb DEFAULT '{}', assigned_to uuid REFERENCES public.staff_profiles(id),
  admin_notes text, last_moved_at timestamptz, completion_notes text);
CREATE TABLE public.client_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES public.clients(id), hunt_id uuid REFERENCES public.client_hunts(id),
  direction text NOT NULL, channel text DEFAULT 'email', subject text, body text NOT NULL, html_body text, sent_by uuid REFERENCES public.staff_profiles(id),
  from_email text, status text DEFAULT 'sent', read_at timestamptz, sent_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now());
ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all_messages ON public.client_messages FOR ALL USING (EXISTS (SELECT 1 FROM public.staff_profiles WHERE id = auth.uid() AND is_active));
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
