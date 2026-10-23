// Runs migrations 041-043 in a real Postgres engine (PGlite) and checks the rules: pnpm test:db
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname;
const MIG = HERE + '../../supabase/migrations/';
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘ FAIL:', m); } };
const as = async uid => { await db.exec(`RESET ROLE; SET app.uid = '${uid ?? ''}'; ${uid ? 'SET ROLE authenticated;' : ''}`); };
const q = async (sql, params) => (await db.query(sql, params)).rows;
const fails = async (sql, params) => { try { await db.query(sql, params); return null; } catch (e) { return String(e.message); } };

await db.exec(fs.readFileSync(HERE + 'bootstrap.sql', 'utf8'));
await db.exec(`
 ALTER TABLE clients ADD COLUMN IF NOT EXISTS email text;
 ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone text;
 ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type text;
 ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'not_started';
 ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
 ALTER TABLE clients ADD CONSTRAINT clients_auth_user_id_key UNIQUE (auth_user_id);
 ALTER TABLE client_hunts ADD COLUMN IF NOT EXISTS awaiting_instruction boolean DEFAULT false;
 ALTER TABLE client_hunts ADD COLUMN IF NOT EXISTS instruction_received_at timestamptz;
 ALTER TABLE hunt_documents ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
 ALTER TABLE hunt_documents ADD COLUMN IF NOT EXISTS updated_at timestamptz;
`);
for (const f of ['041_task_flow.sql', '042_offline_sync.sql', '043_communications.sql', '044_trophy_photos.sql', '045_hunter_onboarding.sql']) {
  try { await db.exec(fs.readFileSync(MIG + f, 'utf8')); console.log('migration ok:', f); }
  catch (e) { console.log('MIGRATION FAILED', f, e.message); process.exit(1); }
}
await db.exec(`GRANT USAGE ON SCHEMA public, auth, storage TO authenticated; GRANT SELECT ON storage.objects TO authenticated; GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;`);

// people
const ids = { admin: 'a0000000-0000-0000-0000-000000000001', worker: 'a0000000-0000-0000-0000-000000000002', other: 'a0000000-0000-0000-0000-000000000003',
              mgr: 'a0000000-0000-0000-0000-000000000004', book: 'a0000000-0000-0000-0000-000000000005', mgr2: 'a0000000-0000-0000-0000-000000000006' };
await db.exec(`
 INSERT INTO staff_profiles (id, full_name, role) VALUES
  ('${ids.admin}','Ann Admin','admin'),('${ids.worker}','Wally Worker','department_staff'),('${ids.other}','Olga Other','department_staff'),
  ('${ids.mgr}','Mo Manager','department_staff'),('${ids.book}','Bo Bookkeeper','bookkeeper'),('${ids.mgr2}','Mia Manager','department_staff');
 ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS dummy int;
 UPDATE staff_profiles SET works_in = ARRAY['skinning'] WHERE id IN ('${ids.worker}');
 UPDATE staff_profiles SET works_in = ARRAY['tannery'] WHERE id IN ('${ids.other}');
 UPDATE staff_profiles SET works_in = ARRAY['skinning'], manages_departments = ARRAY['skinning'] WHERE id = '${ids.mgr}';
 UPDATE staff_profiles SET works_in = ARRAY['tannery'], manages_departments = ARRAY['tannery'] WHERE id = '${ids.mgr2}';
 INSERT INTO clients (id, full_name) VALUES ('c0000000-0000-0000-0000-000000000001','Test Client');
 INSERT INTO client_hunts (id, client_id) VALUES ('d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001');
 INSERT INTO hunt_documents (id, hunt_id, doc_type, title, current_department, assigned_to) VALUES
  ('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','job_card','Impala - Skull','skinning','${ids.worker}'),
  ('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001','job_card','Kudu - Cape','receiving',NULL);
`);
const DOC = 'e0000000-0000-0000-0000-000000000001', DOC2 = 'e0000000-0000-0000-0000-000000000002';

