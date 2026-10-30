# CLAUDE.md

Guidance for working in this repository.

## What this is

**Apex Trophy Solutions**: a taxidermy workshop management app (installable phone app / PWA) with three portals:
- **Staff / Taxidermy** (`TaxidermyPortal.tsx`): check-in, job cards, departments, milestones, quotes and payments, shipping, setup.
- **Hunter** (`HunterPortal.tsx`, `LocalHunterPortal.tsx` for hunters whose trophies stay in South Africa).
- **Outfitter** (`OutfitterPortal.tsx`).

The people using it are **not technical**. Everything must be super easy to use and easy to understand: plain everyday words, one obvious next step per screen, big tap targets, say what will happen before the person taps, no database or developer words in anything a person can see. Review the wording of every screen and message you add. Screen titles must match the menu tab that opens them.

Read `docs/SESSION_HANDOFF.md` first: it is the running log of what was built, what is still open, and what the owner has to do (run SQL, deploy functions, supply details).

## Commands

pnpm is installed locally, not system-wide:

```bash
export PATH=~/.npm-global/bin:$PATH
pnpm dev --port 3002              # dev server
./node_modules/.bin/vite build    # production build
pnpm test                         # unit tests (node --test, tests/*.test.ts)
pnpm test:db                      # database tests: every migration in a throw-away Postgres (PGlite), tests/db/
./node_modules/.bin/tsc --noEmit  # type check. About 120 older errors remain in legacy files (Supabase types out of date); they are noise. Do not add new ones.
```

Run the type check, unit tests, database tests and a build before every commit.

## Releasing

- The owner is not a developer. Database changes are SQL files in `supabase/migrations/` (+ a copy or combined script in `supabase/launch/`) that the owner pastes into the Supabase SQL Editor. Give exact click-by-click steps. Test every script in the PGlite harness first (`tests/db/migrations.test.mjs`, `tests/db/bootstrap.sql`).
- Edge Functions (`supabase/functions/*`) are pasted into the Supabase dashboard by the owner ("Via Editor"). Secrets (e.g. `ANTHROPIC_API_KEY`) are added by the owner.
- Commit and push with the explicit URL, then verify with `git ls-remote`: `git push git@github.com:RuancvanZyl/colletts-studio.git HEAD:main`. The live site rebuilds from `main`; every phone and laptop updates itself (see `src/lib/appUpdate.ts`, `src/main.tsx`).
- Add an entry to `docs/SESSION_HANDOFF.md` after each step.

## Architecture

- React 18 + Vite + Tailwind v4 + TypeScript. Navigation is state based (no router): the staff portal uses `navigate(view, id?)` in `TaxidermyPortal.tsx`; the menu is the `allSections` list there (a few plain sections with tabs).
- Supabase: Postgres with row-level security; rules are enforced in the database (triggers, SECURITY DEFINER functions), the app calls `supabase.rpc(...)`. Realtime via `src/lib/liveRefresh.ts` (`useLiveRefresh`).
- Data hooks live in `src/lib/hooks/`. Screens that reload (live updates, after saving) must **not** show the full-screen spinner again: use the `loadedOnce` ref pattern (spinner on the first load only). Screens must never blink or throw away what the person is doing.
- Offline: queued actions and photos in IndexedDB (`src/lib/offline/`); `completeStage` is the one way a job card moves on.
- Errors: every `toast.error` goes through `src/lib/plainError.ts` (installed in `main.tsx`), which turns database/network wording into plain words. Write your own messages in plain words anyway, and wrap any inline `{error}` text with `plainError(...)`.
- Brand: always "Apex Trophy Solutions" (`WORKSHOP.name` in `src/lib/workshop.ts`). Never expose the master PIN.
- The `src/app/components/ui/` folder is shadcn/ui; edit only when a real bug needs it (e.g. `input.tsx` forwards refs).

## Business rules (decided with the owner)

- The **order clock** starts the day the invoice is paid (`client_hunts.timeline_started_at`). Milestones: M1 skin & skull prep day 90, M2 tannery day 150, M3 completion day 180 (small) / 270 (medium) or production complete 365 (large), M4 dispatch & clearing day 425 (large). Green = all due milestones met; yellow = one overdue; red = two or more overdue or deadline passed; every missed milestone needs management feedback. Department time is a record for management only; the clock never stops.
- Only a department **lead** accepts a job card (name + time stamp); 24-hour acceptance flag; Mounting and Finishing need a time-stamped photo.
- Receiving condition report: only Fresh or Salted is required. Tannery soak report (in-house checklist or third-party) is accepted or rejected by a lead; a rejected skin notifies the outfitter, who must acknowledge it; outcomes: outfitter replacement, workshop stock, or client decides; management can let the other trophies carry on; a held trophy stays red until replaced or cancelled. The hunt register never changes; the job card and invoice do (credit note, then amended invoice).
- **Changing a mount** (`lib/mountRules.ts`, migration 063): a full mount can become a half body, shoulder or flat skin; a half body a shoulder; a shoulder or flat skin can never become a bigger mount (the skin was cut for it) and the client may instead buy a skin from stock (credit, hide purchase, new card, and a decision about the first skin). Nothing can change once the trophy reaches Mounting. Only admins edit job cards. Before mounting the client still pays for tanning already done.
- Quotes are the invoices; payments recorded by hand today (Xero link not built).

## Trying the screens with fake data

`tools/devmock/README.md` explains how to open every portal locally with made-up data (no real sign-in). Walk new screens on a phone-size window as a first-time user would. Remove the temporary files before committing.
