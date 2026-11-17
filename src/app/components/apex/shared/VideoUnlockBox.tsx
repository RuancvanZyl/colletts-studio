import { useEffect, useState } from 'react';
import { Film, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { plainError } from '../../../../lib/plainError';

interface Row { id: string; status: 'preview' | 'unlocked'; unlocked_how: string | null; unlocked_at: string | null; ref: string | null; photos: number }

/** The hunter's hunt films: where each one stands, and a button to unlock it once payment has been confirmed. */
export function VideoUnlockBox({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    const { data, error } = await (supabase as any).from('memory_videos').select('id, status, unlocked_how, unlocked_at, hunt_id, client_hunts(ref_number)').eq('client_id', clientId).order('created_at', { ascending: false });
    if (error) { setRows([]); return; }
    const out: Row[] = [];
    for (const r of data ?? []) {
      const { count } = await (supabase as any).from('trophy_photos').select('id', { count: 'exact', head: true }).eq('hunt_id', r.hunt_id).eq('kind', 'hunt');
      out.push({ id: r.id, status: r.status, unlocked_how: r.unlocked_how, unlocked_at: r.unlocked_at, ref: r.client_hunts?.ref_number ?? null, photos: count ?? 0 });
    }
    setRows(out);
  }
  useEffect(() => { load(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows || rows.length === 0) return null;
  async function unlock(id: string) {
    const note = window.prompt('Payment received? Add a short note for the record (for example: paid by EFT on the 12th).');
    if (note === null) return;
    setBusy(id);
    const { error } = await (supabase as any).rpc('staff_unlock_video', { p_video: id, p_note: note || null });
    setBusy(null);
    if (error) { toast.error(plainError(error.message)); return; }
    toast.success('The hunter\'s film is unlocked and they have been told'); load();
  }
  return (
    <div className="rounded-xl border border-amber-600/60 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
      <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Film className="w-4 h-4" />Hunt films</p>
      {rows.map(r => (
        <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-800 dark:text-slate-200">{r.ref ?? 'Hunt'} · {r.photos} photo{r.photos === 1 ? '' : 's'} · {r.status === 'unlocked' ? `unlocked${r.unlocked_how ? ` (${r.unlocked_how === 'free' ? 'free' : r.unlocked_how === 'paid' ? 'paid in the app' : 'by the workshop'})` : ''}` : 'preview only'}</span>
          {r.status === 'preview' && <button disabled={busy === r.id} onClick={() => unlock(r.id)} className="shrink-0 min-h-10 px-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold disabled:opacity-60">{busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Payment received: unlock'}</button>}
        </div>
      ))}
    </div>
  );
}