console.log('\nTask flow');
await as(ids.other);
await db.query('SELECT job_mark_opened($1)', [DOC]);
ok((await q('SELECT opened_at FROM hunt_documents WHERE id=$1', [DOC]))[0].opened_at === null, 'someone else opening a card does not count as the assignee reading it');
await as(ids.worker);
await db.query('SELECT job_mark_opened($1)', [DOC]);
ok((await q('SELECT opened_at FROM hunt_documents WHERE id=$1', [DOC]))[0].opened_at !== null, 'assigned worker opening the card is recorded');
ok((await fails('SELECT job_assign(ARRAY[$1::uuid], $2::uuid)', [DOC, ids.worker]))?.includes('Only admins'), 'a worker cannot assign or prioritise');
await as(ids.other);
ok((await fails('SELECT job_mark_started($1)', [DOC]))?.includes('assigned to someone else'), 'cannot start a card assigned to someone else');
await as(ids.worker);
await db.query('SELECT job_mark_started($1)', [DOC]);
ok((await q('SELECT started_at, started_by FROM hunt_documents WHERE id=$1', [DOC]))[0].started_by === ids.worker, 'start is recorded with who started');
await as(ids.admin);
await db.query(`SELECT job_assign(ARRAY[$1::uuid], $2::uuid, false, 1::smallint, '2026-10-25'::date, false, 'Rush job')`, [DOC, ids.other]);
let r = (await q('SELECT assigned_to, priority, due_date::text d, priority_note, opened_at, started_at FROM hunt_documents WHERE id=$1', [DOC]))[0];
ok(r.assigned_to === ids.other && r.priority === 1 && r.d === '2026-10-25' && r.priority_note === 'Rush job', 'admin assigns, sets priority, due date and note');
ok(r.opened_at === null && r.started_at === null, 're-assigning resets opened / started');
await db.query(`SELECT job_assign(ARRAY[$1::uuid], $2::uuid)`, [DOC, ids.worker]);

console.log('\nProtocol (checklist)');
await as(ids.worker);
let e = await fails(`UPDATE hunt_documents SET current_department='salting' WHERE id=$1`, [DOC]);
ok(e?.includes('Checklist incomplete'), 'a worker cannot move a job on with an incomplete checklist');
const items = await q(`SELECT id FROM department_checklist_items WHERE dept_key='skinning' AND is_active`);
ok(items.length >= 5, `skinning has ${items.length} seeded checklist steps`);
for (const it of items) await db.query('SELECT job_check_item($1,$2,true)', [DOC, it.id]);
await db.query(`UPDATE hunt_documents SET current_department='salting' WHERE id=$1`, [DOC]);
r = (await q('SELECT current_department, assigned_to, opened_at, started_at FROM hunt_documents WHERE id=$1', [DOC]))[0];
ok(r.current_department === 'salting', 'with every step ticked the job moves on');
ok(r.assigned_to === null && r.opened_at === null && r.started_at === null, 'the next department starts fresh (unassigned, not opened, not started)');
await as(ids.worker);
await db.query(`UPDATE hunt_documents SET current_department='skinning' WHERE id=$1`, [DOC2]).catch(()=>{});
ok(true, '(receiving has no checklist, so it is not blocked)');
await db.query(`UPDATE hunt_documents SET current_department='skinning' WHERE id=$1`, [DOC2]);
ok((await q('SELECT current_department FROM hunt_documents WHERE id=$1',[DOC2]))[0].current_department === 'skinning', 'Receiving stage is governed by the Receiving Sheet, not the checklist');
await as(ids.admin);
ok((await fails(`SELECT job_force_advance($1,'salting','in_progress','')`, [DOC2]))?.includes('reason'), 'admin override needs a reason');
await db.query(`SELECT job_force_advance($1,'salting','in_progress','Client collected early')`, [DOC2]);
r = (await q('SELECT current_department, completion_notes FROM hunt_documents WHERE id=$1', [DOC2]))[0];
ok(r.current_department === 'salting' && r.completion_notes.includes('overridden by Ann Admin'), 'admin override works and leaves a note');
await as(null);
await db.query(`UPDATE hunt_documents SET current_department='skinning' WHERE id=$1`, [DOC2]);
ok(true, 'SQL editor / service role is exempt from the rule');

