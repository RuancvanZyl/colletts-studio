/**
 * AnimalGuideEditor — the workshop fills in the hunter's field guide: a short description, facts, hunting notes,
 * the Roland Ward record, track notes, and real photos (animal, tracks, trophies, habitat).
 * Hunters see it from any animal card in their portal.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { SPECIES } from '../../../../lib/species';
import { speciesEmoji } from '../../../../lib/pricing';
import { shrinkPhoto } from '../../../../lib/offline/photos';
import { loadGuide, loadGuideIndex, PHOTO_KIND_LABEL, FACT_KIND_LABEL, type GuideFact, type GuidePhoto } from '../../../../lib/hooks/useSpeciesGuide';

const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-sm font-semibold text-slate-300 mb-1';
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function AnimalGuideEditor() {
  const [index, setIndex] = useState<Record<string, { guide: boolean; photos: number }>>({});
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const refreshIndex = () => loadGuideIndex().then(setIndex).catch(() => {});
  useEffect(() => { refreshIndex(); }, []);

  const list = useMemo(() => SPECIES.filter(s => s.name !== 'Other' && (!q.trim() || (s.name + ' ' + s.sci).toLowerCase().includes(q.trim().toLowerCase()))), [q]);
  const done = Object.values(index).filter(v => v.guide).length;

  if (open) return <Editor species={open} onBack={() => { setOpen(null); refreshIndex(); }} />;

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Animal guide</h1>
        <p className="text-base text-slate-400 mt-1">What hunters read about each animal: facts, hunting notes, the Roland Ward record and real photos. Add it whenever you have it, one animal at a time. {done} of {SPECIES.length - 1} have a page so far.</p>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className={`${field} pl-9`} placeholder="Search for an animal" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
        {list.map(s => {
          const i = index[s.name];
          return (
            <button key={s.name} onClick={() => setOpen(s.name)} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-16 hover:bg-[#162330]">
              <span className="text-2xl w-8 text-center">{speciesEmoji(s.name)}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-base font-semibold text-slate-100">{s.name}</span>
                <span className="block text-xs italic text-slate-500">{s.sci}</span>
              </span>
              {i?.guide && <span className="text-xs font-semibold rounded-full bg-emerald-900/50 text-emerald-300 px-2.5 py-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Page</span>}
              {i && i.photos > 0 && <span className="text-xs font-semibold rounded-full bg-sky-900/50 text-sky-300 px-2.5 py-1 flex items-center gap-1"><Camera className="w-3.5 h-3.5" />{i.photos}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Editor({ species, onBack }: { species: string; onBack: () => void }) {
  const { profile } = useAuth();
  const sp = SPECIES.find(s => s.name === species);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState('');
  const [facts, setFacts] = useState<GuideFact[]>([]);
  const [recLabel, setRecLabel] = useState(''); const [recValue, setRecValue] = useState(''); const [recNote, setRecNote] = useState('');
  const [tracks, setTracks] = useState('');
  const [photos, setPhotos] = useState<GuidePhoto[]>([]);
  const [upKind, setUpKind] = useState<'animal' | 'tracks' | 'trophy' | 'habitat'>('animal');
  const [upCaption, setUpCaption] = useState(''); const [upCredit, setUpCredit] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadGuide(species).then(({ guide, photos }) => {
      setSummary(guide?.summary ?? ''); setFacts(guide?.facts ?? []);
      setRecLabel(guide?.record_label ?? ''); setRecValue(guide?.record_value ?? ''); setRecNote(guide?.record_note ?? '');
      setTracks(guide?.tracks_note ?? ''); setPhotos(photos); setLoading(false);
    }).catch(() => setLoading(false));
  }, [species]);

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from('species_guide').upsert({
      species, summary: summary.trim() || null, facts: facts.filter(f => f.text.trim()).map(f => ({ kind: f.kind, text: f.text.trim() })),
      record_label: recLabel.trim() || null, record_value: recValue.trim() || null, record_note: recNote.trim() || null,
      tracks_note: tracks.trim() || null, updated_by: profile?.id ?? null, updated_at: new Date().toISOString(),
    }, { onConflict: 'species' });
    setSaving(false);
    if (error) toast.error(error.message.includes('row-level') ? 'Only admins can change the guide' : error.message);
    else toast.success('Guide saved. Hunters can see it now.');
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0;
    for (const f of Array.from(files)) {
      const blob = await shrinkPhoto(f, 2000, 0.85);
      const id = crypto.randomUUID();
      const path = `${slug(species)}/${id}.jpg`;
      const { error: upErr } = await (supabase as any).storage.from('species-guide').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) { toast.error(upErr.message.includes('row-level') ? 'Only admins can add photos' : upErr.message); continue; }
      const { error } = await (supabase as any).from('species_photos').insert({ id, species, kind: upKind, storage_path: path, caption: upCaption.trim() || null, credit: upCredit.trim() || null, sort_order: photos.length + ok });
      if (error) { toast.error(error.message); await (supabase as any).storage.from('species-guide').remove([path]); continue; }
      ok++;
    }
    setUploading(false);
    if (ok) { toast.success(`${ok} photo${ok > 1 ? 's' : ''} added`); setUpCaption(''); const d = await loadGuide(species); setPhotos(d.photos); }
  }

  async function removePhoto(p: GuidePhoto) {
    if (!window.confirm('Delete this photo?')) return;
    await (supabase as any).storage.from('species-guide').remove([p.storage_path]);
    const { error } = await (supabase as any).from('species_photos').delete().eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    setPhotos(prev => prev.filter(x => x.id !== p.id));
  }

  if (loading) return <div className="flex items-center gap-2 text-slate-400 py-10"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>;

  return (
    <div className="max-w-3xl space-y-6 pb-28">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-base text-[#3AAECC] font-semibold min-h-11"><ArrowLeft className="w-4 h-4" />All animals</button>
      <div className="flex items-center gap-3">
        <span className="text-5xl">{speciesEmoji(species)}</span>
        <div><h1 className="text-3xl font-bold text-slate-100 leading-tight">{species}</h1><p className="italic text-slate-400">{sp?.sci}</p></div>
      </div>

      <section className="space-y-2">
        <label className={lab}>Short description</label>
        <textarea rows={4} className={field} placeholder="A few lines about the animal, as in a field guide." value={summary} onChange={e => setSummary(e.target.value)} />
      </section>

      <section className="space-y-3 rounded-2xl border border-amber-700/60 bg-amber-950/20 p-4">
        <h2 className="text-lg font-bold text-amber-200">Roland Ward record</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={lab}>What is measured</label><input className={field} placeholder="e.g. Horn length" value={recLabel} onChange={e => setRecLabel(e.target.value)} /></div>
          <div><label className={lab}>The record</label><input className={field} placeholder="e.g. 73 1/2 in (186.7 cm)" value={recValue} onChange={e => setRecValue(e.target.value)} /></div>
        </div>
        <div><label className={lab}>Where, who and when <span className="font-normal text-slate-500">(optional)</span></label><input className={field} value={recNote} onChange={e => setRecNote(e.target.value)} /></div>
        <p className="text-xs text-slate-400">Copy the figure exactly from the Roland Ward record book so hunters can trust it.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-100">Facts</h2>
        {facts.map((f, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-2 rounded-xl border border-slate-700 bg-[#111c26] p-3">
            <select className={`${field} sm:w-48`} value={f.kind} onChange={e => setFacts(prev => prev.map((x, j) => j === i ? { ...x, kind: e.target.value as GuideFact['kind'] } : x))}>
              {(['cool', 'fact', 'hunting'] as const).map(k => <option key={k} value={k}>{FACT_KIND_LABEL[k]}</option>)}
            </select>
            <textarea rows={2} className={`${field} flex-1`} placeholder="One clear sentence or two" value={f.text} onChange={e => setFacts(prev => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
            <button aria-label="Remove fact" className="min-h-11 min-w-11 flex items-center justify-center text-red-400" onClick={() => setFacts(prev => prev.filter((_, j) => j !== i))}><Trash2 className="w-5 h-5" /></button>
          </div>
        ))}
        <button className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-600 text-slate-200 font-semibold px-4 min-h-12" onClick={() => setFacts(prev => [...prev, { kind: 'cool', text: '' }])}><Plus className="w-5 h-5" />Add a fact</button>
      </section>

      <section className="space-y-2">
        <label className={lab}>Tracks: how to recognise them</label>
        <textarea rows={3} className={field} placeholder="Shape, size, how they differ from similar animals." value={tracks} onChange={e => setTracks(e.target.value)} />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-700 bg-[#111c26] p-4">
        <h2 className="text-lg font-bold text-slate-100">Real photos</h2>
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map(p => (
              <div key={p.id} className="relative rounded-xl overflow-hidden border border-slate-700">
                <img src={p.url} alt="" className="w-full h-32 object-cover" loading="lazy" />
                <div className="px-2 py-1.5 text-xs text-slate-300"><span className="font-semibold">{PHOTO_KIND_LABEL[p.kind]}</span>{p.caption ? ` · ${p.caption}` : ''}{p.credit ? <span className="text-slate-500"> · © {p.credit}</span> : null}</div>
                <button aria-label="Delete photo" className="absolute top-1.5 right-1.5 w-9 h-9 rounded-full bg-black/70 text-red-300 flex items-center justify-center" onClick={() => removePhoto(p)}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          <div><label className={lab}>What the photo shows</label>
            <select className={field} value={upKind} onChange={e => setUpKind(e.target.value as any)}>{(['animal', 'tracks', 'trophy', 'habitat'] as const).map(k => <option key={k} value={k}>{PHOTO_KIND_LABEL[k]}</option>)}</select></div>
          <div><label className={lab}>Caption <span className="font-normal text-slate-500">(optional)</span></label><input className={field} value={upCaption} onChange={e => setUpCaption(e.target.value)} /></div>
          <div><label className={lab}>Photographer / credit</label><input className={field} placeholder="Who owns it" value={upCredit} onChange={e => setUpCredit(e.target.value)} /></div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
        <button className="w-full min-h-14 rounded-xl bg-[#0073ea] text-white text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}Add photos
        </button>
        <p className="text-xs text-slate-400">Only add photos you took yourself or have permission to use, and put the photographer in Credit. Photos are shrunk automatically.</p>
      </section>

      <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 bg-[#0F1A1C]/95 border-t border-slate-700 p-3 lg:left-60">
        <div className="max-w-3xl mx-auto"><button className="w-full min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60" disabled={saving} onClick={save}>{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}Save this animal's page</button></div>
      </div>
    </div>
  );
}
