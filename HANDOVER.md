# Apex Trophy Solutions — Session Handover

## Project Overview

Workshop management system for **Apex Trophy Solutions**.  
Production URL: `https://colletts-studio.vercel.app`  
Supabase project: `https://kpbtydfkqrrtbpwxvbep.supabase.co`  
GitHub: auto-deploys from `main` branch via Vercel.

**Stack:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Supabase  
**Routing:** State-based via `useState<TaxidermyView>` in `TaxidermyPortal.tsx` — no React Router  
**`@` alias** resolves to `src/app/`

---

## Security Rules (NEVER break these)

- PIN `2629` is for Ruan and Steve ONLY — never display or log it
- The PIN is NOT in code — it lives in Vercel env vars
- Always refer to the company as **Apex Trophy Solutions** (never "Collett's Wildlife Artistry")
- `SUPABASE_KEY` must be cleared after every import script run
- Always say "Run without RLS" for SQL migrations
- Open a **new query tab** for each migration in Supabase SQL Editor

---

## Staff Accounts (created this session)

All accounts use password **`Apex2026!`** (temp — should be changed).

| Name | Email | Role (DB) | Departments |
|------|-------|-----------|-------------|
| Ruan | ruancvanzyl@gmail.com | admin | All |
| Steve | steve@apextrophy.co.za | admin | Receiving, Quality Check, Photos |
| Abri | abri@apextrophy.co.za | studio_manager | Receiving, Quality Check, Administration |
| Vince | vince@apextrophy.co.za | department_staff | Receiving, Cleaning & Bleach, Storage |
| Divine | divine@apextrophy.co.za | department_staff | Tannery |
| Emanuel | emanuel@apextrophy.co.za | department_staff | Mounting |
| Kyle | kyle@apextrophy.co.za | department_staff | Finishing |
| Cecilia | cecilia@apextrophy.co.za | admin | Administration |

Allowed `role` values in `staff_profiles`: `admin`, `studio_manager`, `department_staff`, `ground_staff`, `bookkeeper`

---

## Migrations Run (in order)

| File | What it does | Status |
|------|-------------|--------|
| `001_initial_schema.sql` | All base tables | ✅ |
| `002_rls_policies.sql` | Row-level security | ✅ |
| `003_views_and_functions.sql` | Views + RPCs | ✅ |
| `013_client_numbers.sql` | `client_number` col (E-XXX / L-XXX), trigger | ✅ |
| `014_client_documents.sql` | `client_documents` table, `delivery_address` col | ✅ |
| `015_pipeline.sql` | `current_department` col on `hunt_documents` | ✅ |
| `016_staff_accounts.sql` | Reference only — accounts created via SQL Editor | ✅ |

---

## Database Schema — Key Tables

### `clients`
- `id`, `full_name`, `email`, `phone`, `country`, `address`, `delivery_address`
- `client_type`: `'export'` | `'local'` — **locked after registration**
- `client_number`: auto-assigned by trigger (`E-001` for export, `L-001` for local)

### `client_hunts`
- Links clients to hunt/check-in sessions
- `client_id`, `year`, `status`

### `hunt_documents`
- Core data store for all trophy work
- `doc_type`: `'job_card'` | `'receiving_sheet'`
- `status`: `'pending'` | `'in_progress'` | `'complete'`
- `current_department`: tracks where in the pipeline the trophy currently sits
- `form_data` JSONB holds all trophy details including `parts[]` and `stage_history[]`

### `client_documents`
- Passport / ID uploads per client
- `UNIQUE(client_id, doc_type)`
- Storage bucket: `client-documents`

### `staff_profiles`
- `id` (references `auth.users`), `full_name`, `role`, `is_active`

---

## Production Pipeline System

Defined in `src/lib/pipeline.ts`.

### Pipeline routes by mount type:
```
Shoulder / Offset Shoulder / Pedestal:
  receiving → cleaning_bleach → tannery → mounting → finishing → quality_check → photos → administration

Full Mount:
  receiving → tannery → mounting → finishing → quality_check → photos → administration

Flat Skin:
  receiving → tannery → storage → administration

Euro Mount / Bleach Mount:
  receiving → cleaning_bleach → mounting → finishing → quality_check → photos → administration
```

### How it works:
1. Trophy created at **Arrival Check-In** → `current_department = 'receiving'`, `status = 'pending'`
2. **Receiving Sheet** completion → advances `current_department` to next stage, writes `stage_history` entry
3. Each department sees only their items in **My Tasks** (`current_department IN their_departments`)
4. **Mark Complete** button → advances to next department or marks `status = 'complete'`

### Staff → Department mapping (in `pipeline.ts`):
```typescript
Abri:    ['receiving', 'quality_check', 'administration']
Steve:   ['receiving', 'quality_check', 'photos']
Vince:   ['receiving', 'cleaning_bleach', 'storage']
Ruan:    ['receiving', 'photos']
Divine:  ['tannery']
Emanuel: ['mounting']
Kyle:    ['finishing']
Cecilia: ['administration']
```
Matching is by `profile.full_name` first name. To add a person, add them to `STAFF_DEPARTMENTS` in `pipeline.ts`.

