# Session Handoff — Apex Trophy Solutions

## STATE AS OF 2026-10-20 (read this first)

**Live on `main`** (deployed): Client Status Board with resolvable flags (migration 040 run), Deadline Watch with documents, speed fixes
(Daily Tasks, Receiving, Job Cards, Ready to Ship — joined/paged queries, `src/lib/supabaseHelpers.ts`), Add Staff fix, password-reset fixes,
UX audit fixes, 302 imported hunts + job-card batches 1–4 (job cards are inserted by the user pasting SQL; files live in `~/Downloads/apex-jobcards/`).

**Built, tested, NOT merged** — three stacked branches, ready to ship together (`docs/RELEASE_STEPS.md`):
`feature/task-flow` (migration 041: priority, due dates, opened/started tracking, department checklists enforced by a DB trigger, Dispatch Board)
→ `feature/offline` (042: PWA app shell, device outbox with real timestamps, saved copy of lists, offline stage completion with photos, banner)
→ `feature/communications` (043: staff messages with read receipts, managers-only sending, append-only client messages, admin log, Manage Staff
works-in / manages, Workshop Setup checklist editor). `pnpm test` (outbox) and `pnpm test:db` (41 checks of migrations 041–043 in PGlite) pass.

**Open decisions / waiting on the owner**: Supabase Site URL + Redirect URLs (still `localhost:3000`), custom SMTP (2 emails/hour cap), Resend verified domain,
scramble the 7 placeholder staff passwords (`Apex2026!`), delete ~248 pre-2024 clients (preview script was written, deletion not approved),
test records (`ruancvanzyl`, Test Andy), duplicate clients to merge, ~100 active hunts still without job cards.

**Docs**: `docs/AUDIT_2026-10-20.md`, `docs/LAUNCH_PLAN.md`, `docs/OFFLINE_PLAN.md`, `docs/RELEASE_STEPS.md`, `supabase/launch/launch_cleanup.sql`.

**Gotchas learned**: Tailwind v4 `hover:` only fires on hover-capable devices (touch screens never see hover-only buttons); the Supabase SQL editor
mis-parses the words "into" / "to crate" inside string literals (split with `'||'`); `.catch()` does not exist on a Supabase query builder;
Supabase returns max 1000 rows and long `.in()` lists break the URL; the in-app browser cannot register service workers (verify the PWA in real Chrome);
`import.meta.env` / `never` type errors in `tsc` are pre-existing (stale `database.types.ts`).

---

# Session Handoff — Apex Trophy Solutions data backfill

Read this file first in the new session instead of replaying old context.

## What's done
- Individual staff login, role tiers, security audit, order-size/deadline engine, Awaiting Instruction (review-before-send) system, and Deadline Watch are all built and live.
- Job Cards screen now groups by client (collapsed summary → click to expand animals) — `src/app/components/apex/taxidermy/WorkshopInstructions.tsx`.
- Fixed a crash: `AlertTriangle` wasn't imported in `src/app/components/apex/TaxidermyPortal.tsx` — fixed and deployed (commit `eed6caa`).
- **New: Client Status Board** on the Workshop Whiteboard (`src/app/components/apex/taxidermy/ClientStatusBoard.tsx` + `src/lib/hooks/useClientBoard.ts`) — lists every client by name, active clients first (missing-job-card ones floated to the top), each row showing its current production department and order status inline; Completed/Cancelled collapse into a "×N" section below rather than a tab.
- Fixed two production-crashing bugs found live: `Clock` unimported in `TaxidermyPortal.tsx` (the actual cause of the "Can't find variable: Clock" white-screen crash — same class of bug as the AlertTriangle one, just missed), and `Trophy` imported-but-aliased in `src/app/components/apex/hunter/ActiveHuntDashboard.tsx` (Hunter portal) then used unaliased in JSX — same crash pattern, would've hit hunters eventually. **Gotcha:** `npx tsc` on this machine can silently resolve to a bogus stub package and report zero errors — always run the real local binary directly: `./node_modules/.bin/tsc --noEmit` (confirm `node_modules/.bin/tsc` exists first with `ls`).
- Added `supabase/migrations/037_recent_checkins_view.sql` (`v_recent_checkins` view) — the Receiving Sheet screen queried this view first and fell back to 3 slow sequential queries every single time because the view had never actually been created. User still needs to run this migration once in the SQL Editor.
- Deploys via Vercel from GitHub `main` (`git@github.com:RuancvanZyl/colletts-studio.git`) — **remember to `git add/commit/push` after edits**, local changes alone don't reach the live site. Custom domain is `app.apextrophysolutions.com`; also check `apex-trophy-solutions.vercel.app` — a deployment can lag/cache differently between the two right after a push, use a `?cachebust=<random>` query param to force-bypass CDN caching when verifying a fix live.

