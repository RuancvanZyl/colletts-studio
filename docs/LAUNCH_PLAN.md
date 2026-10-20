# Getting the app into the workshop — launch plan

Goal: staff using the app for real work within about two weeks, without losing a single trophy record.

## The principle
Don't switch everything on at once. Run the app **alongside the current paper / WhatsApp way** in one corner of the
workshop first, fix what real hands find, then widen it. Paper stays as the fallback for two weeks.

## Before anyone touches it (about 1 day of work)
1. **Run the database scripts** in order: `039` indexes, `040` flag resolutions, `041` task flow (after the code branch is merged).
2. **Supabase login settings** (Authentication → URL Configuration): Site URL `https://app.apextrophysolutions.com`,
   add redirect URLs. Without this, password reset and invites cannot work.
3. **Email sender**: custom SMTP in Supabase (limit is 2 emails/hour otherwise) and a verified domain in Resend so client
   emails really arrive. Create real mailboxes (Google Workspace / Microsoft 365): `info@`, `support@`, one per manager.
4. **Staff accounts**: scramble the 7 placeholder passwords; create real accounts in *Manage Staff* with real emails;
   set roles properly — admin only for owners; department managers; everyone else `department_staff`; assign departments.
   Turn on two-step login (MFA) for admins.
5. **Clean the data**: reset the stall clocks (otherwise the board screams "207 critically stalled" on day one), remove test
   records, merge duplicate clients, set the awaiting-instruction flags, delete the pre-2024 leftovers, standardise `complete` → `completed`.
6. **Job cards**: finish the backfill batches (about 100 active hunts remain). Anything left shows on the Client Status Board
   as "No job card" so managers can clear it in the first week.
7. **Hardware**: 2–3 tablets (one per area), a charger at each, workshop Wi-Fi covered end to end, a router on a UPS/inverter,
   4G failover. Install the app on each tablet to the home screen.
8. **Backups**: free Supabase has no point-in-time backup. Upgrade to Pro (about $25/month: daily backups, custom SMTP,
   no inactivity pausing) or schedule a weekly export. Do not go live without one of them.

## Week 1 — pilot (Receiving + one department)
- Receiving staff check trophies in with the app. One department (suggest Skinning/Salting) works from *My Tasks*.
- A manager sits with them for the first two days. Everything else continues on paper.
- 10-minute review every evening: what confused people, what was slow, what broke. Fix the same night.
- Success looks like: every trophy received that week has a job card; every job card moved was ticked and signed.

## Week 2 — add Tannery, Mounting, Finishing, Quality, Packing
- One department added every 1–2 days. Dispatch Board used by the owner each morning: assign, prioritise, set due dates.
- Managers start using the client flags (deposit not paid, awaiting instruction, waiting too long).

## Week 3 — paper retired
- Switch off the paper copies department by department once its numbers match for three days in a row.

## 30-minute training, per role
- **Worker**: open My Tasks → tap a client → *Start task* → tick the checklist → *Mark complete* with a photo. What to do with no internet.
- **Department manager**: Dispatch Board — assign, priority, due date, "push to top"; messages to staff.
- **Admin / owner**: whiteboard, client flags (resolve with a note), Deadline Watch, Manage Staff, Workshop Setup.
- Print a one-page cheat sheet per role and stick it next to each tablet.

## What to measure
Job cards without an owner; cards "assigned but not opened" for more than a day; cards past due; checklist overrides by admin;
number of support questions per day (should fall every day).

## Rollback
- Code: Vercel keeps every deployment — one click returns to the previous version.
- Data: nothing in the pilot deletes records; documents and job cards are only added or moved.
- Process: paper stays as the fallback until week 3.

## Risks and answers
| Risk | Answer |
|---|---|
| Power / internet cuts | Offline mode (see `OFFLINE_PLAN.md`), UPS on the router, tablets kept charged |
| Staff find it slower than paper | Big buttons, tablets at stations, one tap to start/complete; watch it in person in week 1 |
| Wrong data from the backfill | Managers correct as they go; every change is recorded with who and when |
| Nobody can log in | Admin can set a password from Manage Staff; two admins always |
| Email not arriving | Custom SMTP + verified domain before launch; test reset with a real mailbox |