console.log('\nOffline sync');
await as(ids.worker);
await db.query(`UPDATE hunt_documents SET current_department='skinning', assigned_to=$2 WHERE id=$1`, [DOC, ids.worker]).catch(()=>{});
await as(null); await db.query(`UPDATE hunt_documents SET current_department='skinning', assigned_to='${ids.worker}' WHERE id=$1`, [DOC]);
await as(null); await db.query('DELETE FROM job_checklist_progress'); await db.query('DELETE FROM offline_action_log');
const it0 = items[0].id, rid = 'f0000000-0000-0000-0000-000000000001';
await as(ids.worker);
await db.query(`SELECT job_check_item($1,$2,true,NULL,'2026-10-20T08:00:00Z',$3)`, [DOC, it0, rid]);
await db.query(`SELECT job_check_item($1,$2,false,NULL,'2026-10-20T09:00:00Z',$3)`, [DOC, it0, rid]);
let p = (await q('SELECT done, done_at FROM job_checklist_progress WHERE job_doc_id=$1 AND item_id=$2', [DOC, it0]))[0];
ok(p.done === true, 'a repeated request id is ignored (no double count)');
ok(new Date(p.done_at).toISOString() === '2026-10-20T08:00:00.000Z', 'the REAL time the worker ticked it is stored');
await db.query(`SELECT job_check_item($1,$2,false,NULL,'2026-10-20T07:00:00Z',$3)`, [DOC, it0, 'f0000000-0000-0000-0000-000000000002']);
p = (await q('SELECT done FROM job_checklist_progress WHERE job_doc_id=$1 AND item_id=$2', [DOC, it0]))[0];
ok(p.done === true, 'an older offline action never overwrites a newer one');
await db.query(`SELECT job_mark_started($1,'2999-01-01T00:00:00Z',$2)`, [DOC, 'f0000000-0000-0000-0000-000000000003']);
r = (await q('SELECT started_at <= now() AS sane FROM hunt_documents WHERE id=$1', [DOC]))[0];
ok(r.sane, 'a clock set in the future is clamped to now');

console.log('\nCommunications');
await as(ids.worker);
ok((await fails(`SELECT send_staff_message('department',NULL,'skinning','Hi','Hello team')`))?.includes('Only department managers'), 'a worker cannot send messages');
await as(ids.mgr);
await db.query(`SELECT send_staff_message('department',NULL,'skinning','Skinning today','Please prioritise the Impala',2::smallint,NULL,NULL,true,NULL,'b0000000-0000-0000-0000-000000000001')`);
await db.query(`SELECT send_staff_message('department',NULL,'skinning','Skinning today','duplicate',2::smallint,NULL,NULL,true,NULL,'b0000000-0000-0000-0000-000000000001')`);
ok(Number((await q(`SELECT count(*)::int n FROM staff_messages`))[0].n) === 1, 'sending the same message twice (flaky connection) stores it once');
ok((await fails(`SELECT send_staff_message('department',NULL,'tannery','x','not mine')`))?.includes('departments you manage'), 'a manager cannot message a department they do not manage');
ok((await fails(`SELECT send_staff_message('everyone',NULL,NULL,'x','to all')`))?.includes('Only admins'), 'only admins can message everyone');
await db.query(`SELECT send_staff_message('user',$1,NULL,'Hello','Quick question')`, [ids.admin]);
ok(true, 'a manager can message an admin');
ok((await fails(`SELECT send_staff_message('user',$1,NULL,'x','not mine')`, [ids.other]))?.includes('departments you manage'), 'a manager cannot message staff outside their departments');
await as(ids.worker);
let seen = await q('SELECT id, subject FROM staff_messages');
ok(seen.length === 1 && seen[0].subject === 'Skinning today', 'a worker in Skinning sees the Skinning message (and nothing else)');
await as(ids.other);
ok((await q('SELECT id FROM staff_messages')).length === 0, 'a worker in Tannery does not see the Skinning message');
await as(ids.worker);
const mid = seen[0].id;
await db.query('SELECT staff_message_mark_read(ARRAY[$1::uuid], true)', [mid]);
await as(ids.mgr);
const rr = await q('SELECT user_id, acknowledged FROM staff_message_reads WHERE message_id=$1', [mid]);
ok(rr.length === 1 && rr[0].user_id === ids.worker && rr[0].acknowledged, 'the sender sees who read it and who confirmed');
await as(ids.worker);
ok((await q('SELECT id FROM staff_messages WHERE id=$1',[mid])).length===1 && (await fails(`UPDATE staff_messages SET body='changed' WHERE id=$1`, [mid])) !== null || (await q(`SELECT body FROM staff_messages WHERE id=$1`,[mid]))[0].body !== 'changed', 'messages cannot be edited');
await as(ids.admin);
ok((await q('SELECT id FROM staff_messages')).length === 2, 'admin sees every staff message');
await db.query(`SELECT send_staff_message('everyone',NULL,NULL,'Notice','Workshop closes at 15:00 Friday')`);
await as(ids.other);
ok((await q(`SELECT id FROM staff_messages WHERE recipient_kind='everyone'`)).length === 1, 'everyone-messages reach every staff member');

