# Collett's Studio — Handoff Brief

## Project Overview
Studio management system for **Collett's Wildlife Artistry** — a taxidermy studio.
Manages the full trophy lifecycle: client intake → receiving → production → QC → shipping.

## Repo & Infrastructure
- **GitHub:** https://github.com/RuancvanZyl/colletts-studio
- **Local path:** `~/colletts-studio`
- **Supabase project:** https://kpbtydfkqrrtbpwxvbep.supabase.co
- **Vercel:** Not yet deployed

## Tech Stack
- React 18 + Vite 6 + TypeScript
- Tailwind CSS v4
- shadcn/ui (Radix UI primitives)
- react-router v7
- @supabase/supabase-js
- Package manager: **pnpm** (installed at `~/.npm-global/bin/pnpm`)

## How to Run Locally
Open a Terminal window and run — **keep it open**:
```bash
cd ~/colletts-studio
export PATH=~/.npm-global/bin:$PATH
pnpm dev --host --port 3001
```
Then open **http://127.0.0.1:3001** in Safari.
Others on the same WiFi can use **http://10.0.0.156:3001**.

## What's Built

### UI (all screens exist, mostly mock data)
- Landing page → portal selector → login screen
- **Taxidermy Portal** with full sidebar navigation:
  - Workshop Dashboard
  - Part Scanning Station
  - Arrival Check-In ✅ wired to real data
  - Skin Processing
  - Skull Processing
  - Storage Management
  - Mounting Station
  - Finishing Station
  - Quality Inspection
  - Packing & Shipping
  - Inventory View
  - Admin Configuration
- Hunter Portal (mock)
- Outfitter Portal (mock)

### Backend / Data Layer
- **Auth:** `src/lib/auth.tsx` — Supabase auth wired to login screen, auto-redirects staff to portal
- **Data hooks** in `src/lib/hooks/`:
  - `useClients.ts`
  - `useSpecimens.ts`
  - `useJobs.ts`
  - `useDashboard.ts` ✅ wired to WorkshopDashboard
  - `useReceiving.ts` ✅ wired to ArrivalCheckIn
  - `useInventory.ts`
  - `useInvoices.ts`
- **Database types:** `src/lib/database.types.ts`
- **Supabase client:** `src/lib/supabase.ts`

### Database Schema (written, NOT yet run)
Three migration files in `supabase/migrations/` — must be run in order in Supabase SQL Editor:
1. `001_initial_schema.sql` — all tables
2. `002_rls_policies.sql` — row level security
3. `003_views_and_functions.sql` — alert view, triggers, dashboard function

## What Still Needs to Be Done

### Immediate (before app is usable)
1. **Create `.env` file** at `~/colletts-studio/.env`:
   ```
   VITE_SUPABASE_URL=https://kpbtydfkqrrtbpwxvbep.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key from Supabase dashboard → Settings → API>
   ```
2. **Run the 3 SQL migration files** in Supabase dashboard → SQL Editor
3. **Create first admin user** in Supabase Auth, then insert staff_profiles row
4. **Deploy to Vercel** so anyone can access it (not just local WiFi)

### Features to wire up (screens exist, need real data)
- Part scanning (RFID/QR/manual) → `PartScanningStation.tsx`
- Skin processing workflow → `SkinProcessing.tsx`
- Skull processing workflow → `SkullProcessing.tsx`
- Storage management → `StorageManagement.tsx`
- Mounting station → `MountingStation.tsx`
- Finishing station → `FinishingStation.tsx`
- Quality inspection + pass/fail → `QualityInspection.tsx`
- Packing & shipping → `PackingShipping.tsx`
- Inventory stock management → `InventoryView.tsx`
- Admin: staff, stations, alerts config → `AdminConfiguration.tsx`

### Modules not yet built
- **Invoicing UI** — create invoice, line items, record payment
- **Client management** — client list, profile, onboarding checklist
- **SLA alert acknowledgement** — dashboard panel to ack/dismiss alerts
- **PayFast webhook** — Supabase Edge Function for payment gateway
- **Vercel deployment** — push env vars and deploy

## Key Technical Notes
- Figma Make originally used versioned imports like `sonner@2.0.3` — fixed via custom Vite plugin in `vite.config.ts`
- pnpm is installed locally at `~/.npm-global/bin/pnpm`, not system-wide — always prefix with `export PATH=~/.npm-global/bin:$PATH`
- Auth skips Supabase calls if no `.env` credentials present — app shows landing page without crashing
- The `job_phase_history` + `phase_checkpoints` tables enforce QC: a photo or comment is required before any phase can advance (DB constraint)
- Production clock (`jobs.production_started_at`) is set automatically by a Postgres trigger when BOTH deposit is paid AND specimen is physically received

## File Structure
```
colletts-studio/
├── src/
│   ├── lib/
│   │   ├── auth.tsx              # Supabase auth context
│   │   ├── supabase.ts           # Supabase client
│   │   ├── database.types.ts     # TypeScript types for all tables
│   │   └── hooks/
│   │       ├── useClients.ts
│   │       ├── useSpecimens.ts
│   │       ├── useJobs.ts
│   │       ├── useDashboard.ts
│   │       ├── useReceiving.ts
│   │       ├── useInventory.ts
│   │       └── useInvoices.ts
│   └── app/
│       ├── App.tsx               # Root — auth routing
│       └── components/apex/
│           ├── taxidermy/        # All workshop screens
│           ├── hunter/           # Hunter portal (mock)
│           ├── outfitter/        # Outfitter portal (mock)
│           └── ui/               # shadcn components
├── supabase/migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   └── 003_views_and_functions.sql
├── .env.example                  # Copy to .env and fill in
├── SETUP.md                      # Step-by-step setup guide
└── vite.config.ts                # Includes Figma versioned-import fix
```
