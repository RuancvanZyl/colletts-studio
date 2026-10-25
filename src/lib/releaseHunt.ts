/**
 * Release a hunt to the workshop: once the hunter has chosen and the work is authorised (payment received),
 * management turns everything we know into the working job cards and starts the flow — each animal moves out of
 * Receiving into its first workshop department, gets its due date from the order timeline, a clean record of what
 * was received, and the hunter is told that work has started.
 */
import { supabase } from './supabase';
import { getNextDepartment, DEPT_LABELS } from './pipeline';
import { listParts } from './received';

export interface ReleasePlan {
  docId: string; species: string; mount: string; toDept: string; toLabel: string;
  received: string; instructions: string; condition: string; combinedParent: string | null;
}
export interface ReleasePreview {
  authorised: boolean; deadline: string | null; clientId: string; clientName: string; ref: string;
  plans: ReleasePlan[]; notArrived: number; noMount: number; alreadyReleased: number;
}

export async function planRelease(huntId: string): Promise<ReleasePreview> {
  const { data: hunt } = await (supabase as any).from('client_hunts')
    .select('ref_number, deadline_current, work_authorised_at, quote_required, client_id, clients(full_name)').eq('id', huntId).single();
  const { data: docs } = await (supabase as any).from('hunt_documents')
    .select('id, status, current_department, form_data').eq('hunt_id', huntId).eq('doc_type', 'job_card');
  const rows: any[] = docs ?? [];
  const live = rows.filter(d => !['completed', 'complete', 'cancelled'].includes(d.status));
  const plans: ReleasePlan[] = [];
  let notArrived = 0, noMount = 0, alreadyReleased = 0;
  for (const d of live) {
    const fd = d.form_data ?? {};
    if (d.status === 'awaiting_arrival') { notArrived++; continue; }
    if (fd.released_at || d.current_department !== 'receiving') { alreadyReleased++; continue; }
    const mount = String(fd.mount_type ?? '');
    if (!mount || /^pending instructions$/i.test(mount)) { noMount++; continue; }
    const to = getNextDepartment(mount, 'receiving') ?? 'skinning';
    const parts = (fd.received_parts ?? []).map((p: any) => p.code);
    plans.push({
      docId: d.id, species: fd.species ?? 'Animal', mount, toDept: to, toLabel: DEPT_LABELS[to] ?? to,
      received: parts.length ? listParts(parts, fd.received_other) : 'not recorded', instructions: fd.instructions ?? '',
      condition: fd.condition ?? '', combinedParent: fd.custom_parent ?? null,
    });
  }
  return {
    authorised: !!hunt?.work_authorised_at || !hunt?.quote_required, deadline: hunt?.deadline_current ?? null,
    clientId: hunt?.client_id, clientName: hunt?.clients?.full_name ?? '', ref: hunt?.ref_number ?? '',
    plans, notArrived, noMount, alreadyReleased,
  };
}

export async function releaseHunt(huntId: string, preview: ReleasePreview, staff: { id: string | null; name: string }): Promise<void> {
  const now = new Date().toISOString();
  for (const p of preview.plans) {
    const { data: cur, error: e1 } = await (supabase as any).from('hunt_documents').select('form_data').eq('id', p.docId).single();
    if (e1) throw new Error(e1.message);
    const fd = cur.form_data ?? {};
    const entry = { dept: 'receiving', completedBy: staff.name, completedAt: fd.received_at ?? now, notes: `Received: ${p.received}${p.condition ? ` · ${p.condition}` : ''}` };
    const { error } = await (supabase as any).from('hunt_documents').update({
      current_department: p.toDept, status: 'in_progress', last_moved_at: now, due_date: preview.deadline,
      form_data: { ...fd, released_at: now, released_by: staff.name, stage_history: [...(fd.stage_history ?? []), entry] },
    }).eq('id', p.docId);
    if (error) throw new Error(`${p.species}: ${error.message}`);
    await (supabase as any).from('trophy_stage_history').insert({
      hunt_doc_id: p.docId, department: 'receiving', completed_by: staff.id, completed_by_name: staff.name, notes: entry.notes, completed_at: now,
    });
  }
  if (preview.plans.length && preview.clientId) {
    await (supabase as any).from('client_notifications').insert({
      client_id: preview.clientId, hunt_id: huntId, type: 'milestone', stage: 'work_started',
      title: 'Work has started on your trophies',
      body: `${preview.plans.length} animal${preview.plans.length > 1 ? 's are' : ' is'} now in the workshop. You can follow every stage, with photos, in My trophies.`,
    });
  }
}