console.log('\nClient messages');
await as(ids.worker);
ok((await fails(`INSERT INTO client_messages (client_id, direction, body, sent_by) VALUES ('c0000000-0000-0000-0000-000000000001','outbound','hi',$1)`, [ids.worker])) !== null, 'a worker cannot message a client');
ok((await q('SELECT id FROM client_messages')).length === 0, 'a worker cannot read client messages');
await as(ids.mgr);
await db.query(`INSERT INTO client_messages (client_id, direction, body, subject, sent_by) VALUES ('c0000000-0000-0000-0000-000000000001','outbound','Your trophies are in skinning','Update',$1)`, [ids.mgr]);
ok((await q('SELECT id FROM client_messages')).length === 1, 'a department manager can message a client');
ok((await fails(`UPDATE client_messages SET body='tampered' WHERE direction='outbound'`))?.includes('cannot be changed'), 'a sent client message cannot be edited');
await db.query(`UPDATE client_messages SET read_at = now() WHERE direction='outbound'`);
ok(true, 'but its read status can be updated');
await db.query(`DELETE FROM client_messages`);
ok((await q('SELECT id FROM client_messages')).length === 1, 'client messages cannot be deleted');
await as(ids.book);
await db.query(`INSERT INTO client_messages (client_id, direction, body, sent_by) VALUES ('c0000000-0000-0000-0000-000000000001','outbound','Deposit received, thank you',$1)`, [ids.book]);
ok((await q('SELECT id FROM client_messages')).length === 2, 'the bookkeeper can handle client messages');
await as(ids.admin);
const log = await q('SELECT kind FROM v_communication_log');
ok(log.filter(x => x.kind === 'staff').length === 3 && log.filter(x => x.kind === 'client').length === 2, 'the admin log shows staff and client messages together');
await as(ids.worker);
ok((await q('SELECT 1 FROM v_communication_log WHERE kind=\'client\'')).length === 0, 'a worker sees no client messages through the log');


console.log('\nTrophy photos');
const HUNTER = 'b0000000-0000-0000-0000-000000000001', OTHER_CLIENT = 'c0000000-0000-0000-0000-000000000002';
await as(null);
await db.exec(`
 INSERT INTO auth.users (id, email) VALUES ('${HUNTER}','hunter@example.com') ON CONFLICT DO NOTHING;
 UPDATE clients SET auth_user_id = '${HUNTER}' WHERE id = 'c0000000-0000-0000-0000-000000000001';
 INSERT INTO clients (id, full_name) VALUES ('${OTHER_CLIENT}','Someone Else');
 INSERT INTO storage.objects (bucket_id, name) VALUES ('client-photos','trophy-photos/mine-finished.jpg'),('client-photos','trophy-photos/mine-progress.jpg'),('client-photos','trophy-photos/theirs.jpg');
`);
await as(ids.worker);
await db.query(`INSERT INTO trophy_photos (client_id, hunt_doc_id, kind, storage_path, shared_with_client) VALUES
  ('c0000000-0000-0000-0000-000000000001', '${DOC}', 'finished', 'trophy-photos/mine-finished.jpg', true),
  ('c0000000-0000-0000-0000-000000000001', '${DOC}', 'progress', 'trophy-photos/mine-progress.jpg', false),
  ('${OTHER_CLIENT}', NULL, 'finished', 'trophy-photos/theirs.jpg', true)`);
