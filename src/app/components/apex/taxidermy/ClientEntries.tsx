/**
 * ClientEntries — everything the client (the hunter) has entered, and what they are still busy filling in.
 * Part 1: unfinished work (kept on the server, so it is visible before they press Send).
 * Part 2: the hunts and animals they registered, the mount they chose, their instructions and any changes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, PencilLine, UserRound } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useLiveRefresh } from '../../../../lib/liveRefresh';
import { findSpecies, sciName } from '../../../../lib/species';
import { PART_LABEL } from '../../../../lib/received';
import { DEPT_LABELS } from '../../../../lib/pipeline';

interface Hunt { id: string; ref_number: string | null; year: number | string | null; operator: string | null; farm: string | null; country: string | null; notes: string | null; created_at: string; start_date: string | null; end_date: string | null; client_type: string | null; outfitters?: { name: string } | null }
interface Doc { id: string; hunt_id: string; title: string; status: string; current_department: string | null; form_data: any; created_at: string; updated_at: string | null }
interface Draft { name: string; data: any; updated_at: string }

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const dayOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const enteredBy = (fd: any) => (fd?.preregistered_by === 'client' ? 'the hunter' : fd?.preregistered_by === 'outfitter' ? 'the outfitter' : 'the workshop');
const isPending = (m?: string | null) => !m || /^pending instructions$/i.test(m.trim());

function whereIs(d: Doc): string {
  if (d.status === 'awaiting_arrival') return 'Waiting for it to arrive at the workshop';
  if (d.status === 'completed' || d.status === 'complete') return 'Finished';
  if (d.status === 'cancelled') return 'Cancelled';
  if (d.current_department === 'receiving') return 'At the workshop, in Receiving';
  return `In ${DEPT_LABELS[d.current_department ?? ''] ?? d.current_department ?? 'the workshop'}`;
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex gap-2 text-sm"><span className="w-36 shrink-0 text-slate-500 dark:text-slate-400">{label}</span><span className="flex-1 min-w-0 text-slate-900 dark:text-slate-100 break-words">{children}</span></div>;
}

function draftSummary(dr: Draft, docs: Doc[]): { title: string; lines: string[] } | null {
  const n = dr.name; const d = dr.data;
  const speciesOf = (id: string) => docs.find(x => x.id === id)?.form_data?.species ?? 'an animal';
  if (/:picks$/.test(n) && n.startsWith('mounts:') && d && typeof d === 'object') {
    const entries = Object.entries(d as Record<string, any>);
    const chosen = entries.filter(([, p]) => p?.mount);
    return { title: 'Choosing mounts', lines: [`${chosen.length} of ${entries.length} animals have a mount chosen so far`, ...entries.map(([id, p]) => `${speciesOf(id)}: ${p?.mount ? p.mount : 'not chosen yet'}${p?.notes ? ` · note: ${p.notes}` : ''}`)] };
  }
  if (/:items$/.test(n) && n.startsWith('add:') && Array.isArray(d)) {
    return { title: 'Adding animals to a new hunt', lines: d.length ? d.map((a: any) => `${a.base}${a.variant && a.variant !== 'Normal' ? `, ${a.variant}` : ''}`) : ['No animals added yet'] };
  }
  if (/:trophies$/.test(n) && n.startsWith('hunt:') && Array.isArray(d)) {
    return { title: 'Registering a hunt (animals)', lines: d.length ? d.map((t: any) => `${t.species}${t.quantity > 1 ? ` × ${t.quantity}` : ''}${t.mountType ? ` · ${t.mountType}` : ''}`) : ['No animals added yet'] };
  }
  if (/:details$/.test(n) && n.startsWith('hunt:') && d && typeof d === 'object') {
    return { title: 'Registering a hunt (details)', lines: [[d.year, d.operator, d.farm, d.country].filter(Boolean).join(' · ') || 'Nothing filled in yet', d.notes ? `Notes: ${d.notes}` : ''].filter(Boolean) };
  }
  if (/:(operator|start|end)$/.test(n) && n.startsWith('add:')) {
    const lbl = n.endsWith(':operator') ? 'Outfitter / PH' : n.endsWith(':start') ? 'Hunt started' : 'Hunt ended';
    return typeof d === 'string' && d ? { title: 'Adding animals to a new hunt', lines: [`${lbl}: ${d}`] } : null;
  }
  return null;   // steps and other internal bits are not worth showing
}

export function ClientEntries({ clientId }: { clientId: string }) {
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const db = supabase as any;
    const { data: h } = await db.from('client_hunts').select('*, outfitters(name)').eq('client_id', clientId).order('created_at', { ascending: false });
    const huntRows: Hunt[] = h ?? [];
    setHunts(huntRows);
    if (huntRows.length) {
      const { data: d } = await db.from('hunt_documents').select('id, hunt_id, title, status, current_department, form_data, created_at, updated_at').eq('doc_type', 'job_card').in('hunt_id', huntRows.map(x => x.id)).order('created_at');
      setDocs(d ?? []);
    } else setDocs([]);
    const { data: dr } = await db.from('client_drafts').select('name, data, updated_at').eq('client_id', clientId).order('updated_at', { ascending: false });
    setDrafts(dr ?? []);
    setLoading(false);
  }, [clientId]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  useLiveRefresh(['client_hunts', 'hunt_documents', 'client_drafts'], load);

  const groups = useMemo(() => {
    const m = new Map<string, { title: string; lines: string[]; at: string }>();
    for (const dr of drafts) { const s = draftSummary(dr, docs); if (!s) continue; const k = s.title; const cur = m.get(k); m.set(k, { title: k, lines: [...(cur?.lines ?? []), ...s.lines], at: !cur || dr.updated_at > cur.at ? dr.updated_at : cur.at }); }
    return [...m.values()];
  }, [drafts, docs]);

  if (loading) return <div className="flex items-center gap-2 text-slate-400 py-8"><Loader2 className="w-4 h-4 animate-spin" />Loading what the client entered…</div>;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2"><PencilLine className="w-4 h-4" />Still being filled in (not sent yet)</h3>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500 rounded-xl border border-slate-300 dark:border-slate-700 p-3">Nothing is being filled in right now.</p>
        ) : groups.map(g => (
          <div key={g.title} className="rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-1">
            <p className="font-bold text-slate-900 dark:text-slate-100">{g.title} <span className="font-normal text-xs text-slate-600 dark:text-slate-300">· last saved {when(g.at)}</span></p>
            <ul className="text-sm text-slate-800 dark:text-slate-200 list-disc pl-5">{g.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
            <p className="text-xs text-slate-600 dark:text-slate-300">The hunter has typed this but has not pressed Send yet.</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2"><UserRound className="w-4 h-4" />What the client has entered</h3>
        {hunts.length === 0 && <p className="text-sm text-slate-500 rounded-xl border border-slate-300 dark:border-slate-700 p-3">No hunts have been registered for this client yet.</p>}
        {hunts.map(h => {
          const list = docs.filter(d => d.hunt_id === h.id);
          return (
            <div key={h.id} className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 space-y-0.5">
                <p className="font-bold text-slate-900 dark:text-slate-100">Hunt {h.ref_number || ''} {h.year ? `· ${h.year}` : ''} <span className="font-normal text-xs text-slate-500">· registered {dayOnly(h.created_at)}</span></p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{[h.outfitters?.name ?? h.operator, h.farm, h.country, h.client_type === 'local' ? 'Local' : h.client_type === 'export' ? 'Export' : ''].filter(Boolean).join(' · ') || 'No details'}{h.start_date || h.end_date ? ` · ${dayOnly(h.start_date)} to ${dayOnly(h.end_date)}` : ''}</p>
                {h.notes && <p className="text-sm text-slate-700 dark:text-slate-200">Notes: {h.notes}</p>}
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {list.length === 0 && <p className="p-4 text-sm text-slate-500">No animals on this hunt.</p>}
                {list.map(d => {
                  const fd = d.form_data ?? {};
                  const sp = findSpecies(fd.species);
                  const mount = fd.mount_type as string | undefined;
                  const parts: string[] = (fd.parts ?? []).map((p: any) => PART_LABEL[p.code] ?? p.label ?? p.code).filter(Boolean);
                  const history = [...(fd.mount_history ?? []).map((x: any) => ({ at: x.at, text: `Mount changed from ${x.from} to ${x.to} by ${x.by}${x.reason ? `: ${x.reason}` : ''}` })), ...(fd.edit_history ?? []).map((x: any) => ({ at: x.at, text: `Card edited by ${x.by}: ${x.reason}` }))]
                    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
                  return (
                    <div key={d.id} className="p-4 space-y-1.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{fd.species ?? d.title} {sciName(fd.species) && <span className="font-normal italic text-xs text-slate-500">{sciName(fd.species)}</span>}{sp?.note ? <span className="font-normal text-xs text-slate-500"> · {sp.note}</span> : null}</p>
                      <Line label="Entered by">{enteredBy(fd)}{fd.registered_at || d.created_at ? `, ${when(fd.registered_at ?? d.created_at)}` : ''}</Line>
                      {fd.tag_number && <Line label="Tag number">{fd.tag_number}</Line>}
                      {parts.length > 0 && <Line label="Parts listed">{parts.join(', ')}</Line>}
                      <Line label="Mount chosen">{isPending(mount) ? <span className="text-amber-600 dark:text-amber-400 font-semibold">Not chosen yet</span> : <strong>{mount}</strong>}{!isPending(mount) && fd.mount_chosen_at ? <span className="text-slate-500">{` (${fd.mount_chosen_by === 'client' ? 'by the hunter' : 'by the workshop'}, ${when(fd.mount_chosen_at)})`}</span> : null}</Line>
                      {(fd.pose?.head || fd.pose?.neck) && <Line label="Head and neck">{[fd.pose.head && `head ${String(fd.pose.head).toLowerCase()}`, fd.pose.neck && `neck ${String(fd.pose.neck).toLowerCase()}`].filter(Boolean).join(', ')}</Line>}
                      {fd.custom?.description && <Line label="Custom mount">{fd.custom.description}{(fd.custom.combined_with ?? []).length ? ` (combined with ${(fd.custom.combined_with as string[]).map(id => docs.find(x => x.id === id)?.form_data?.species ?? 'another animal').join(', ')})` : ''}</Line>}
                      {fd.replica?.type && <Line label="Replica">{fd.replica.type}{(fd.replica.reasons ?? []).length ? `: ${(fd.replica.reasons as string[]).join(', ')}` : ''}</Line>}
                      {fd.instructions && <Line label="Instructions">{fd.instructions}</Line>}
                      <Line label="Where it is">{whereIs(d)}</Line>
                      {history.length > 0 && <div className="pt-1 text-xs text-slate-600 dark:text-slate-300"><p className="font-semibold">Changes</p><ul className="list-disc pl-5">{history.map((x, i) => <li key={i}>{when(x.at)}: {x.text}</li>)}</ul></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
