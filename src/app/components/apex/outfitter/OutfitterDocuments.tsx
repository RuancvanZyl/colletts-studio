/** OutfitterDocuments — the paperwork for each hunt: what the workshop still needs from the outfitter, and a place to hand it in. */
import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { docsSummary, STATUS_LABEL, STATUS_TONE, RESPONSIBLE_LABEL, uploadHuntFiles, waiting } from '../../../../lib/docs';

interface Item { id: string; name: string; responsible: string; status: string; reason: string | null; needs_signature: boolean; needs_stamp: boolean; requested_at: string; files: number }
interface H { hunt_id: string; ref: string | null; hunter: string; items: Item[] }
interface Problem { key: string; level: string; where: string; message: string; overridden: boolean }

export function OutfitterDocuments({ onAsk }: { onAsk: (huntId: string) => void }) {
  const [hunts, setHunts] = useState<H[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problems, setProblems] = useState<Record<string, Problem[]>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<{ hunt: string; req: string } | null>(null);

  const load = async () => {
    const { data } = await (supabase as any).rpc('outfitter_documents_overview'); setHunts(data ?? []);
    const pr: Record<string, Problem[]> = {};
    await Promise.all((data ?? []).map(async (h: H) => { const { data: f } = await (supabase as any).rpc('check_hunt_register', { p_hunt: h.hunt_id }); pr[h.hunt_id] = (f ?? []).filter((x: Problem) => x.level === 'error' && !x.overridden && x.key !== 'register:missing'); }));
    setProblems(pr);
  };
  useEffect(() => { load(); }, []);

  async function upload(files: FileList | null) {
    const t = target.current;
    if (!files?.length || !t) return;
    setBusy(t.req);
    try {
      const paths = await uploadHuntFiles(t.hunt, Array.from(files));
      const { error } = await (supabase as any).rpc('submit_requirement', { p_req: t.req, p_paths: paths });
      if (error) throw new Error(error.message);
      toast.success('Sent to the workshop'); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  if (!hunts) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Documents</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Trophies can only be exported when every document is correct, complete, signed and stamped. Hand in the ones on your list so the hunters' trophies can ship.</p>
      </div>
      {hunts.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-slate-500">No documents are needed yet.</p>}
      {hunts.map(h => {
        const mine = h.items.filter(i => i.responsible === 'outfitter' && !['approved'].includes(i.status));
        const todo = mine.filter(i => ['awaiting', 'rejected'].includes(i.status)).length;
        return (
          <section key={h.hunt_id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3">
              <div className="flex-1 min-w-0"><p className="text-lg font-bold text-slate-900 dark:text-slate-100">{h.hunter}</p>{(() => { const sm = docsSummary({ outstanding: h.items.filter(i => ['awaiting', 'rejected'].includes(i.status)).length, toCheck: h.items.filter(i => i.status === 'received').length, approved: h.items.filter(i => i.status === 'approved').length });
                  return <><span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${sm.tone}`}>{sm.label}</span><p className={`text-sm font-semibold mt-1 ${todo ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>{todo ? `${todo} document${todo > 1 ? 's' : ''} needed from you` : 'Nothing needed from you'}</p></>; })()}</div>
              <button className="min-h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-100" onClick={() => onAsk(h.hunt_id)}><MessageSquare className="w-4 h-4" />Ask a question</button>
            </div>
            {(problems[h.hunt_id] ?? []).length > 0 && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-red-50 dark:bg-red-950/20 space-y-1.5">
                <p className="font-bold text-red-800 dark:text-red-300">The workshop found {problems[h.hunt_id].length} problem{problems[h.hunt_id].length > 1 ? 's' : ''} on the hunt register</p>
                <ul className="text-sm text-red-900 dark:text-red-200 list-disc pl-5 space-y-1">{problems[h.hunt_id].map(p => <li key={p.key}><strong>{p.where}:</strong> {p.message}</li>)}</ul>
                <p className="text-xs text-red-800 dark:text-red-300">Please send a corrected register, or ask a question.</p>
              </div>
            )}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {h.items.map(i => (
                <li key={i.id} className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 dark:text-slate-100">{i.name}</p><p className="text-xs text-slate-500">{RESPONSIBLE_LABEL[i.responsible]} supplies this{i.needs_signature ? ' · signed' : ''}{i.needs_stamp ? ' · stamped' : ''}{['awaiting', 'rejected'].includes(i.status) ? ` · waiting ${waiting(i.requested_at)}` : ''}</p></div>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${STATUS_TONE[i.status]}`}>{STATUS_LABEL[i.status]}</span>
                  </div>
                  {i.status === 'rejected' && i.reason && <p className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-2.5">The workshop sent this back: {i.reason}</p>}
                  {i.responsible === 'outfitter' && !['approved', 'received'].includes(i.status) && (
                    <button disabled={busy === i.id} className="w-full min-h-12 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50" onClick={() => { target.current = { hunt: h.hunt_id, req: i.id }; setTimeout(() => fileRef.current?.click(), 0); }}>
                      {busy === i.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}{i.status === 'rejected' ? 'Send a corrected copy' : 'Take a photo or choose a file'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