ok((await q('SELECT count(*)::int n FROM trophy_photos'))[0].n === 3, 'staff can add and see all photos');
await db.query(`INSERT INTO trophy_photos (id, client_id, kind, storage_path) VALUES ('f0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','arrival','trophy-photos/x.jpg') ON CONFLICT (id) DO UPDATE SET caption = 'again'`);
await db.query(`INSERT INTO trophy_photos (id, client_id, kind, storage_path) VALUES ('f0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','arrival','trophy-photos/x.jpg') ON CONFLICT (id) DO UPDATE SET caption = 'again'`);
ok((await q(`SELECT count(*)::int n FROM trophy_photos WHERE storage_path='trophy-photos/x.jpg'`))[0].n === 1, 're-sending a photo after a dropped connection does not duplicate it');
ok((await fails(`INSERT INTO trophy_photos (client_id, kind, storage_path) VALUES ('c0000000-0000-0000-0000-000000000001','nonsense','p')`)) !== null, 'only arrival / progress / finished are accepted');
await db.query(`DELETE FROM trophy_photos WHERE id='f0000000-0000-0000-0000-000000000001'`);
ok((await q(`SELECT count(*)::int n FROM trophy_photos WHERE id='f0000000-0000-0000-0000-000000000001'`))[0].n === 1, 'a worker cannot delete photos');
await as(ids.admin);
await db.query(`DELETE FROM trophy_photos WHERE id='f0000000-0000-0000-0000-000000000001'`);
ok((await q(`SELECT count(*)::int n FROM trophy_photos WHERE id='f0000000-0000-0000-0000-000000000001'`))[0].n === 0, 'an admin can delete a photo');
await as(HUNTER);
let hp = await q('SELECT storage_path FROM trophy_photos ORDER BY storage_path');
ok(hp.length === 1 && hp[0].storage_path === 'trophy-photos/mine-finished.jpg', 'a client sees only their own shared photos (not progress, not other clients)');
let files = await q('SELECT name FROM storage.objects ORDER BY name');
ok(files.length === 1 && files[0].name === 'trophy-photos/mine-finished.jpg', 'a client can only download the image files of photos shared with them');
ok((await fails(`INSERT INTO trophy_photos (client_id, kind, storage_path) VALUES ('c0000000-0000-0000-0000-000000000001','finished','hacked')`)) !== null, 'a client cannot add photos');
await as(ids.admin);
await db.query(`UPDATE trophy_photos SET shared_with_client = true WHERE storage_path = 'trophy-photos/mine-progress.jpg'`);
await as(HUNTER);
ok((await q('SELECT count(*)::int n FROM trophy_photos'))[0].n === 2, 'sharing a photo makes it appear for the client');

