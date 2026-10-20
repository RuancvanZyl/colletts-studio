# Releasing the new version (task flow + offline + communications)

Three branches are stacked and ready: `feature/task-flow` → `feature/offline` → `feature/communications`.
Merging the last one brings in all three. **Nothing below has been merged to `main` yet, so the live site is unchanged.**

## 0. Before you start (5 minutes)
- In Supabase → **Table Editor**, export `clients`, `client_hunts`, `hunt_documents` as CSV (free plan has no automatic backup).
- Do this outside working hours or when nobody is mid-task.

## 1. Run the three database scripts, in this order
Supabase → SQL Editor → paste the whole file → Run. Each must say *Success*.
1. `supabase/migrations/041_task_flow.sql`
2. `supabase/migrations/042_offline_sync.sql`
3. `supabase/migrations/043_communications.sql`

Check after each (should return rows / true):
```sql
-- after 041
SELECT count(*) AS checklist_steps FROM department_checklist_items;           -- about 68
-- after 042
SELECT count(*) FROM information_schema.routines WHERE routine_name = 'job_check_item';   -- 1
-- after 043
SELECT full_name, manages_departments FROM staff_profiles WHERE cardinality(manages_departments) > 0;
```
All three scripts were also run against a real Postgres engine with 41 automatic checks (`pnpm test:db`) before this was written.

## 2. Put the new code live
```bash
cd ~/colletts-studio
git checkout main && git merge feature/communications && git push
```
Vercel deploys in about 2 minutes. If anything looks wrong, Vercel → Deployments → previous deployment → *Promote to Production*.

## 3. Launch-day cleanup
Run `supabase/launch/launch_cleanup.sql` once (it deletes nothing).

## 4. Set people up (Manage Staff)
For every person: **Works in** (the stations they see in My Tasks) and **Manages** (leave empty for ordinary workers).
Department managers can then send messages; workers can only read and confirm.

## 5. Quick check, per role
| Who | Check |
|---|---|
| Worker | My Tasks shows only their department; open a card → *Start task* → tick steps → *Mark complete* with a photo |
| Manager | Messages → New message to their department; Dispatch is admin-only |
| Admin | Dispatch Board: assign, priority, due date, *Push to top*; Messages → Everything (admin) |
| Anyone | Turn Wi-Fi off, tick a step: the banner says offline; turn Wi-Fi on: "All saved work has been sent" |

## Emergency switches (instant, nothing is lost)
- **Checklist rule blocking the floor?** Switch it off, switch it on later:
  ```sql
  ALTER TABLE hunt_documents DISABLE TRIGGER trg_job_card_protocol;   -- rule off
  ALTER TABLE hunt_documents ENABLE  TRIGGER trg_job_card_protocol;   -- rule back on
  ```
- **Wrong person can send messages?** Manage Staff → clear their *Manages* boxes.
- **Bad deployment?** Vercel → previous deployment → Promote.
- The database changes only *add* columns and tables, so the previous code keeps working against the new database.

## What this release does not include yet
Receiving Sheet offline (needs a connection for now), Workshop Setup screen (add stations / edit checklists in the app — the
checklists can be edited directly in the table `department_checklist_items` until then), invoicing.