---

## New / Modified Files This Session

### New files:
| File | Purpose |
|------|---------|
| `src/lib/pipeline.ts` | Pipeline definitions, stage order, staff→department map |
| `src/lib/trophyParts.ts` | Trophy parts per species/mount type, QR tag generation |
| `src/app/components/apex/taxidermy/MyTasks.tsx` | Personal task queue per staff member |
| `src/app/components/apex/taxidermy/TrophyLabels.tsx` | QR label printing sheet |
| `src/app/components/apex/taxidermy/ReceivingSheet.tsx` | Receiving workflow + job card creation |
| `supabase/migrations/013_client_numbers.sql` | Client numbering |
| `supabase/migrations/014_client_documents.sql` | Client documents table |
| `supabase/migrations/015_pipeline.sql` | Pipeline column |
| `supabase/migrations/016_staff_accounts.sql` | Reference for staff account SQL |

### Modified files:
| File | What changed |
|------|-------------|
| `src/app/components/apex/TaxidermyPortal.tsx` | Added `'tasks'`, `'receiving'` views; `navClientId` state; `navigate(view, clientId?)` |
| `src/app/components/apex/taxidermy/ArrivalCheckIn.tsx` | Dual price lists (USD export / ZAR local); parts system; `current_department='receiving'` on insert |
| `src/app/components/apex/taxidermy/ClientManagement.tsx` | `delivery_address`; passport upload; `client_type` locked; `initialClientId` prop |
| `src/app/components/apex/taxidermy/PartScanningStation.tsx` | Full rewrite — searches by name/tag/QR; `clientId` on results; "View Client File" button |

---

## TaxidermyView States (sidebar nav)

```
tasks | summary | dashboard | scan | arrival | receiving |
skin-processing | skull-processing | storage | mounting |
finishing | quality | packing | inventory | clients | invoices | admin
```

`navigate(view, clientId?)` in `TaxidermyPortal` — pass `clientId` to auto-open a client in ClientManagement.

---

## Trophy Parts System

Defined in `src/lib/trophyParts.ts`.

**QR tag format:** `{clientNumber}-{SPECIES3}-T{index}-{PARTCODE}`  
Example: `E042-ZEB-T1-CAPE`

Parts per mount type:
- **Shoulder/Offset/Pedestal**: CAPE (required) + BSKIN (optional, leather-eligible) + horns + skull (warthog only)
- **Full Mount**: FSKIN + horns + skull (optional) + hooves (optional)
- **Flat Skin**: FLATSKIN only
- **Euro/Bleach**: SKULL + horns

---

## Pricing

Two price tables in `ArrivalCheckIn.tsx`:
- `EXPORT_PRICE_DATA` — USD, from SA Price List 2026
- `LOCAL_PRICE_DATA` — ZAR, from Colletts Local Pricelist 2026 sheet

`getAutoPrice(species, mountType, clientType)` selects the right table.  
`client_type` is locked at registration — cannot be changed mid-session.  
No currency labels shown anywhere — plain numbers only.

---

## Client Numbering

- Export clients: `E-001`, `E-002`, …
- Local clients: `L-001`, `L-002`, …
- Auto-assigned by DB trigger `trg_assign_client_number` on INSERT to `clients`

---

## Storage Buckets

| Bucket | Used for |
|--------|---------|
| `trophy-references` | Reference photos (intake, process shots) |
| `client-documents` | Passport / ID uploads |

---

## Scan Parts — How it works

`PartScanningStation.tsx` accepts three types of input:
1. **Client name or number** — loads ALL job cards for that client
2. **Tag number** (e.g. `A-0001`) — exact match on `form_data->>'tag_number'`
3. **QR part tag** (e.g. `E042-ZEB-T1-CAPE`) — scans `form_data.parts[].tag`

Each result card shows a **File** button → navigates to ClientManagement with that client pre-opened.

---

## Pending / Next Steps

- [ ] Staff should change their `Apex2026!` temp password on first login
- [ ] Test the full pipeline end-to-end (Check-In → Receiving → My Tasks → Mark Complete)
- [ ] Steve's real email may differ — update in Supabase Auth if needed
- [ ] Send-client-email Edge Function (for outbound email from CommunicationPanel)
- [ ] Invoice UI — create invoice, line items, record payment
- [ ] PayFast webhook (Supabase Edge Function)
- [ ] Consider adding push notifications when a trophy lands in someone's queue

---

## Dev Commands

```bash
export PATH=~/.npm-global/bin:$PATH
pnpm dev --host --port 3001   # dev server
pnpm build                     # production build
```

App runs at `http://127.0.0.1:3001` locally.  
LAN access: `http://10.0.0.156:3001`
