import { useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { plainError } from '../../../../lib/plainError';
import { savePhotos, shrinkPhoto } from '../../../../lib/offline/photos';
import { STORY_PARTS } from '../../../../lib/huntFilm';

interface Share { id: string; hunt_id: string | null; link: string | null; link_host: string; note: string | null; created_at: string; ref: string | null }
interface Hunt { id: string; ref: string | null }

/** The hunter shared one album with the workshop: open it, copy the photos in under the right part of the story, then delete the link.
 *  Also lets staff add hunt photos for a hunter who sent them some other way (WhatsApp, e-mail). */
export function PhotoShareBox({ clientId, onAdded }: { clientId: string; onAdded?: () => void }) {
  const { profile } = useAuth();
  const [shares, setShares] = useState<Share[]>([]);
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [huntId, setHuntId] = useState('');
  const [part, setPart] = useState('other');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const { data: h } = await (supabase as any).from('client_hunts').select('id, ref_number').eq('client_id', clientId).order('created_at', { ascending: false });
    const hs: Hunt[] = (h ?? []).map((x: any) => ({ id: x.id, ref: x.ref_number ?? null })); setHunts(hs); if (!huntId && hs[0]) setHuntId(hs[0].id);
    const { data, error } = await (supabase as any).from('photo_shares').select('id, hunt_id, link, link_host, note, created_at').eq('client_id', clientId).eq('status', 'waiting').order('created_at');
    if (error) { setShares([]); return; }
    setShares((data ?? []).map((x: any) => ({ ...x, ref: hs.find(y => y.id === x.hunt_id)?.ref ?? null })));
  }
  useEffect(() => { load(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(files: FileList | null, forHunt: string) {
    if (!files || files.length === 0 || !forHunt) return;
    setBusy(true);
    let done = 0, failed = 0;
    for (const f of [...files]) {   // one at a time, so a dozen big photos cannot run the phone out of memory
      try {
        const blob = await shrinkPhoto(f, 1600, 0.82);
        await savePhotos({ clientId, huntId: forHunt, docId: null, kind: 'hunt', shared: true, files: [blob], staffId: profile?.id ?? null, staffName: profile?.full_name ?? null, storyPart: part });
        done++;
      } catch { failed++; }
    }
    if (done) { toast.success(`${done} photo${done === 1 ? '' : 's'} added for the hunter`); onAdded?.(); }
    if (failed) toast.error(`${failed} could not be added. Please add those again.`);
    setBusy(false);
  }
  async function finish(s: Share) {
    const note = window.prompt('Photos copied? Add a short note (for example: copied 11 photos). The hunter\'s link is deleted and they are told their photos are ready.', '');
    if (note === null) return;
    const { error } = await (supabase as any).rpc('staff_finish_photo_share', { p_share: s.id, p_note: note || null });
    if (error) { toast.error(plainError(error.message)); return; }
    toast.success('The link is deleted and the hunter has been told'); load();
  }

  const uploader = (forHunt: string) => (
    <div className="flex flex-wrap items-center gap-2">
      <select value={part} onChange={e => setPart(e.target.value)} className="min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm">
        {STORY_PARTS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { add(e.target.files, forHunt); e.target.value = ''; }} />
      <button disabled={busy} onClick={() => fileRef.current?.click()} className="min-h-11 px-4 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}Add photos under this part
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      {shares.map(s => (
        <div key={s.id} className="rounded-xl border-2 border-sky-500 bg-sky-50 dark:bg-sky-950/20 p-3 space-y-2">
          <p className="font-bold text-slate-900 dark:text-slate-100">The hunter shared an album with us{s.ref ? ` (${s.ref})` : ''}</p>
          {s.note && <p className="text-sm text-slate-700 dark:text-slate-200">Their note: {s.note}</p>}
          {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 min-h-11 px-3 rounded-lg border border-sky-600 text-sky-800 dark:text-sky-200 font-semibold text-sm break-all"><ExternalLink className="w-4 h-4 shrink-0" />Open the album ({s.link_host})</a>}
          <p className="text-xs text-slate-600 dark:text-slate-300">Only look at this one album. Save the photos, add them below under the right part of the story, then delete the link. Never ask the hunter for a password.</p>
          {uploader(s.hunt_id ?? huntId)}
          <button onClick={() => finish(s)} className="min-h-11 px-4 rounded-lg border-2 border-sky-700 text-sky-800 dark:text-sky-200 font-bold">I have copied the photos: delete the link</button>
        </div>
      ))}
      {hunts.length > 0 && (
        <div>
          <button onClick={() => setOpen(o => !o)} className="min-h-11 text-sm font-semibold underline text-slate-700 dark:text-slate-200">{open ? 'Close' : 'Add hunt photos for this hunter (for example ones they sent on WhatsApp)'}</button>
          {open && (
            <div className="space-y-2 pt-2">
              {hunts.length > 1 && <select value={huntId} onChange={e => setHuntId(e.target.value)} className="min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm">{hunts.map(h => <option key={h.id} value={h.id}>{h.ref ?? 'Hunt'}</option>)}</select>}
              {uploader(huntId)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