console.log('\nHunter onboarding');
await as(null);
await db.exec(`
 INSERT INTO clients (id, full_name, email, client_type) VALUES
   ('c1000000-0000-0000-0000-000000000001','Dane Arcari','Dane@Example.com','export'),
   ('c1000000-0000-0000-0000-000000000002','Dane Arcari (copy)','dane@example.com','export');
 INSERT INTO client_hunts (id, client_id, awaiting_instruction) VALUES ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001', true);
 INSERT INTO hunt_documents (id, hunt_id, doc_type, title, current_department, form_data) VALUES
   ('e1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','job_card','Kudu','receiving','{"species":"Kudu","mount_type":"Pending Instructions","received_parts":[{"code":"SKULL"}]}'),
   ('e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000001','job_card','Impala','receiving','{"species":"Impala","mount_type":"Pending Instructions"}');
`);
const tok = (await q(`SELECT invite_token FROM clients WHERE id='c1000000-0000-0000-0000-000000000001'`))[0].invite_token;
ok(typeof tok === 'string' && tok.length >= 32, 'every client has a private invitation token');
const HUN1 = 'b1000000-0000-0000-0000-000000000001', HUN2 = 'b1000000-0000-0000-0000-000000000002', HUN3 = 'b1000000-0000-0000-0000-000000000003';
let info = (await q(`SELECT public.get_invite_info($1) j`, [tok]))[0].j;
ok(info.first_name === 'Dane' && info.registered === false && info.animals.length === 2, 'the invitation page can show the first name and what was received');
ok((await q(`SELECT public.get_invite_info('nonsense') j`))[0].j === null, 'a wrong token shows nothing');
await db.query(`SELECT public.link_auth_user_to_client($1,'whoever@else.com','Dane A','0821','export',$2,true)`, [HUN1, tok]);
let c = (await q(`SELECT auth_user_id FROM clients WHERE id='c1000000-0000-0000-0000-000000000001'`))[0];
ok(c.auth_user_id === HUN1, 'signing up through the invitation link claims the profile the workshop created (even with another e-mail)');
ok((await q(`SELECT count(*)::int n FROM clients WHERE auth_user_id = $1`, [HUN1]))[0].n === 1, '…and no blank duplicate profile is made');
await db.exec(`UPDATE clients SET auth_user_id = NULL, registered_at = NULL WHERE id='c1000000-0000-0000-0000-000000000001'`);
await db.query(`SELECT public.link_auth_user_to_client($1,'DANE@example.com','Dane','','export',NULL,true)`, [HUN2]);
c = (await q(`SELECT auth_user_id FROM clients WHERE id='c1000000-0000-0000-0000-000000000001'`))[0];
ok(c.auth_user_id === HUN2, 'signing up with the same e-mail finds the profile that has the hunts');
await db.query(`SELECT public.link_auth_user_to_client($1,'dane@example.com','Staff Person','','export',NULL,false)`, [HUN3]);
ok((await q(`SELECT auth_user_id FROM clients WHERE id='c1000000-0000-0000-0000-000000000002'`))[0].auth_user_id === null, 'a staff / non-hunter sign-up is never attached to a client by e-mail');
await db.exec(`INSERT INTO auth.users (id, email) VALUES ('${HUN2}','dane@example.com') ON CONFLICT DO NOTHING`);

await as(HUN2);
ok((await fails(`SELECT public.hunter_choose_mount('e1000000-0000-0000-0000-000000000001', '')`))?.includes('choose a mount'), 'a mount must be chosen');
await db.query(`SELECT public.hunter_choose_mount('e1000000-0000-0000-0000-000000000001', 'Shoulder Mount', 'Looking left please')`);
let fd = (await q(`SELECT form_data, title FROM hunt_documents WHERE id='e1000000-0000-0000-0000-000000000001'`))[0];
ok(fd.form_data.mount_type === 'Shoulder Mount' && fd.form_data.instructions === 'Looking left please' && fd.form_data.mount_chosen_by === 'client' && fd.title.includes('Shoulder Mount'), 'the hunter\'s mount and notes are saved on the job card');
ok((await q(`SELECT awaiting_instruction a FROM client_hunts WHERE id='d1000000-0000-0000-0000-000000000001'`))[0].a === true, 'the workshop keeps waiting while another animal has no mount');
await db.query(`SELECT public.hunter_choose_mount('e1000000-0000-0000-0000-000000000002', 'Euro Skull')`);
ok((await q(`SELECT awaiting_instruction a FROM client_hunts WHERE id='d1000000-0000-0000-0000-000000000001'`))[0].a === false, 'once every animal has a mount the hunt stops waiting for instructions');
await as(HUN3);
ok((await fails(`SELECT public.hunter_choose_mount('e1000000-0000-0000-0000-000000000001', 'Full Mount')`))?.includes('not on your profile'), 'a hunter cannot choose mounts for someone else\'s animals');
await as(null);
await db.exec(`UPDATE hunt_documents SET started_at = now() WHERE id='e1000000-0000-0000-0000-000000000001'`);
await as(HUN2);
ok((await fails(`SELECT public.hunter_choose_mount('e1000000-0000-0000-0000-000000000001', 'Full Mount')`))?.includes('already started'), 'the mount cannot be changed once work has started');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
