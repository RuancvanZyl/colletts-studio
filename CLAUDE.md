# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Collett's Studio** — a taxidermy workshop management system for Collett's Wildlife Artistry. Manages the full trophy lifecycle: client intake → receiving → production phases → QC → shipping. Three user portals: Taxidermy Staff, Hunter (client), and Outfitter.

## Commands

pnpm is installed locally, not system-wide. Always prefix with the PATH export:

```bash
export PATH=~/.npm-global/bin:$PATH
pnpm dev --host --port 3001     # dev server (LAN-accessible)
pnpm build                       # production build
pnpm preview                     # preview production build
```

There are no lint or test scripts configured. TypeScript type-checking can be done via `tsc --noEmit`.

The app runs at `http://127.0.0.1:3001`. Others on the same WiFi use `http://10.0.0.156:3001`.

## Environment

Copy `.env.example` to `.env` and fill in credentials from the Supabase dashboard (Settings → API):

```
VITE_SUPABASE_URL=https://kpbtydfkqrrtbpwxvbep.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

If `.env` is missing, the app gracefully skips all Supabase calls and shows the landing page without crashing — the `HAS_SUPABASE` flag in `src/lib/auth.tsx` gates all Supabase initialization.

## Database

The Supabase project is at `https://kpbtydfkqrrtbpwxvbep.supabase.co`. Three migration files in `supabase/migrations/` must be run **in order** in the Supabase SQL Editor before the app can read/write real data:

1. `001_initial_schema.sql` — all tables
2. `002_rls_policies.sql` — row-level security
3. `003_views_and_functions.sql` — `v_active_alerts` view, `get_dashboard_summary()` RPC, production-clock trigger

To regenerate TypeScript types after schema changes:
```bash
npx supabase gen types typescript --project-id kpbtydfkqrrtbpwxvbep > src/lib/database.types.ts
```

## Architecture

### Routing
Navigation is **state-based**, not URL-based. `src/app/App.tsx` switches between views using `useState<AppView>` and `useState<PortalType>`. There is no React Router `<Routes>` tree — `react-router` is installed but not used for routing. To add a new screen: add a case to the portal's `renderView()` switch and a nav button in its sidebar.

### Auth
`src/lib/auth.tsx` provides `AuthProvider` + `useAuth()`. On login, it fetches the user's `staff_profiles` row and exposes it as `profile`. Authenticated staff are auto-redirected to the taxidermy portal on landing. The `user` object is from Supabase Auth; `profile` adds the application-level role (`StaffRole`).

### Data Layer
All Supabase queries live in custom hooks under `src/lib/hooks/`. Each hook is responsible for one domain:

| Hook | Domain | Status |
|------|--------|--------|
| `useDashboard` | KPI summary + activity feed + alerts | ✅ wired |
| `useReceiving` | Receiving batch creation + specimen intake | ✅ wired |
| `useClients` | Client list and profiles | stub |
| `useSpecimens` | Specimens by job | stub |
| `useJobs` | Job status and phase history | stub |
| `useInventory` | Stock levels + reorder thresholds | stub |
| `useInvoices` | Invoices and payments | stub |

When wiring a screen to real data, import the relevant hook — don't query Supabase directly inside components.

### Components
```
src/app/components/
  apex/
    taxidermy/       # 12 workshop screens (the primary portal)
    hunter/          # Hunter portal (mostly mock data)
    outfitter/       # Outfitter portal (mostly mock data)
    admin/           # Reception / admin sub-screens
    shared/          # PortalBreadcrumb, QuickActions, UniversalAIAssistant
    mockData.ts      # Mock data used by unwired screens
    mockAnimalData.ts
    mockOutfitterData.ts
    mockPaymentData.ts
  ui/                # shadcn/ui components — do not edit these
  figma/             # ImageWithFallback helper from Figma Make
```

The `@` alias resolves to `src/app/` — so `import { Button } from '@/components/ui/button'`.

### Database Schema Key Concepts

- **`specimens`** — individual physical trophies. Each has a `tag_number` for physical labelling and a `status` of `expected` (pre-arrival) or `received`.
- **`jobs`** — one production order per specimen. Tracks `current_phase` (the `JobPhase` enum), `assigned_department_id`, and `production_started_at`. The production clock is set automatically by a Postgres trigger when **both** the deposit invoice is paid **and** the specimen is physically received.
- **`job_phase_history`** — audit trail of every phase transition. The `useDashboard` hook queries this for the activity feed.
- **`phase_checkpoints`** — QC gates: a photo or comment is required before a job can advance phases. Enforced at the DB level.
- **`parts`** — individual components of a job (skull, cape skin, horns, etc.), each with its own `current_phase` and `current_location`.
- **`v_active_alerts`** — Postgres view that surfaces overdue, stalled, and missing-date jobs. Queried by the dashboard.
- **`get_dashboard_summary()`** — RPC function returning KPI counts. Called via `supabase.rpc('get_dashboard_summary')`.

### Vite Config
Two custom plugins handle Figma Make export quirks:
- `figmaVersionedImportResolver` — strips version suffixes from imports like `sonner@2.0.3`
- `figmaAssetResolver` — resolves `figma:asset/filename` imports from `src/assets/`

### Theming
`ThemeProvider` (`src/app/components/apex/ThemeProvider.tsx`) manages light/dark mode via `localStorage`. `PortalThemeProvider` applies portal-specific colour accents (`hunter`, `outfitter`, `admin`, `unified`). Both wrap `AppInner` in `App.tsx`.

## What's Not Built Yet

Screens that still use mock data and need wiring to real hooks:
- `PartScanningStation`, `SkinProcessing`, `SkullProcessing`, `StorageManagement`, `MountingStation`, `FinishingStation`, `QualityInspection`, `PackingShipping`, `InventoryView`, `AdminConfiguration`

Modules not yet built:
- Invoicing UI (create invoice, line items, record payment)
- Client management screen
- PayFast webhook (planned as a Supabase Edge Function)
- Vercel deployment config
