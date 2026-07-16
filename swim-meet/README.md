# Open Water Timing

A standalone registration + race-day timing platform for open water swim
events, similar in spirit to Hy-Tek Meet Manager but web-based. It lives in
this repo as an **isolated app** — its own `package.json`, its own Supabase
project, its own deployment. It shares no code, database, or credentials with
the Apex Trophy Solutions / Collett's Studio taxidermy app one directory up.

## What it does

1. **Registration** — swimmers browse open events, pick a race, and register.
   Each registration gets a guaranteed-unique race number (bib), assigned
   atomically by the database so concurrent sign-ups can never collide.
2. **Confirmation** — swimmers see their bib number and race details
   immediately after registering.
3. **Chip assignment** — on race day, staff scan (or type) a timing chip code
   and link it to a swimmer's bib at the front desk.
4. **Start-zone scan-in** — swimmers scan their chip as they enter the funnel
   / water, marking them present and ready.
5. **Start control** — a countdown timer, then a gun. The **gun time is set
   by the database's server clock**, not any device's local clock, so every
   scanning station and every results view agree on the exact same start
   instant.
6. **Finish scan** — swimmers scan out at the finish line; elapsed time is
   computed server-side as `finish time − gun time`.
7. **Results** — a public, live-updating leaderboard per race, with overall
   placings plus per-age-group / per-gender medal rankings (age groups are
   configured per event, e.g. "18-24", "25-29" …). CSV export for records
   and for handing off to a meet-hosting service.

## Data-integrity design ("zero mistakes")

- **Race numbers**: `unique(event_id, race_number)` at the DB level, assigned
  inside a single locked transaction (`register_swimmer()`), so two people
  can never receive the same bib even registering at the same instant.
- **One chip, one swimmer**: `timing_chips.registration_id` is `unique`.
- **Duplicate scans**: `record_scan()` detects and flags repeat scans
  (e.g. a swimmer bumping the sensor twice) instead of silently
  double-counting or overwriting a real time — the first scan of each type
  always wins, later ones are logged as `is_duplicate` for audit.
- **Server-authoritative clock**: gun time, check-in time, and finish time
  are all `now()` calls inside Postgres functions — never a value sent up
  from a phone/tablet, which would drift between devices.
- **RLS everywhere**: swimmer PII (email, phone, medical notes) is never
  publicly readable — only staff, and only through policies backed by a
  `staff_profiles` table. Public registration and results reads go through
  narrow, explicit functions/views that expose only what's needed.

## Getting started

```bash
export PATH=~/.npm-global/bin:$PATH
cd swim-meet
pnpm install
pnpm dev            # http://127.0.0.1:3002
```

### Backend setup (required for anything beyond the landing page)

1. Create a **new, separate Supabase project** — do not reuse the taxidermy
   app's project.
2. Run the SQL files in `supabase/migrations/` **in order** in the Supabase
   SQL Editor:
   - `001_schema.sql`
   - `002_functions.sql`
   - `003_staff_and_rls.sql`
   - `004_guard_staff_fns.sql`
   - `005_realtime.sql`
3. Copy `.env.example` to `.env` and fill in the new project's URL + anon key.
4. Create your first staff account in Supabase Auth (Authentication → Users),
   then insert a row for them:
   ```sql
   insert into staff_profiles (id, full_name, role)
   values ('<auth-user-uuid>', 'Your Name', 'admin');
   ```
5. Sign in at `/staff/login`, then go to **Admin → Events & Races** to create
   your first event, add races (distances), and configure age-group medal
   brackets.

## Race-day hardware

Scanning stations are designed around **USB/Bluetooth barcode or RFID
readers that act as a keyboard** ("wedge" scanners) — the cheapest and most
reliable option, no drivers needed. Each scan station's page keeps a hidden
input focused at all times; a reader's scan-then-Enter behavior is captured
automatically. A visible manual-entry fallback is always available if a chip
won't read.

Recommended race-day station layout:
- **1 device** at registration/chip pickup → `/admin/events/:eventId/chips`
- **1+ devices** at the funnel entrance → `/timing/:categoryId/staging`
- **1 device** with the starter → `/timing/:categoryId/start`
- **2-3 devices** at the finish chute → `/timing/:categoryId/finish` (see below)
- **Optional big screen** on the public results board → `/events/:eventId/results`

### Affordable option for large fields (150+ finishers)

A single fixed RFID antenna array at the finish (the setup professional
timing companies use) costs several thousand rand in reader + antenna
hardware alone. The cheaper alternative that needs **zero extra software**:
run **2-3 handheld Bluetooth/USB UHF RFID readers** (keyboard-wedge mode,
roughly R1,000-2,500 each) with a volunteer on each, spread across a
slightly widened finish chute. Each just opens the Finish Scan page on
their own phone/tablet — scans from every station merge into one shared
result set automatically, since they're keyed by race session, not device.
This comfortably handles normal open-water finishes, where swimmers spread
out over the course rather than arriving in one instant; it can lag behind
a truly simultaneous mass finish, which only a fixed antenna array fully
solves — you can add one later without changing any code.

### Offline / no-signal venues

See [`docs/RACE_DAY_OFFLINE_MODE.md`](./docs/RACE_DAY_OFFLINE_MODE.md) for
running the whole platform locally at a venue with no internet, and syncing
results to the cloud project afterward.

## What's not built yet

- Payment collection for entry fees (fees are recorded, not charged)
- Email/SMS confirmation delivery (confirmation is shown on-screen only)
- Direct Meet Mobile API integration — results export as CSV with the
  columns Meet Mobile / any results-tracking tool typically expects
  (bib, name, gender, age, category, time, placements); there is no
  official public API to push directly into Meet Mobile from a
  third-party timing system.
- Vercel/production deployment config