## Core workflow for remaining backlog
System has 100+ active `client_hunts` rows with zero real `hunt_documents` job cards (i.e. no real trophy data entered). For each:
1. Find the client's folder locally: `~/Library/CloudStorage/Dropbox/Colletts SA/` (prefer this Finder-synced path over the Dropbox API — tokens expire fast).
2. Look for `SAC Invoice` / `SAC Packing List` / a folder path with "COMPLETED" in it / a signed Taxidermy Certification letter → these mean **already shipped**, so just:
   ```sql
   UPDATE client_hunts SET status = 'completed' WHERE id = '<hunt_id>';
   ```
3. If genuinely still active, read the real invoice/quote for the itemized trophy list, then:
   - `INSERT INTO hunt_documents (hunt_id, doc_type, title, status, current_department, form_data) VALUES (...)` — one row per trophy/item. `form_data` is jsonb: `{"species":...,"mount_type":...,"instructions":...}`. **`title` is NOT NULL** — always include it (learned this the hard way).
   - **Don't hand-classify `order_size`** — `_apply_order_timeline()` computes and overwrites it itself from the job_card rows' `form_data->>'mount_type'` values already in the DB, using the *actual* function logic (`034_order_timelines.sql`/`035_...sql`):
     `full_count` = mount_type IN ('Full Mount','Pedestal Mount','Life Cast','Rug Mount on Felt'); `shoulder_count` = mount_type IN ('Shoulder Mount','Offset Shoulder Mount','Half Mount'); `total` = all job_card rows for the hunt (any mount_type, including skull/euro/leather/flat-skin items that don't count toward full/shoulder).
     → `large` if `full_count≥4` OR `shoulder_count≥6` OR **(`total>5` AND (`full_count>0` OR `shoulder_count>0`))** — note this last clause: a hunt with e.g. 15 total items and just 1 shoulder mount is `large`, even though shoulder_count is nowhere near 6. (Learned this the hard way on Anthony Craig Baker T2325 — 15 items/4 shoulder mounts came out `large`/425-day deadline, not the `medium` a naive full/shoulder-only count would suggest.)
     → else `medium` if `full_count≥1` OR `shoulder_count≥2`; else `small`.
     So: **insert all the job_card rows FIRST**, then call `_apply_order_timeline` — it reads `mount_type` fresh from what's already in the table and writes the correct `order_size` as a side effect. No separate `UPDATE client_hunts SET order_size = ...` needed or reliable.
   - Start the timeline from the REAL deposit date (not today) — call directly in SQL Editor (bypasses the staff-auth check, which is fine since the Editor itself requires dashboard login):
     ```sql
     SELECT public._apply_order_timeline('<hunt_id>'::uuid, 'cash_manual', NULL, '<deposit_date>'::timestamptz);
     ```
     If it errors "timeline already started", the row already has stale/wrong dates — fix directly instead:
     ```sql
     UPDATE client_hunts SET
       timeline_started_at = '<deposit_date>T00:00:00Z',
       timeline_started_via = 'cash_manual',
       deadline_original = '<start+N days>',
       deadline_current = '<start+N days>',
       milestones = '[...]'::jsonb
     WHERE id = '<hunt_id>';
     ```
     Milestone day offsets (from `src/lib/orderTimeline.ts`): small = 90/150/180 days (3 milestones); medium = 90/150/270 days (3 milestones); large = 90/150/365/425 days (4 milestones, m3 counted from start not after tannery).
4. ⚠ **CORRECTED RULE (Ruan's explicit direction — was wrong earlier this session):** job cards get created whenever the trophy is **physically received** at the workshop — that's the real-world trigger, independent of billing. Payment/deposit status is a SEPARATE concern that only gates the **timeline** (deadline/milestones via `_apply_order_timeline`), never whether a job card exists. So:
   - If there's a receiving sheet / "trophies received [date]" / dated intake photos anywhere in the folder → **always insert job cards**, one per item, `status='in_progress'`, `current_department='receiving'` (or wherever the evidence points, e.g. `'tannery'` if there's a dated tannery work order for that specific item).
   - If the client hasn't confirmed mount type yet (unresponsive, "awaiting instructions"), still insert the job card — use `mount_type: "Pending Instructions"` (falls through to the generic 11-stage pipeline) with an `instructions` note explaining what's pending. Don't leave real, physically-present trophies invisible on the Job Cards board just because billing/instructions aren't finalized.
   - Only call `_apply_order_timeline` (which sets the deadline/milestones) once a **real deposit/payment date** is confirmed. Until then, leave `client_hunts` timeline fields null and put the payment situation in `notes`.
   - Earlier this session I had this backwards (treated "no confirmed deposit" as a reason to skip job cards entirely) — already went back and corrected: Adam Knobel, Andrew Jackson, Cesar Hymberto Isassi Martinez, Christo Zietsman, Braden Craig Dart WI6626 all got job cards added retroactively. If you find any other earlier "note only, no job card" record from this session that actually has a confirmed receiving date, it needs the same retroactive fix.
   - Genuine **note-only, no job card** cases are now narrower — only when there's truly no evidence the trophy was ever physically received (e.g. a folder with just a stale/undated quote, or zero Dropbox evidence at all), or when the client explicitly declined/redirected the trophy elsewhere before it was ever received.
5. I have **no direct DB access** — every SQL must be pasted into the Supabase SQL Editor by the user and results reported back. Always give clean standalone SQL blocks.
6. ⚠ **Scope is now 2024–2026 only.** All `client_hunts` rows with `year::int < 2024` were permanently deleted (81 hunts, 547 hunt_documents) on Ruan's explicit instruction — don't process, reference, or try to backfill anything pre-2024 going forward.

## Client lookup pattern
```sql
SELECT ch.id AS hunt_id, ch.ref_number, ch.status, ch.order_size, ch.client_id, c.full_name, c.client_number
FROM client_hunts ch JOIN clients c ON c.id = ch.client_id
WHERE c.full_name ILIKE '%<name>%';
```

## Full remaining worklist (active hunts, zero job cards, as of this session)
Already resolved: Joseph Crane (completed), Garrett Ham (completed), Logan Giger (real data + timeline), Felix Gonzalez Pomares WI7026 (note — awaiting deposit), A A Cabella (note — going to another dealer), A D Nel Konstruksie (note — awaiting deposit), Aaron & Larry Tremaine (note — to CWA stock), Adam Olivas (completed), Adriaan L098 (note — to CWA stock), Alan Vincent (note — awaiting internal decision), Andreo Angelucci (note — payment unconfirmed), Andrew Husek (note — conflicting payment signal), Daryn Eudaly (note — stays at workshop, cleared bad timeline), Alberto Rios Mora T1123 (completed — was fully paid/shipped despite order_size already being 'small' from an earlier partial pass), Adam Knobel WI4726 (note — client unresponsive, no pricing), Andrew Jackson WI0925 (note — real pro-forma exists but zero deposit paid, and its ref "L177" doesn't match client's own code "L192" — likely cloned from another client's template, needs manual check), Angus Duncan Mackay WI3922 (note — only doc on file is an undated ZAR invoice from the Zimbabwe branch that never references WI3922, low-confidence), Anthony Craig Baker T2325 (real data + timeline — 15 items, `order_size` came out `large` not the `medium` a naive count suggests, deadline 2027-04-14; part of a "Maktoum group" ex-Tanzania party sharing paperwork with 3 other separate hunt records — kept separate).

**Next up alphabetically** (query this fresh at session start since more may complete in the meantime):
```sql
SELECT ch.id AS hunt_id, ch.ref_number, ch.status, ch.order_size, c.full_name, c.client_number
FROM client_hunts ch
JOIN clients c ON c.id = ch.client_id
LEFT JOIN hunt_documents hd ON hd.hunt_id = ch.id AND hd.doc_type = 'job_card'
WHERE ch.status = 'active'
GROUP BY ch.id, c.full_name, c.client_number
HAVING count(hd.id) = 0
ORDER BY c.full_name;
```
Also resolved this round: Anthony Howard Clark WI7825 (note — the folder found under this client's name actually belongs to Verlin Ray, confirmed by Ruan; still no real folder for WI7825 itself), Anton de Jongh (note — client declined, went to CWA stock at no charge), Armand/Armand Brachman T0518 (completed — legal name on export permits is "Armand Yves Henri Joyeux," worth reconciling), Arnoldi (note — blank legacy record, no contact/payment info), Baldomero Garcia Lopez WI7126 + WI6826 (note — zero matching documents for either ref), Benjamin Ryder T0226 (real data + timeline — bank-confirmed deposit 04.08.2026, 11 items, `order_size` came out `large` due to 5 "Rug Mount on Felt" items, deadline 2027-10-03), Bobbie Baines/Edward Melendez T0919 (completed — fully paid + SAC packing list), Boela Bekker Safaris (note — zero evidence anywhere in Dropbox), Braden Craig Dart WI0526 (note — no folder at all) + WI6626 (note — genuinely unpaid, real invoice exists under internal ref "ST0626").

⚠ **Verlin Ray is a large, complex, high-volume client — do NOT auto-resolve.** 3 active hunts with zero job cards (T3224 id `343b25ed-68bb-4498-a26e-8dcc184e5241`, WI4825 id `6fab4bd5-0ff7-4e2c-999b-647a6ddd4216`, WI7725 id `41fbb5a8-f61d-42ce-894b-25612ee369c5`), all flagged note-only this session. Dropbox has years of overlapping batches under inconsistent codes (E667-670, E774-778, E810-816+) across T/WI/ST ref schemes that don't map cleanly to each other — Steve normally handles this client. A real 9-item trophy batch (Eland, 2x Waterbuck, Blue Wildebeest, Warthog, 3x Zebra — receiving sheets 05-07.10.2025, active Oasis tannery work Feb 2026) was found but could NOT be confidently matched to one of the 3 hunt_ids, so it was left unattached. Needs a dedicated manual pass with Ruan/Steve rather than the normal per-client Dropbox-search workflow.

Was mid-way through Braden Craig Dart alphabetically — remaining includes (from the original full-list dump, not yet re-verified fresh): Cesar Hymberto Isassi Martinez, Chad Allen, Charl Schneider, Christiaan Michaels, Christo Zietsman, Christopher Kontogianis, Christopher Stagg (⚠ part of the "Maktoum group" shared paperwork — see Anthony Craig Baker note above), Claus Thygeson CW0419, Cody William Faerber (x2), Colby Beecher, CWA Stock ex Glen Chamberlain, CWA Stock ex Jimmy, Dan Macerelli, Dane Arcari, Daniel Burton Scholes, Daniel van Biljon, Daniel W Kirkham, Danny Rindone, Darin Mitchell Puryear, Darrell W Johns, Dave Allen Johnson, David Merlin Faerber (x2), David Pieterse (x2), David Zuck, DC Uys, Deidre Matthews (multiple hunts under 2 different client_numbers — L-032 and L-040, don't merge), Deirdre + Eugene, Deirdre CW0404, Deirdre Matthews CW0209, Deon Muller (x2), Don Dunning, Donald Glen Lockard, Dr Shiva (x2), Eduardo Fernando Huergo, Eduardo Huergo (⚠ also part of the Verlin Ray group per Dropbox — check before treating as standalone), Eugene Alberts, Francois, Francois Hoffman, Frans Pieterse (x2 + a "Moved to 2024 File!" variant), Furas Nkosi, Garry Jolly - to stock, Gary Jolley, Gary Lee Jolley (x2), Gary Pahl, Gerhard Pretorius, Graeme McNocher, Hanno, Henk Havenga, Henru - Jimmy's nephew, Henry Stuart John Cecchin, Herman Blignault, HP Oosthuizen (x3), HP STOCK, Jaap Lee, Jaco Calitz (x2), Jaco Haasbroek, Jaco Theron, Jacques, Jacques Bredenkamp, James Knubel — and everything alphabetically after (full list is 100+). Re-run the fresh query below at the start of the next session since more may resolve in the meantime. Work in small batches (~4-5 clients per pass), each batch ending in one combined SQL block for the user to run.

## Known gotchas
- `hunt_documents.title` is NOT NULL — always set it on job_card inserts.
- SQL Editor runs as Postgres superuser (`auth.uid()` = NULL) — auth-gated RPCs like `start_order_timeline()` will silently fail there; call the underlying `_apply_order_timeline()` directly instead for backfills.
- Don't run `_apply_order_timeline` twice on the same hunt — it'll raise "timeline already started"; use a direct UPDATE to correct instead.
- User repeatedly pastes the wrong thing into SQL Editor — always give ONE clean standalone SQL block, explicit about "paste only this."
- Always `git commit` + `git push origin main` after any code edit — Vercel only deploys from the pushed branch, not local files.
