/**
 * Completing a department stage — works with or without a connection.
 * Photos are kept on the device until they can be uploaded; the stage move is sent after them,
 * so a record never points at a photo that is not there.
 */
import { supabase } from '../supabase';
import { getNextDepartment } from '../pipeline';
import { blobPut, blobGet, blobDelete } from './idb';
import { classify, performActionWith, registerExecutor } from './outbox';
import type { Executor } from './outboxCore';

export interface CompleteArgs {
  doc: string;
  dept: string;
  mountType: string;
  notes: string;
  blobIds: string[];
  staffId: string | null;
  staffName: string | null;
}

const extOf = (b: Blob) => (b.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');

/** Executor used by the outbox (also callable directly). */
export const completeStageExecutor: Executor = async a => {
  const x = a.args as unknown as CompleteArgs;
  try {
    const { data: doc, error: readErr } = await (supabase as any)
      .from('hunt_documents').select('form_data, current_department, status, hunt_id, client_hunts(client_id)').eq('id', x.doc).maybeSingle();
    if (readErr) return classify(readErr);
    if (!doc) return { ok: false, retry: false, error: 'This job card no longer exists' };
    if (doc.current_department !== x.dept) {
      return { ok: false, retry: false, error: `This job card had already moved on from ${x.dept} (now at ${doc.current_department}). Nothing was changed.` };
    }

    // 1. photos first (stable names, so a retry overwrites instead of duplicating)
    const photoPaths: string[] = [];
    for (let i = 0; i < x.blobIds.length; i++) {
      const blob = await blobGet(x.blobIds[i]);
      if (!blob) continue;                       // already uploaded on an earlier attempt
      const path = `job-completions/${x.doc}/${x.dept}/${a.id}-${i}.${extOf(blob)}`;
      const { error } = await (supabase as any).storage.from('client-photos').upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
      if (error) return classify(error);
      photoPaths.push(path);
    }
    // photos uploaded on an earlier attempt: rebuild their paths deterministically
    if (photoPaths.length < x.blobIds.length) {
      for (let i = 0; i < x.blobIds.length; i++) {
        const p = `job-completions/${x.doc}/${x.dept}/${a.id}-${i}.jpg`;
        if (!photoPaths.some(q => q.startsWith(`job-completions/${x.doc}/${x.dept}/${a.id}-${i}.`))) photoPaths.push(p);
      }
    }

    // 1b. keep the photos in the trophy's gallery — shown to the client once the trophy is finished
    const clientId = doc.client_hunts?.client_id;
    if (clientId && photoPaths.length) {
      const finished = x.dept === 'photos' || x.dept === 'packing';
      const { error: gErr } = await (supabase as any).from('trophy_photos').upsert(
        photoPaths.map(path => ({
          client_id: clientId, hunt_id: doc.hunt_id, hunt_doc_id: x.doc, kind: finished ? 'finished' : 'progress',
          storage_path: path, shared_with_client: finished, taken_by: x.staffId, taken_by_name: x.staffName, taken_at: a.doneAt,
        })), { onConflict: 'storage_path' });
      if (gErr) return classify(gErr);
    }

    // 2. move the job on
    const next = getNextDepartment(x.mountType, x.dept);
    const history = [
      ...((doc.form_data?.stage_history as any[]) ?? []),
      { dept: x.dept, completedBy: x.staffName ?? 'Staff', completedAt: a.doneAt, photoPaths, notes: x.notes },
    ];
    const { error: upErr } = await (supabase as any).from('hunt_documents').update({
      current_department:     next ?? 'done',
      status:                 next ? 'in_progress' : 'completed',
      completion_photo_paths: photoPaths,
      completion_notes:       x.notes || null,
      completed_by_name:      x.staffName,
      form_data:              { ...(doc.form_data ?? {}), stage_history: history },
    }).eq('id', x.doc).eq('current_department', x.dept);
    if (upErr) return classify(upErr);

    // 3. audit trail with the real time the work was finished
    await (supabase as any).from('trophy_stage_history').insert({
      hunt_doc_id: x.doc, department: x.dept, completed_by: x.staffId, completed_by_name: x.staffName,
      photo_paths: photoPaths, notes: x.notes || null, completed_at: a.doneAt,
    });

    // 4. tell the client (best effort — never blocks the stage move)
    notifyClient(x.doc, doc.form_data ?? {}, next).catch(() => {});

    for (const id of x.blobIds) await blobDelete(id);
    return { ok: true };
  } catch (e: any) {
    return classify({ message: String(e?.message ?? e) });
  }
};

/**
 * Called by the screens. Saves photos on the device, queues the completion, and tries to send it now.
 *   { error: null, queued: false } sent        { error: null, queued: true } saved, will send later
 *   { error: '...', queued: false } the server refused it (e.g. checklist incomplete)
 */
export async function completeStage(opts: { doc: string; dept: string; mountType: string; notes: string; files: Blob[]; staffId: string | null; staffName: string | null }) {
  const blobIds: string[] = [];
  for (const f of opts.files) { const id = crypto.randomUUID(); await blobPut(id, f); blobIds.push(id); }
  const args: CompleteArgs = { doc: opts.doc, dept: opts.dept, mountType: opts.mountType, notes: opts.notes, blobIds, staffId: opts.staffId, staffName: opts.staffName };
  const r = await performActionWith('job_complete', args as unknown as Record<string, unknown>, opts.staffId);
  if (r.error) for (const id of blobIds) await blobDelete(id);   // refused → the photos are not needed
  return r;
}

const STAGE_COPY: Record<string, { type: string; title: string; body: string }> = {
  receiving:      { type: 'update',    title: 'Trophies received at workshop', body: 'Your trophies have been checked in and are in the production queue.' },
  tannery:        { type: 'update',    title: 'Tannery stage started',         body: 'Your skins and capes have entered the tannery. This typically takes 2–3 weeks.' },
  mounting:       { type: 'milestone', title: 'Mounting has begun',            body: 'Our taxidermists have started mounting your trophy. The artistry is underway.' },
  quality_check:  { type: 'milestone', title: 'Passed quality inspection ✓',   body: 'Your trophy has been thoroughly inspected and passed our quality control.' },
  packing:        { type: 'milestone', title: 'Being packed for shipment',     body: 'Your trophy is being carefully packed and crated for transport.' },
  administration: { type: 'ready',     title: '🎉 Your trophy is complete!',  body: 'All done — admin is finalising your paperwork. We will be in touch shortly to arrange delivery.' },
};

async function notifyClient(docId: string, fd: any, next: string | null) {
  if (!next || !STAGE_COPY[next]) return;
  const { data: row } = await (supabase as any).from('hunt_documents').select('hunt_id, client_hunts(client_id)').eq('id', docId).maybeSingle();
  const clientId = row?.client_hunts?.client_id;
  if (!clientId) return;
  const copy = STAGE_COPY[next];
  const label = fd.species ? `${fd.species}${fd.mount_type ? ` — ${fd.mount_type}` : ''}` : undefined;
  await (supabase as any).from('client_notifications').insert({
    client_id: clientId, hunt_doc_id: docId, hunt_id: row.hunt_id, type: copy.type, stage: next,
    title: label ? `${copy.title} · ${label}` : copy.title, body: copy.body,
    species: fd.species || null, mount_type: fd.mount_type || null,
  });
}

// Make the outbox able to replay completions, whichever screen is open when the connection returns
registerExecutor('job_complete', completeStageExecutor);

// re-exported so tests and tools use the very same outbox instance the executor is registered on
export { outbox, pendingActions } from "./outbox";
