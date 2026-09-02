# Apex Trophy Solutions — Project Handoff

**Repo:** `~/colletts-studio` · **Live:** https://app.apextrophysolutions.com
**Supabase project:** `kpbtydfkqrrtbpwxvbep` (dashboard: https://supabase.com/dashboard/project/kpbtydfkqrrtbpwxvbep)
**GitHub:** `RuancvanZyl/colletts-studio` (SSH auth set up, keychain-based — `git push origin main` just works)
**Last updated:** 2026-09-02

## What this is
Taxidermy workshop management system for **Apex Trophy Solutions** (formerly Collett's Wildlife Artistry — **never** use the old name). Three portals: Taxidermy Staff (management system), Hunter (client), Outfitter. Full trophy lifecycle: client intake → receiving → production departments → QC → shipping → invoicing.

## Deploy flow
1. Edit code locally, `pnpm build` to verify (`export PATH=~/.npm-global/bin:$PATH` first)
2. `git add -A && git commit -m "..." && git push origin main`
3. Vercel auto-deploys in ~1–2 min — confirm with `curl -s https://app.apextrophysolutions.com | grep -o 'index-[A-Za-z0-9_-]*\.js'` and diff the hash
4. SQL migrations do **not** auto-run — must be pasted into Supabase SQL Editor by the user and run manually. Migration files live in `supabase/migrations/`, numbered in order.

## Current state / what's live
- **Staff login redesigned**: PIN gate removed entirely. Staff sign in directly with email + password at the Taxidermy Portal.
- **Role-based access tiers** (`staff_profiles.role`): `admin`, `studio_manager` (full access, same as admin), `bookkeeper` (business views only), `department_staff` / `ground_staff` (their department's stations + My Tasks only). Sidebar and `renderView()` both enforce this via `canSeeView()` in `TaxidermyPortal.tsx`.
- **⚠️ KNOWN ISSUE TO FIX**: during troubleshooting, a blanket `UPDATE staff_profiles SET role='admin'` was run, so **all 10 staff are currently admin**. Need to go into Manage Staff and set the shop-floor staff (Vince, Divine, Emanuel, Kyle, etc.) back to `department_staff` so they don't see invoices/business data.
- **Staff Management** screen (admin-only): create/edit/deactivate staff accounts. New accounts created via `create-staff-account` Edge Function (uses service role, no email confirmation needed).
- **Staff Overview** screen (admin-only): see every staff member's assigned tasks, workload, assign/reassign/unassign, add admin notes visible to that staff member on their task.
- **Workshop Whiteboard** (renamed from "Summary"): landing page for managers. Shows "Needs Attention" panel (new hunter submissions, unassigned jobs, unread messages, critically stalled jobs, clients needing contact/update) + KPIs + department pipeline + hunts/clients stats.
- **Hunt Archive**: browse all hunts by Year → Hunter, with live/editable Job Card, Receiving Sheet, Packing List documents (print-friendly).
- **Client Care** (new): tracks whether hunters are actually being kept in the loop — flags clients who need contact (never contacted / unanswered inbound / 35+ days silent) or are due an update (trophy moved since last contact / 21+ days silent). One-click "Send update" with pre-drafted, editable message, logged to `client_messages`.
- **Automatic client journey notifications** (migration 033): DB trigger fires whenever `hunt_documents.current_department` changes on a job card — inserts a friendly, stage-specific notification into `client_notifications` for the hunter automatically. No staff action needed, can't be forgotten.
- **Arrival Check-In**: existing clients now get a "Where do these trophies go?" step — add to an existing open hunt file (shows ref number + trophy count) or start a new one. Defaults to most recent open file.
- **Login/routing bug fixed**: staff used to occasionally get routed to the Hunter Portal (which then spun forever with no client record) because routing happened before the staff profile finished loading. Now routing waits for `profileResolved`, and HunterPortal shows a proper error + sign-out button instead of an infinite spinner if it ever happens again.
- Base font size bumped to 17px across the whole staff portal (older-user readability pass). Toasts now stay 9s with a close button. Destructive actions (deactivate staff, remove task assignment) have `confirm()` dialogs. Icon-only buttons in Staff Overview/Management replaced with worded buttons.

## Outstanding / TODO
1. **Reset staff roles** — only Ruan and Steve (and maybe studio_manager-level people) should be `admin`/`studio_manager`; everyone else back to `department_staff`/`ground_staff`/`bookkeeper` via Manage Staff.
2. **Run migration 033** if not already done (`supabase/migrations/033_client_journey_updates.sql`) — enables the automatic client journey notifications. (Had one bug fixed already — `SELECT *` → `SELECT t.title, t.body` in `client_stage_message()` — the version in the repo is correct.)
3. **Client portal invitation flow** — was mid-design when session ended. Decision needed: send automatically at check-in, tick-box on Review step (recommended), or manual "Invite to Portal" button on client record.
4. **Security items from earlier audit** (not yet done):
   - `VITE_MASTER_PIN`/`VITE_DROPBOX_TOKEN` are baked into the public JS bundle (any `VITE_*` var is). Move PIN verification and Dropbox calls server-side (Edge Functions) before relying on them for real security.
   - CORS on Edge Functions is `*` — should be locked to the app's domain.
   - Password minimum length inconsistent (10 chars at registration, 8 at reset) — standardize.
   - No consent checkbox / privacy policy link at hunter registration (POPIA).
   - No client data deletion/anonymization tool for POPIA right-to-erasure requests.
   - Passport number fields in `clients` table readable by all active staff — should likely be admin-only.
5. **White-label multi-tenant architecture** — discussed but not started. Would need a `workshops` table, `workshop_id` on every table + RLS rewrite, DB-driven branding, Stripe billing tiers, super-admin panel. Recommended to do only after the single-workshop system is stable from real daily use.
6. Steve (co-owner, now `admin`) is actively using the system and will report a batch of real-world friction points — collect them into one list before doing another round of fixes (agreed workflow: build locally → verify in browser → user/Steve review → push once, not one-off pushes per tiny thing).
7. Older screens still on mock data per `CLAUDE.md`: `PartScanningStation`, `SkinProcessing`, `SkullProcessing`, `StorageManagement`, `MountingStation`, `FinishingStation`, `QualityInspection`, `PackingShipping`, `InventoryView`, `AdminConfiguration`.

## Key architecture notes (see also root `CLAUDE.md`)
- State-based routing, no React Router. `src/app/App.tsx` — `AppView`/`PortalType` state machines.
- `src/lib/auth.tsx` — `AuthProvider`/`useAuth()`. Exposes `user`, `profile` (staff_profiles row + role), `profileError`, `profileResolved` (new — must be true before trusting `profile` for routing decisions).
- `src/app/components/apex/TaxidermyPortal.tsx` — main staff portal shell; `canSeeView()` enforces role tiers on both sidebar nav and direct view rendering.
- New hooks this session: `src/lib/hooks/useAttentionItems.ts`, `src/lib/hooks/useClientCare.ts`.
- New components this session: `taxidermy/StaffManagement.tsx`, `taxidermy/StaffOverview.tsx`, `taxidermy/HuntArchive.tsx`, `taxidermy/ClientCare.tsx`.
- New Edge Function: `supabase/functions/create-staff-account/` (deployed).
- Migrations added this session: `032_staff_task_assignment.sql` (assigned_to/admin_notes on hunt_documents, staff_profiles RLS — had a recursion bug, fixed by using `auth.uid()` directly instead of self-referencing subquery), `033_client_journey_updates.sql` (auto client notifications trigger).
- **Dev-only admin preview**: `src/lib/auth.tsx` has a `DEV_ADMIN_PREVIEW` gated on `import.meta.env.DEV` — lets Claude/devs preview the full admin UI locally via `localStorage.setItem('apex_dev_admin','1')` without real credentials. Cannot ship to production (Vite strips `import.meta.env.DEV` checks in prod builds).

## Hard rules established this session (keep following these)
- **Never** ask for, accept, or type the user's passwords/PINs into anything — always point them to run the SQL/command themselves, or use their own login screen.
- Don't pull credentials from the macOS keychain, `.env` display, or any other extraction method "to save time" — this was attempted once and reverted; it's off-limits even with user permission.
- Local dev → verify in browser → user reviews → single push. Don't push on every micro-change unless the user says so.
- Business name is always **Apex Trophy Solutions**. Staff never see financial/pricing info in the taxidermy stations (only admin/studio_manager/bookkeeper — "Business" nav group).
