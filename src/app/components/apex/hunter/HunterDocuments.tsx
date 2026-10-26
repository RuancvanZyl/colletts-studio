/**
 * HunterDocuments — honest about the paperwork. Trophies can only ship once every export document is correct,
 * complete, signed and stamped, and most of them come from the outfitter. The hunter sees who is holding what.
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { hunterWording, uploadHuntFiles, waiting } from '../../../../lib/docs';
import { WORKSHOP } from '../../../../lib/workshop';

interface Item { id: string; name: string; responsible: string; status: string; reason: string | null; requested_at: string }
interface H { hunt_id: string; ref: string | null; outfitter: string | null; items: Item[] }
const TONE = { ok: 'text-green-700 dark:text-green-300', wait: 'text-amber-800 dark:text-amber-300', bad: 'text-red-700 dark:text-red-300', info: 'text-sky-700 dark:text-sky-300' };

export function HunterDocuments() {
  const [hunts, setHunts] = useState<H[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<{ hunt: string; req: string } | null>(null);
  const load = async () => { const { data } = await (supabase as any).rpc('hunter_documents_overview'); setHunts(data ?? []); };
  useEffect(() => { load(); }, []);

  async function upload(files: FileList | null) {
    const t = target.current;
    if (!files?.length || !t) return;
    setBusy(t.req);
    try {
      const paths = await uploadHuntFiles(t.hunt, Array.from(files));
      const { error } = await (supabase as any).rpc('submit_requirement', { p_req: t.req, p_paths: paths });
      if (error) throw new Error(error.message);
      toast.success('Thank you. The workshop will check it.'); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  if (!hunts || hunts.length === 0) return null;
  return (
    <>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
      {hunts.map(h => {
        const open = h.items.filter(i => i.status !== 'approved');
        const byOutfitter = open.filter(i => i.responsible === 'outfitter' && ['awaiting', 'rejected'].includes(i.status));
        const done = open.length === 0;
        return (
          <section key={h.hunt_id} className={`rounded-2xl border-2 p-4 space-y-3 ${done ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'}`}>
            <div className="flex items-start gap-3">
              {done ? <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" /> : <FileText className="w-6 h-6 text-slate-500 shrink-0" />}
              <div>
                <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{done ? 'Your export documents are complete' : 'Documents for export'}</p>
                {!done && <p className="text-sm text-slate-700 dark:text-slate-200">Your trophies can only leave the country once every document is correct, complete, signed and stamped. {byOutfitter.length > 0 ? `${WORKSHOP.name} is also waiting for ${byOutfitter.length} document${byOutfitter.length > 1 ? 's' : ''} from ${h.outfitter ?? 'your outfitter'}. Your trophies cannot ship until they arrive.` : 'We will let you know as soon as they are all in place.'}</p>}
              </div>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {h.items.map(i => {
                const w = hunterWording(i, h.outfitter);
                return (
                  <li key={i.id} className="py-2.5 space-y-2">
                    <div><p className="font-semibold text-slate-900 dark:text-slate-100">{i.name}</p><p className={`text-sm font-medium ${TONE[w.tone]}`}>{w.text}{['awaiting', 'rejected'].includes(i.status) ? ` · ${waiting(i.requested_at)}` : ''}</p></div>
                    {i.responsible === 'hunter' && ['awaiting', 'rejected'].includes(i.status) && (
                      <button disabled={busy === i.id} className="w-full min-h-12 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50" onClick={() => { target.current = { hunt: h.hunt_id, req: i.id }; setTimeout(() => fileRef.current?.click(), 0); }}>
                        {busy === i.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}Send it to us
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
