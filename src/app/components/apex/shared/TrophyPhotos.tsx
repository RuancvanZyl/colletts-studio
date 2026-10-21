/**
 * Trophy photos — take them in the app (camera on a phone), see them, and share them with the client.
 *  <PhotoCapture>   camera / gallery picker → saved on the device, uploaded when there is a connection
 *  <PhotoGallery>   the photos for a trophy (staff can share/hide/delete; clients only ever see shared ones)
 *  <JobPhotosDialog> both together for one job card
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X, Eye, EyeOff, Trash2, CloudOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { pendingActions } from '../../../../lib/offline/outbox';
import { savePhotos, shrinkPhoto, type PhotoKind } from '../../../../lib/offline/photos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

export const KIND_META: Record<PhotoKind, { label: string; hint: string }> = {
  arrival:  { label: 'Arrival',  hint: 'How it looked when it came in' },
  progress: { label: 'Progress', hint: 'Work in progress — staff only' },
  finished: { label: 'Finished', hint: 'Ready to ship — the client can see these' },
};

interface Photo { id: string; kind: PhotoKind; storage_path: string; caption: string | null; shared_with_client: boolean; taken_by_name: string | null; taken_at: string; url?: string }

// ── Capture ──────────────────────────────────────────────────────────────────

export function PhotoCapture({ clientId, huntId, docId, kind, kinds, onKind, onSaved }: {
  clientId: string; huntId?: string | null; docId?: string | null;
  kind: PhotoKind; kinds?: PhotoKind[]; onKind?: (k: PhotoKind) => void; onSaved?: () => void;
}) {
  const { profile } = useAuth();
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ blob: Blob; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(kind !== 'progress');
  useEffect(() => { setShared(kind !== 'progress'); }, [kind]);
  useEffect(() => () => files.forEach(f => URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    const next: { blob: Blob; url: string }[] = [];
    for (const f of Array.from(list)) { const b = await shrinkPhoto(f); next.push({ blob: b, url: URL.createObjectURL(b) }); }
    setFiles(prev => [...prev, ...next]);
    setBusy(false);
  }

  async function save() {
    if (!files.length || busy) return;
    setBusy(true);
    const r = await savePhotos({ clientId, huntId, docId, kind, files: files.map(f => f.blob), shared, staffId: profile?.id ?? null, staffName: profile?.full_name ?? null });
    setBusy(false);
    if (r.error) { toast.error('Could not save photos: ' + r.error); return; }
    toast.success(r.queued ? `${files.length} photo${files.length > 1 ? 's' : ''} saved on this device — they will upload when the connection returns` : `${files.length} photo${files.length > 1 ? 's' : ''} saved`);
    files.forEach(f => URL.revokeObjectURL(f.url));
    setFiles([]);
    onSaved?.();
  }

  return (
    <div className="space-y-3">
      {kinds && kinds.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {kinds.map(k => (
            <button key={k} type="button" onClick={() => onKind?.(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${k === kind ? 'bg-[#0073ea] text-white border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {KIND_META[k].label}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">{KIND_META[kind].hint}</p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => camRef.current?.click()}
          className="flex-1 min-w-[140px] h-14 rounded-xl bg-[#0073ea] text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
          <Camera className="w-5 h-5" />Take photo
        </button>
        <button type="button" onClick={() => galRef.current?.click()}
          className="h-14 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-2">
          <ImagePlus className="w-5 h-5" />From gallery
        </button>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { pick(e.target.files); e.target.value = ''; }} />
      <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { pick(e.target.files); e.target.value = ''; }} />

      {files.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={f.url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <img src={f.url} alt="" className="w-full h-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => { URL.revokeObjectURL(f.url); setFiles(p => p.filter((_, j) => j !== i)); }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
              </div>
            ))}
          </div>
          {kind !== 'arrival' && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} className="w-4 h-4" />
              Let the client see {files.length > 1 ? 'these photos' : 'this photo'}
            </label>
          )}
          <button type="button" onClick={save} disabled={busy}
            className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save {files.length} photo{files.length > 1 ? 's' : ''}
          </button>
        </>
      )}
    </div>
  );
}

// ── Gallery ──────────────────────────────────────────────────────────────────

export function PhotoGallery({ docId, huntId, clientId, canManage = false, refreshKey = 0, kinds, empty = 'No photos yet' }: {
  docId?: string | null; huntId?: string | null; clientId?: string | null;
  canManage?: boolean; refreshKey?: number; kinds?: PhotoKind[]; empty?: string;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [big, setBig] = useState<string | null>(null);

  const load = useCallback(async () => {
    let q = (supabase as any).from('trophy_photos')
      .select('id, kind, storage_path, caption, shared_with_client, taken_by_name, taken_at').order('taken_at', { ascending: true }).limit(200);
    if (docId) q = q.eq('hunt_doc_id', docId); else if (huntId) q = q.eq('hunt_id', huntId); else if (clientId) q = q.eq('client_id', clientId);
    if (kinds) q = q.in('kind', kinds);
    const { data } = await q;
    const rows: Photo[] = data ?? [];
    if (rows.length) {
      const { data: urls } = await (supabase as any).storage.from('client-photos').createSignedUrls(rows.map(r => r.storage_path), 3600);
      const byPath = new Map<string, string>((urls ?? []).map((u: any) => [u.path, u.signedUrl]));
      rows.forEach(r => { r.url = byPath.get(r.storage_path) ?? ''; });
    }
    setPhotos(rows);
    setLoading(false);
    try {
      const p = await pendingActions('photo_add');
      setWaiting(p.filter(a => !docId || (a.args as any).docId === docId).reduce((n, a) => n + (((a.args as any).items?.length) ?? 0), 0));
    } catch { /* ignore */ }
  }, [docId, huntId, clientId, kinds?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load, refreshKey]);

  async function toggleShare(p: Photo) {
    const { error } = await (supabase as any).from('trophy_photos').update({ shared_with_client: !p.shared_with_client }).eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    setPhotos(prev => prev.map(x => x.id === p.id ? { ...x, shared_with_client: !p.shared_with_client } : x));
  }
  async function remove(p: Photo) {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return;
    await (supabase as any).storage.from('client-photos').remove([p.storage_path]);
    const { error } = await (supabase as any).from('trophy_photos').delete().eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    setPhotos(prev => prev.filter(x => x.id !== p.id));
  }

  if (loading) return <div className="flex items-center gap-2 text-xs text-slate-400 py-3"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading photos…</div>;

  const groups = (['arrival', 'progress', 'finished'] as PhotoKind[]).filter(k => !kinds || kinds.includes(k))
    .map(k => ({ k, rows: photos.filter(p => p.kind === k) })).filter(g => g.rows.length);

  return (
    <div className="space-y-3">
      {waiting > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400"><CloudOff className="w-3.5 h-3.5" />{waiting} photo{waiting > 1 ? 's are' : ' is'} saved on this device and will appear once uploaded</p>
      )}
      {groups.length === 0 && waiting === 0 && <p className="text-xs text-slate-400 py-2">{empty}</p>}
      {groups.map(g => (
        <div key={g.k}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{KIND_META[g.k].label}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {g.rows.map(p => (
              <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                {p.url ? <button type="button" className="w-full h-full" onClick={() => setBig(p.url!)}><img src={p.url} alt={p.caption ?? `${KIND_META[g.k].label} photo`} loading="lazy" className="w-full h-full object-cover" /></button>
                  : <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>}
                {canManage && (
                  <div className="absolute bottom-0 inset-x-0 flex justify-between p-1 bg-gradient-to-t from-black/60 to-transparent">
                    <button type="button" onClick={() => toggleShare(p)} title={p.shared_with_client ? 'Client can see this — tap to hide' : 'Hidden from client — tap to share'}
                      aria-label={p.shared_with_client ? 'Hide from client' : 'Share with client'} className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                      {p.shared_with_client ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                    <button type="button" onClick={() => remove(p)} title="Delete photo" aria-label="Delete photo" className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {big && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setBig(null)}>
          <button className="absolute top-4 right-4 text-white/80" aria-label="Close"><X className="w-6 h-6" /></button>
          <img src={big} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

// ── One job card: gallery + camera ───────────────────────────────────────────

export function JobPhotosDialog({ open, onClose, docId, huntId: huntIdIn, clientId: clientIdIn, title, defaultKind = 'progress' }: {
  open: boolean; onClose: () => void; docId: string; huntId?: string | null; clientId?: string | null; title: string; defaultKind?: PhotoKind;
}) {
  const [kind, setKind] = useState<PhotoKind>(defaultKind);
  const [tick, setTick] = useState(0);
  const [ids, setIds] = useState<{ clientId: string | null; huntId: string | null }>({ clientId: clientIdIn ?? null, huntId: huntIdIn ?? null });
  const [lookupFailed, setLookupFailed] = useState(false);
  useEffect(() => {
    if (ids.clientId || !open) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await (supabase as any).from('hunt_documents').select('hunt_id, client_hunts(client_id)').eq('id', docId).maybeSingle();
        if (!alive) return;
        if (data?.client_hunts?.client_id) setIds({ clientId: data.client_hunts.client_id, huntId: data.hunt_id });
        else setLookupFailed(true);
      } catch { if (alive) setLookupFailed(true); }
    })();
    return () => { alive = false; };
  }, [docId, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const { profile } = useAuth();
  const canManage = profile?.role === 'admin' || profile?.role === 'studio_manager';
  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Photos — {title}</DialogTitle></DialogHeader>
        {ids.clientId
          ? <PhotoCapture clientId={ids.clientId} huntId={ids.huntId} docId={docId} kind={kind} kinds={['arrival', 'progress', 'finished']} onKind={setKind} onSaved={() => setTick(t => t + 1)} />
          : <p className="text-sm text-slate-500">{lookupFailed ? 'Could not look up this client — check the connection and try again.' : 'Loading…'}</p>}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          <PhotoGallery docId={docId} canManage={canManage} refreshKey={tick} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A small "Photos" button that opens the dialog for one job card. */
export function JobPhotosButton({ docId, title, dept, huntId, clientId, className = '', dark = false }: {
  docId: string; title: string; dept?: string; huntId?: string | null; clientId?: string | null; className?: string; dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const kind: PhotoKind = dept === 'receiving' ? 'arrival' : dept === 'photos' || dept === 'packing' ? 'finished' : 'progress';
  return (
    <>
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold px-3 min-h-9 text-xs ${dark
          ? 'border-[rgba(58,174,204,0.4)] text-[#3AAECC] hover:bg-[rgba(58,174,204,0.12)]'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#0073ea] hover:text-[#0073ea]'} ${className}`}>
        <Camera className="w-3.5 h-3.5" />Photos
      </button>
      {open && <JobPhotosDialog open onClose={() => setOpen(false)} docId={docId} huntId={huntId} clientId={clientId} title={title} defaultKind={kind} />}
    </>
  );
}
