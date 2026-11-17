/**
 * HuntStory — the hunter's own hunt photos, and the little film made from them.
 * They add photos (guided by the parts of the story), watch a free preview, and once the film is unlocked they can save it and share it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Film, Loader2, Lock, Play, Share2, Download, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { plainError } from '../../../../lib/plainError';
import { savePhotos, shrinkPhoto } from '../../../../lib/offline/photos';
import { HuntFilm, STORY_PARTS, PREVIEW_SECONDS, sortStory, makeAudioContext, type StoryPhoto } from '../../../../lib/huntFilm';
import { WORKSHOP } from '../../../../lib/workshop';
import { useBack } from '../../../../lib/back';
import { tellAboutMessage } from '../../../../lib/push';

interface HuntRow { id: string; ref: string | null; place: string; dates: string; species: string[] }
interface PhotoRow { id: string; path: string; part: string | null; caption: string | null; takenAt: string; thumb?: string }
interface VideoRow { id: string; status: 'preview' | 'unlocked' }

const MIN_PHOTOS = 3;
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export function HuntStory({ clientId, clientName, currency, onClose }: { clientId: string; clientName: string; currency: 'USD' | 'ZAR'; onClose: () => void }) {
  useBack(true, onClose);
  const [hunts, setHunts] = useState<HuntRow[]>([]);
  const [huntId, setHuntId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [video, setVideo] = useState<VideoRow | null>(null);
  const [setup, setSetup] = useState<'ok' | 'missing'>('ok');
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [albumShare, setAlbumShare] = useState<{ id: string; host: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [link, setLink] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [agree, setAgree] = useState(false);
  const [sharing, setSharing] = useState(false);

  // ── load the hunts ──
  useEffect(() => {
    (async () => {
      const { data: h } = await (supabase as any).from('client_hunts').select('id, ref_number, start_date, end_date, operator, outfitters(name)').eq('client_id', clientId).order('created_at', { ascending: false });
      const ids = (h ?? []).map((x: any) => x.id);
      const { data: docs } = ids.length ? await (supabase as any).from('hunt_documents').select('hunt_id, form_data').in('hunt_id', ids).eq('doc_type', 'job_card') : { data: [] };
      const rows: HuntRow[] = (h ?? []).map((x: any) => ({
        id: x.id, ref: x.ref_number ?? null, place: x.outfitters?.name ?? x.operator ?? '',
        dates: [fmtDate(x.start_date), fmtDate(x.end_date)].filter(Boolean).join(' – '),
        species: [...new Set((docs ?? []).filter((d: any) => d.hunt_id === x.id).map((d: any) => d.form_data?.species).filter(Boolean))] as string[],
      }));
      setHunts(rows); setHuntId(rows[0]?.id ?? null); setLoading(false);
    })();
  }, [clientId]);

  // ── the price (nothing shown while the film is free) ──
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('app_settings').select('key, value').in('key', ['video_price_usd', 'video_price_zar']);
      const v = Number((data ?? []).find((r: any) => r.key === (currency === 'ZAR' ? 'video_price_zar' : 'video_price_usd'))?.value);
      setPrice(v > 0 ? v : null);
    })();
  }, [currency]);

  // ── the photos and the film record of the chosen hunt ──
  const loadHunt = useCallback(async () => {
    if (!huntId) return;
    const { data } = await (supabase as any).from('trophy_photos').select('id, storage_path, story_part, caption, taken_at').eq('client_id', clientId).eq('hunt_id', huntId).eq('kind', 'hunt').order('taken_at');
    const rows: PhotoRow[] = (data ?? []).map((r: any) => ({ id: r.id, path: r.storage_path, part: r.story_part, caption: r.caption, takenAt: r.taken_at }));
    if (rows.length) {
      const { data: signed } = await (supabase as any).storage.from('client-photos').createSignedUrls(rows.map(r => r.path), 3600);
      (signed ?? []).forEach((s: any, i: number) => { if (rows[i]) rows[i].thumb = s.signedUrl ?? undefined; });
    }
    setPhotos(rows);
    const { data: vid, error } = await (supabase as any).rpc('hunter_start_video', { p_hunt: huntId });
    if (error) { setSetup('missing'); return; }
    const { data: mv } = await (supabase as any).from('memory_videos').select('id, status').eq('id', vid).maybeSingle();
    setVideo(mv ?? null); setSetup('ok');
    const { data: sh } = await (supabase as any).from('photo_shares').select('id, link_host').eq('hunt_id', huntId).eq('status', 'waiting').maybeSingle();
    setAlbumShare(sh ? { id: sh.id, host: sh.link_host } : null);
  }, [clientId, huntId]);
  useEffect(() => { loadHunt(); }, [loadHunt]);

  // ── adding and removing photos ──
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadNote, setUploadNote] = useState('');
  async function addPhotos(part: string, files: FileList | null) {
    if (!files || files.length === 0 || !huntId) return;
    // one photo at a time: opening a dozen big phone photos together can run a phone out of memory and make the app restart
    const list = [...files]; let done = 0, failed = 0;
    setUploading(part);
    for (const f of list) {
      setUploadNote(`Adding photo ${done + failed + 1} of ${list.length}…`);
      try {
        const blob = await shrinkPhoto(f, 1600, 0.82);
        await savePhotos({ clientId, huntId, docId: null, kind: 'hunt', shared: true, files: [blob], staffId: null, staffName: null, storyPart: part });
        done++;
      } catch { failed++; }
      if ((done + failed) % 3 === 0) await loadHunt();   // show them as they arrive
    }
    await loadHunt();
    setUploading(null); setUploadNote('');
    if (failed === 0) toast.success(done === 1 ? 'Photo added' : `${done} photos added`);
    else toast.error(`${done} added, ${failed} could not be added. Please add those again.`);
  }
  async function removePhoto(id: string) {
    const { error } = await (supabase as any).from('trophy_photos').delete().eq('id', id);
    if (error) { toast.error(plainError(error.message)); return; }
    setPhotos(p => p.filter(x => x.id !== id));
  }

  async function sendLink() {
    if (!huntId) return;
    setSharing(true);
    const { error } = await (supabase as any).rpc('hunter_share_photos', { p_hunt: huntId, p_link: link, p_consent: agree, p_note: shareNote || null });
    setSharing(false);
    if (error) { toast.error(plainError(error.message)); return; }
    toast.success('Thank you. We have your link and will copy your photos.');
    setLink(''); setShareNote(''); setAgree(false); setShareOpen(false); loadHunt();
  }
  async function takeLinkBack() {
    if (!albumShare) return;
    const { error } = await (supabase as any).rpc('hunter_withdraw_photo_share', { p_share: albumShare.id });
    if (error) { toast.error(plainError(error.message)); return; }
    toast.success('Your link has been deleted'); setAlbumShare(null);
  }

  // ── the film ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filmRef = useRef<HuntFilm | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'limit' | 'ended' | 'making' | 'made'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [asked, setAsked] = useState(false);
  const unlocked = video?.status === 'unlocked';
  const hunt = hunts.find(h => h.id === huntId);

  useEffect(() => () => { filmRef.current?.dispose(); }, []);
  // the film and its music stop at once when the app goes to the background
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden' && filmRef.current && state === 'playing') { filmRef.current.stop(); setState('idle'); } };
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', hide);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', hide); };
  }, [state]);
  function stopFilm() { filmRef.current?.stop(); setState('idle'); }
  useEffect(() => { filmRef.current?.dispose(); filmRef.current = null; setState('idle'); setResult(null); }, [huntId, photos.length]);

  async function prepare(): Promise<HuntFilm | null> {
    if (filmRef.current) return filmRef.current;
    if (!canvasRef.current || !hunt) return null;
    setState('loading');
    try {
      const sorted = sortStory(photos);
      const story: StoryPhoto[] = [];
      for (const p of sorted) {
        const { data, error } = await (supabase as any).storage.from('client-photos').download(p.path);
        if (error || !data) continue;
        story.push({ id: p.id, blob: data, part: p.part, caption: p.caption, takenAt: p.takenAt });
      }
      if (story.length === 0) throw new Error('Your photos could not be loaded. Please check your connection and try again.');
      const logo = await (await fetch('/apex-logo-blue.jpg')).blob().catch(() => null);
      const film = new HuntFilm(canvasRef.current, story, { hunterName: clientName, dates: hunt.dates, place: hunt.place, species: hunt.species, appUrl: WORKSHOP.portalUrl, logo });
      await film.load();
      filmRef.current = film; film.draw(2.4, !unlocked);
      return film;
    } catch (e: any) { setState('idle'); toast.error(plainError(e?.message ?? 'The film could not be made. Please try again.')); return null; }
  }

  async function playPreview() {
    const audioCtx = makeAudioContext();   // switched on inside the tap, before anything is awaited
    const film = await prepare(); if (!film) { audioCtx?.close(); return; }
    setState('playing');
    film.play({ preview: !unlocked, music: true, audioCtx, onEnd: reached => setState(reached ? 'limit' : 'ended') });
  }

  async function unlock() {
    if (!video) return;
    const { error } = await (supabase as any).rpc('hunter_unlock_video', { p_video: video.id });
    if (error) { toast.error(plainError(error.message)); return; }
    toast.success('Your film is unlocked');
    setVideo({ ...video, status: 'unlocked' }); filmRef.current?.dispose(); filmRef.current = null; setState('idle');
  }

  async function askWorkshop() {
    const { error } = await (supabase as any).from('client_messages').insert({ client_id: clientId, hunt_id: huntId, direction: 'inbound', channel: 'in_app', subject: 'Hunt film', body: 'I would like to unlock my full hunt film. Please let me know how to pay.', status: 'sent' });
    if (error) { toast.error('Could not send your request. Please try again.'); return; }
    tellAboutMessage('client_message'); setAsked(true);
  }

  async function makeFilm() {
    const audioCtx = makeAudioContext();
    const film = await prepare(); if (!film) { audioCtx?.close(); return; }
    film.stop(); setState('making'); setProgress(0);
    try {
      const out = await film.record({ music: true, audioCtx, onProgress: setProgress });
      setResult({ url: URL.createObjectURL(out.blob), blob: out.blob, ext: out.ext }); setState('made');
    } catch (e: any) { setState('idle'); toast.error(plainError(e?.message ?? 'The film could not be made. Please try again.')); }
  }

  const fileName = () => `${clientName.replace(/[^\w]+/g, '-')}-hunt-film.${result?.ext ?? 'mp4'}`;
  async function share() {
    if (!result) return;
    const file = new File([result.blob], fileName(), { type: result.blob.type });
    try {
      if ((navigator as any).canShare?.({ files: [file] })) await (navigator as any).share({ files: [file], title: 'My hunt', text: `My hunt with ${WORKSHOP.name}` });
      else save();
    } catch { /* closed the share sheet */ }
  }
  function save() { if (!result) return; const a = document.createElement('a'); a.href = result.url; a.download = fileName(); document.body.appendChild(a); a.click(); a.remove(); }

  const enough = photos.length >= MIN_PHOTOS;
  const pill = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4';

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-stone-50 dark:bg-stone-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-xl mx-auto p-4 space-y-5 pb-24">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="min-h-12 px-4 rounded-xl border-2 border-slate-400 font-bold inline-flex items-center gap-2"><ArrowLeft className="w-5 h-5" />Back</button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Film className="w-6 h-6" />Your hunt film</h1>
        </div>

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}
        {!loading && hunts.length === 0 && <p className={`${pill} text-slate-600 dark:text-slate-300`}>Once your hunt is on the app you can add your photos here and we will turn them into a film.</p>}

        {hunts.length > 1 && (
          <label className="block text-sm font-semibold">Which hunt?
            <select className="mt-1 w-full min-h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-base" value={huntId ?? ''} onChange={e => setHuntId(e.target.value)}>
              {hunts.map(h => <option key={h.id} value={h.id}>{[h.ref, h.place, h.dates].filter(Boolean).join(' · ')}</option>)}
            </select>
          </label>
        )}

        {hunt && setup === 'missing' && <p className={`${pill} text-slate-600 dark:text-slate-300`}>The hunt film is not switched on yet. Please check again soon.</p>}

        {hunt && setup === 'ok' && (
          <>
            {/* the guide */}
            <section className="rounded-2xl border-2 border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
              <p className="font-bold text-lg">Turn your hunt into a film</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">Add your photos below, in the part of the story they belong to. We put them in order, add slow movement, music, your name and our logo, and make a little film you can share with family and friends.</p>
              <ul className="text-sm text-slate-700 dark:text-slate-200 list-disc pl-5 space-y-1">
                <li><strong>Start wide.</strong> Sunrise, big skies, the bush at golden hour. Hold your phone sideways for scenery.</li>
                <li><strong>Tell it in order:</strong> the land, the camp, the team, the tracking, your animal, the moment.</li>
                <li><strong>Be close and clear</strong> with people and the animal. Upright photos fill the whole screen.</li>
                <li><strong>{MIN_PHOTOS} photos</strong> make a film, about 10 to 15 make a great one.</li>
              </ul>
            </section>

            {/* let the workshop collect them from one album */}
            <section className={`${pill} space-y-3`}>
              {albumShare ? (
                <>
                  <p className="font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" />We have your album link</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">It is from {albumShare.host}. We will copy your photos into your hunt film and tell you when they are ready. Then we delete your link.</p>
                  <button onClick={takeLinkBack} className="w-full min-h-12 rounded-xl border-2 border-slate-400 font-bold">Take my link back (delete it now)</button>
                </>
              ) : (
                <>
                  <button onClick={() => setShareOpen(o => !o)} className="w-full text-left">
                    <p className="font-bold">Rather let us collect your photos for you?</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">Share one album with us and we do the rest. It is safe: you choose the album, we only get a view-only link.</p>
                  </button>
                  {shareOpen && (
                    <div className="space-y-3">
                      <ol className="text-sm text-slate-700 dark:text-slate-200 list-decimal pl-5 space-y-1">
                        <li>Put your hunt photos in <strong>one album</strong> on your phone.</li>
                        <li><strong>iPhone:</strong> open the album, tap Share, then <em>Copy iCloud Link</em>. <strong>Google Photos:</strong> open the album, tap Share, then <em>Create link</em>. Dropbox, OneDrive and WeTransfer links work too.</li>
                        <li>Paste the link below and tick the box.</li>
                      </ol>
                      <p className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 p-2 text-sm"><strong>Never send us a password, your Apple ID or your Google login.</strong> We never need them. Only a share link for the one album.</p>
                      <input value={link} onChange={e => setLink(e.target.value)} inputMode="url" placeholder="Paste your album link here" className="w-full min-h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 text-base" />
                      <input value={shareNote} onChange={e => setShareNote(e.target.value)} placeholder="A note, for example the name of the album (optional)" className="w-full min-h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 text-base" />
                      <label className="flex items-start gap-3 text-sm text-slate-800 dark:text-slate-100 cursor-pointer">
                        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1 w-5 h-5" />
                        <span>I agree that the workshop may open this one link, copy the photos in it for my hunt film and keep them in my file. The workshop deletes the link afterwards, and I can take it back at any time.</span>
                      </label>
                      <button disabled={sharing || !link.trim() || !agree} onClick={sendLink} className="w-full min-h-14 rounded-xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">{sharing && <Loader2 className="w-5 h-5 animate-spin" />}Send my album link</button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* the photos, part by part */}
            <section className="space-y-3">
              <h2 className="font-bold text-lg">Your photos ({photos.length})</h2>
              {uploadNote && <p className="rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-700 p-3 text-sm font-semibold">{uploadNote} Please keep the app open.</p>}
              {STORY_PARTS.map(part => {
                const mine = photos.filter(p => (p.part ?? 'other') === part.key);
                return (
                  <div key={part.key} className={pill}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="font-bold">{part.label}</p><p className="text-sm text-slate-600 dark:text-slate-300">{part.hint}</p></div>
                      <input ref={el => { fileRefs.current[part.key] = el; }} type="file" accept="image/*" multiple className="hidden" onChange={e => { addPhotos(part.key, e.target.files); e.target.value = ''; }} />
                      <button disabled={!!uploading} onClick={() => fileRefs.current[part.key]?.click()} className="shrink-0 min-h-12 px-4 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold inline-flex items-center gap-2 disabled:opacity-60">
                        {uploading === part.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}{uploading === part.key ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                    {mine.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {mine.map(p => (
                          <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800">
                            {p.thumb && <img src={p.thumb} alt="" className="w-full h-full object-cover" />}
                            <button aria-label="Take this photo out" onClick={() => removePhoto(p.id)} className="absolute top-0.5 right-0.5 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center"><X className="w-4 h-4 text-white" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-slate-500">The workshop can see these photos too. They help us when your trophies arrive, so we know exactly how each animal looked in the field.</p>
            </section>

            {/* the film */}
            <section className="space-y-3">
              <h2 className="font-bold text-lg">Your film</h2>
              {!enough && <p className={`${pill} text-slate-700 dark:text-slate-200`}>Add at least {MIN_PHOTOS} photos to see your film. You have {photos.length}.</p>}
              <div className={`${enough ? '' : 'hidden'} space-y-3`}>
                <div className="relative mx-auto rounded-2xl overflow-hidden bg-black" style={{ width: 'min(100%, 340px)', aspectRatio: '9 / 16' }}>
                  <canvas ref={canvasRef} className={`w-full h-full ${state === 'made' ? 'hidden' : ''}`} />
                  {result && state === 'made' && <video src={result.url} controls playsInline className="w-full h-full" />}
                  {(state === 'idle' || state === 'loading' || state === 'ended') && (
                    <button onClick={playPreview} disabled={state === 'loading'} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-black/40">
                      {state === 'loading' ? <Loader2 className="w-10 h-10 animate-spin" /> : <Play className="w-14 h-14" />}
                      <span className="font-bold text-lg">{state === 'loading' ? 'Getting ready…' : unlocked ? 'Watch my film' : 'Watch the free preview'}</span>
                    </button>
                  )}
                  {state === 'playing' && <button onClick={stopFilm} className="absolute top-3 right-3 min-h-11 px-4 rounded-full bg-black/60 text-white font-bold text-sm">Stop</button>}
                  {state === 'limit' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white bg-black/70">
                      <Lock className="w-10 h-10" />
                      <p className="font-bold text-xl">That was your free preview</p>
                      <p className="text-sm text-white/85">Unlock your film to watch all of it, save it to your phone and share it.</p>
                    </div>
                  )}
                  {state === 'making' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white bg-black/70">
                      <Loader2 className="w-10 h-10 animate-spin" />
                      <p className="font-bold text-lg">Making your film…</p>
                      <div className="w-full h-2 rounded-full bg-white/25 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                      <p className="text-sm text-white/85">Please keep the app open and your screen on. It takes about as long as the film.</p>
                    </div>
                  )}
                </div>

                {!unlocked && state !== 'making' && (
                  <div className={`${pill} space-y-3`}>
                    <p className="text-sm text-slate-700 dark:text-slate-200">The preview is about {PREVIEW_SECONDS} seconds with a watermark. The full film has no watermark and you can save it and share it.</p>
                    {price == null ? (
                      <button onClick={unlock} className="w-full min-h-14 rounded-xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold inline-flex items-center justify-center gap-2"><Lock className="w-5 h-5" />Unlock my full film</button>
                    ) : asked ? (
                      <p className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />We have your request. We will tell you how to pay and unlock your film.</p>
                    ) : (
                      <>
                        <p className="font-bold">The full film is {currency === 'ZAR' ? 'R' : '$'}{price}</p>
                        <button onClick={askWorkshop} className="w-full min-h-14 rounded-xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold">Ask to unlock my film</button>
                        <p className="text-xs text-slate-500">Paying with Apple Pay inside the app is coming soon.</p>
                      </>
                    )}
                  </div>
                )}

                {unlocked && state !== 'making' && state !== 'made' && (
                  <button onClick={makeFilm} className="w-full min-h-14 rounded-xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold inline-flex items-center justify-center gap-2"><Film className="w-5 h-5" />Make my full film</button>
                )}

                {state === 'made' && result && (
                  <div className="space-y-2">
                    <p className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />Your film is ready</p>
                    <button onClick={share} className="w-full min-h-14 rounded-xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold inline-flex items-center justify-center gap-2"><Share2 className="w-5 h-5" />Share with family and friends</button>
                    <button onClick={save} className="w-full min-h-12 rounded-xl border-2 border-slate-400 font-bold inline-flex items-center justify-center gap-2"><Download className="w-5 h-5" />Save to my phone</button>
                    <button onClick={() => { setResult(null); setState('idle'); }} className="w-full min-h-11 text-slate-600 dark:text-slate-300 underline">Make it again (after changing photos)</button>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
