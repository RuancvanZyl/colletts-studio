# Collett's Studio — Setup Guide

## 1. Install Node.js

Download and install from https://nodejs.org (choose the LTS version).

After installing, open Terminal and verify:
```
node --version
npm --version
```

## 2. Install pnpm (the package manager this project uses)

```bash
npm install -g pnpm
```

## 3. Install project dependencies

```bash
cd ~/colletts-studio
pnpm install
```

## 4. Create a Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **New project**
3. Choose a name (e.g. `colletts-studio`) and a strong database password
4. Wait ~2 minutes for it to provision
5. Go to **Project Settings → API**
6. Copy your **Project URL** and **anon public** key

## 5. Set up your environment variables

```bash
cd ~/colletts-studio
cp .env.example .env
```

Open `.env` and fill in:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...your-anon-key...
```

## 6. Run the database migrations

In Supabase dashboard → **SQL Editor**, run each file in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_views_and_functions.sql`

Copy and paste each file's contents into the SQL editor and click **Run**.

## 7. Set up Supabase Storage (for photos)

In Supabase dashboard → **Storage**:
1. Create a bucket called `attachments`
2. Set it to **Private** (the app uploads via signed URLs)

## 8. Create your first admin user

In Supabase dashboard → **Authentication → Users → Invite user**:
- Enter your email address
- After signing up via the email link, go to **SQL Editor** and run:

```sql
insert into staff_profiles (id, full_name, role)
values (
  (select id from auth.users where email = 'your@email.com'),
  'Your Name',
  'admin'
);
```

## 9. Start the app

```bash
cd ~/colletts-studio
pnpm dev
```

Open http://localhost:5173 in your browser.

---

## What's been built

- Full database schema (all tables, indexes, RLS policies)
- Production gate trigger (deposit + received → starts clock automatically)
- Alert detection view (overdue, stalled, missing dates)
- TypeScript types for the entire database
- Supabase client wired into the app

## What's next (in order)

1. **Auth integration** — replace the mock login with real Supabase auth
2. **Client & specimen data layer** — swap mock data for real DB calls
3. **Receiving sheet** — ground staff mobile form with photo upload
4. **Job tracking** — phase transitions with checkpoint enforcement
5. **SLA alerts dashboard panel**
6. **Invoicing & PayFast**
