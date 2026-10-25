/**
 * Arrival Check-In — trophies come through the door.
 *   1. Who is the hunter?   (find their profile, or make one)
 *   2. What did we receive?  (each animal, with the parts ticked off)
 *   3. Save → receiving sheet to print, welcome message to send, QR labels.
 * The hunter chooses the mounts afterwards, from their own profile.
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ArrowLeft, ArrowRight, Copy as CopyIcon, Loader2, Plus, Printer, Search, Tag, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { speciesEmoji } from '../../../../lib/pricing';
import { RECEIVED_PARTS, PART_PRESETS, CONDITIONS, partRecords, listParts } from '../../../../lib/received';
import { WORKSHOP } from '../../../../lib/workshop';
import { getInviteLink } from '../../../../lib/invite';
import { printDropOffPapers, type DropOffPrint } from '../../../../lib/print';
import { savePhotos, shrinkPhoto } from '../../../../lib/offline/photos';
import { InvitePanel } from '../shared/InvitePanel';
import { SpeciesField } from '../shared/AnimalPicker';
import { TrophyLabels } from './TrophyLabels';
import type { TrophyPart } from '../../../../lib/trophyParts';

interface FoundClient { id: string; full_name: string; email: string | null; phone: string | null; client_number: string | null; client_type: string | null; auth_user_id: string | null }
interface Animal { id: string; docId?: string; mount?: string; species: string; tag: string; condition: string; parts: string[]; other: string; notes: string; photos: File[]; previews: string[] }
interface OpenHunt { id: string; ref_number: string | null; year: string; status: string | null }

const emptyAnimal = (): Animal => ({ id: crypto.randomUUID(), species: '', tag: '', condition: 'fresh', parts: [], other: '', notes: '', photos: [], previews: [] });

const field = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const label = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
const bigBtn = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold min-h-12 px-5 text-base disabled:opacity-50';

export function ArrivalCheckIn({ onComplete }: { onComplete: () => void }) {
  const { profile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // 1 — hunter
  const [mode, setMode] = useState<'find' | 'new'>('find');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundClient[]>([]);
  const [searching, setSearching] = useState(false);
  const [client, setClient] = useState<FoundClient | null>(null);
  const [fresh, setFresh] = useState({ full_name: '', phone: '', email: '', country: '', client_type: 'export' });
  const [similar, setSimilar] = useState<FoundClient[]>([]);
  const [openHunts, setOpenHunts] = useState<OpenHunt[]>([]);
  const [newFile, setNewFile] = useState(false);

  // 2 — animals
  const [animals, setAnimals] = useState<Animal[]>([emptyAnimal()]);
  const [expected, setExpected] = useState<{ docId: string; species: string; mount: string; huntId: string }[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoFor, setPhotoFor] = useState<string | null>(null);

  // done
  const [result, setResult] = useState<null | { clientId: string; name: string; number: string; email: string | null; phone: string | null; registered: boolean; huntRef: string; year: number; animals: Animal[]; link: string | null }>(null);
  const [showLabels, setShowLabels] = useState(false);

  // find hunter (server-side search — works with any number of clients)
  useEffect(() => {
    if (mode !== 'find' || client) return;
    const q = query.trim().replace(/[%,()]/g, ' ');
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await (supabase as any).from('clients')
        .select('id, full_name, email, phone, client_number, client_type, auth_user_id')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,client_number.ilike.%${q}%`)
        .order('full_name').limit(8);
      setResults(data ?? []); setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, mode, client]);

  // new hunter: warn about people who look the same
  useEffect(() => {
    if (mode !== 'new') { setSimilar([]); return; }
    const name = fresh.full_name.trim().replace(/[%,()]/g, ' ');
    const email = fresh.email.trim().replace(/[%,()]/g, ' ');
    if (name.length < 4 && email.length < 5) { setSimilar([]); return; }
    const t = setTimeout(async () => {
      const parts = [name.length >= 4 ? `full_name.ilike.%${name}%` : '', email.length >= 5 ? `email.ilike.${email}` : ''].filter(Boolean).join(',');
      const { data } = await (supabase as any).from('clients').select('id, full_name, email, phone, client_number, client_type, auth_user_id').or(parts).limit(4);
      setSimilar(data ?? []);
    }, 350);
    return () => clearTimeout(t);
  }, [fresh.full_name, fresh.email, mode]);

  // existing hunter: is there an open hunt file to add to?
  useEffect(() => {
    setOpenHunts([]); setNewFile(false);
    if (!client) return;
    (async () => {
      const { data } = await (supabase as any).from('client_hunts').select('id, ref_number, year, status').eq('client_id', client.id).order('year', { ascending: false }).limit(5);
      setOpenHunts((data ?? []).filter((h: any) => h.status !== 'completed' && h.status !== 'cancelled'));
    })();
  }, [client]);

  // animals this hunter registered themselves after their hunt and that have not arrived yet
  useEffect(() => {
    setExpected([]);
    if (!client) return;
    (async () => {
      const { data: hunts } = await (supabase as any).from('client_hunts').select('id').eq('client_id', client.id);
      const ids = (hunts ?? []).map((h: any) => h.id);
      if (!ids.length) return;
      const { data } = await (supabase as any).from('hunt_documents').select('id, hunt_id, form_data').in('hunt_id', ids).eq('doc_type', 'job_card').eq('status', 'awaiting_arrival').limit(60);
      setExpected((data ?? []).map((d: any) => ({ docId: d.id, huntId: d.hunt_id, species: d.form_data?.species ?? 'Animal', mount: d.form_data?.mount_type ?? '' })));
    })();
  }, [client]);

  const clientType = client?.client_type ?? fresh.client_type;
  const who = client ? client.full_name : fresh.full_name.trim();
  const whoOk = client ? true : fresh.full_name.trim().length >= 2;
  const animalsOk = animals.length > 0 && animals.every(a => a.species.trim() && a.parts.length > 0 && (!a.parts.includes('OTHER') || a.other.trim()));

  const arrived = (e: { docId: string; species: string; mount: string }) => {
    setAnimals(prev => [...prev.filter(a => a.species || a.parts.length), { ...emptyAnimal(), docId: e.docId, species: e.species, mount: e.mount }]);
    setExpected(prev => prev.filter(x => x.docId !== e.docId));
  };
  const patch = (id: string, p: Partial<Animal>) => setAnimals(prev => prev.map(a => (a.id === id ? { ...a, ...p } : a)));
  const toggle = (a: Animal, code: string) => patch(a.id, { parts: a.parts.includes(code) ? a.parts.filter(c => c !== code) : [...a.parts, code] });
  const sameAgain = (a: Animal) => setAnimals(prev => [...prev, { ...emptyAnimal(), species: a.species, condition: a.condition, parts: [...a.parts], other: a.other }]);
  function addPhotos(files: FileList | null) {
    if (!files || !photoFor) return;
    const list = Array.from(files);
    setAnimals(prev => prev.map(a => a.id === photoFor ? { ...a, photos: [...a.photos, ...list].slice(0, 6), previews: [...a.previews, ...list.map(f => URL.createObjectURL(f))].slice(0, 6) } : a));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      // 1. the hunter
      let c = client;
      if (!c) {
        const { data, error } = await (supabase as any).from('clients').insert({
          full_name: fresh.full_name.trim(), phone: fresh.phone.trim() || null, email: fresh.email.trim() || null,
          country: fresh.country.trim() || null, client_type: fresh.client_type, onboarding_status: 'not_started',
        }).select('id, full_name, email, phone, client_number, client_type, auth_user_id').single();
        if (error) throw new Error(error.message);
        c = data as FoundClient;
      }
      // 2. the hunt file (only needed when some animals were not pre-registered by the hunter)
      const year = new Date().getFullYear();
      let huntId = ''; let huntRef = '';
      if (animals.some(a => !a.docId)) {
        const existing = !newFile ? openHunts[0] : null;
        if (existing) { huntId = existing.id; huntRef = existing.ref_number ?? ''; }
        else {
          const { data, error } = await (supabase as any).from('client_hunts')
            .insert({ client_id: c.id, year: String(year), status: 'active', client_type: c.client_type ?? 'export', quote_required: true }).select('id, ref_number').single();
          if (error) throw new Error(error.message);
          huntId = data.id; huntRef = data.ref_number ?? '';
        }
      }
      // 3. one job card per animal; mount is "Pending Instructions" until the hunter chooses
      const receivedAt = new Date().toISOString();
      const number = c.client_number ?? 'NEW';
      const { count: already } = huntId
        ? await (supabase as any).from('hunt_documents').select('id', { count: 'exact', head: true }).eq('hunt_id', huntId).eq('doc_type', 'job_card')
        : { count: 0 };
      let waitingForMount = false; let waitHunt = huntId;
      for (let i = 0; i < animals.length; i++) {
        const a = animals[i];
        const idx = (already ?? 0) + i + 1;
        const received = {
          received_parts: a.parts.map(code => ({ code, label: RECEIVED_PARTS.find(p => p.code === code)?.label ?? code })),
          received_other: a.other.trim(), received_at: receivedAt, received_by: profile?.full_name ?? '',
          tag_number: a.tag.trim(), condition: a.condition, notes: a.notes.trim(),
        };
        let docId: string; let docHunt = huntId;
        if (a.docId) {
          // the hunter registered this one already: tick it off as received instead of making a second job card
          const { data: cur, error: e1 } = await (supabase as any).from('hunt_documents').select('hunt_id, form_data').eq('id', a.docId).single();
          if (e1) throw new Error(e1.message);
          const fd = { ...(cur.form_data ?? {}), ...received, parts: partRecords(number, a.species, idx, a.parts) };
          const { error } = await (supabase as any).from('hunt_documents').update({ status: 'in_progress', form_data: fd }).eq('id', a.docId);
          if (error) throw new Error(error.message);
          docId = a.docId; docHunt = cur.hunt_id;
          if (/^pending instructions$/i.test(String(fd.mount_type ?? '').trim()) || !fd.mount_type) { waitingForMount = true; waitHunt = cur.hunt_id; }
        } else {
          waitingForMount = true;
          const { data: doc, error } = await (supabase as any).from('hunt_documents').insert({
            hunt_id: huntId, doc_type: 'job_card', status: 'in_progress', current_department: 'receiving',
            title: `${a.species} - Pending Instructions${a.tag ? ` (Tag: ${a.tag})` : ''}`,
            form_data: { species: a.species, mount_type: 'Pending Instructions', quantity: 1, instructions: '', ...received, parts: partRecords(number, a.species, idx, a.parts) },
          }).select('id').single();
          if (error) throw new Error(error.message);
          docId = doc.id;
        }
        if (a.photos.length) {
          const blobs = await Promise.all(a.photos.map(f => shrinkPhoto(f)));
          await savePhotos({ clientId: c.id, huntId: docHunt, docId, kind: 'arrival', shared: true, files: blobs, staffId: profile?.id ?? null, staffName: profile?.full_name ?? null });
        }
      }
      // 4. the workshop is now waiting for the hunter's mount choices (starts the reminder clock)
      if (waitingForMount && waitHunt) await (supabase as any).rpc('start_awaiting_instruction', { p_hunt_id: waitHunt });

      let link: string | null = null;
      try { link = await getInviteLink(c.id); } catch { /* migration 045 not run yet — papers still print */ }
      setResult({ clientId: c.id, name: c.full_name, number, email: c.email, phone: c.phone, registered: !!c.auth_user_id, huntRef, year, animals, link });
      toast.success(`${animals.length} animal${animals.length > 1 ? 's' : ''} checked in for ${c.full_name}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save the check-in');
    } finally { setSaving(false); }
  }

  function reset() {
    setResult(null); setStep(1); setAnimals([emptyAnimal()]); setClient(null); setQuery(''); setResults([]); setMode('find');
    setFresh({ full_name: '', phone: '', email: '', country: '', client_type: 'export' });
  }

  const dropOff = (r: NonNullable<typeof result>): DropOffPrint => ({
    clientName: r.name, clientNumber: r.number, huntRef: r.huntRef, receivedBy: profile?.full_name ?? '', workshop: WORKSHOP,
    inviteLink: r.registered ? null : r.link,
    animals: r.animals.map(a => ({ species: a.species, tag: a.tag, condition: CONDITIONS.find(c => c.value === a.condition)?.label ?? a.condition, parts: a.parts, other: a.other, notes: a.notes })),
  });

  // ── done ───────────────────────────────────────────────────────────────────
  if (result) {
    const labelTrophies = result.animals.map((a, i) => ({
      trophyIndex: i + 1, species: a.species, mountType: 'Pending', tagNumber: a.tag,
      parts: a.parts.map(code => ({ code, label: RECEIVED_PARTS.find(p => p.code === code)?.label ?? code, required: false, leatherOption: false, accessory: false, description: '' } as TrophyPart)),
    }));
    return (
      <div className="max-w-xl mx-auto space-y-4 pb-10">
        {showLabels && <TrophyLabels clientNumber={result.number} clientName={result.name} huntYear={result.year} trophies={labelTrophies} onClose={() => setShowLabels(false)} />}
        <div className="text-center py-4">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">Checked in</h1>
          <p className="text-slate-600 dark:text-slate-300">{result.name} · {result.number} · {result.animals.length} animal{result.animals.length > 1 ? 's' : ''}</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {result.animals.map((a, i) => (
            <div key={a.id} className="px-4 py-2.5 text-sm"><strong>{i + 1}. {a.species}</strong>{a.tag ? <span className="text-slate-400"> · {a.tag}</span> : null}<div className="text-slate-600 dark:text-slate-300">{listParts(a.parts, a.other)}</div></div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">1 · Hard copy</p>
          <button className={`${bigBtn} w-full bg-[#0073ea] text-white`} onClick={() => printDropOffPapers(dropOff(result), { sheet: true, letter: !result.registered })}>
            <Printer className="w-5 h-5" />Print receiving sheet{!result.registered ? ' + welcome letter' : ''}
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">2 · Tell the hunter</p>
          <InvitePanel
            target={{ clientId: result.clientId, name: result.name, email: result.email, phone: result.phone, registered: result.registered,
              animals: result.animals.map(a => ({ species: a.species, parts: a.parts, other: a.other })) }}
            onPrintLetter={() => printDropOffPapers(dropOff(result), { sheet: false, letter: true })}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">3 · Label the parts</p>
          <button className={`${bigBtn} w-full border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100`} onClick={() => setShowLabels(true)}>
            <Tag className="w-5 h-5" />Print QR labels
          </button>
        </div>
        <div className="flex gap-2 pt-2">
          <button className={`${bigBtn} flex-1 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100`} onClick={reset}>Check in another</button>
          <button className={`${bigBtn} flex-1 text-slate-600 dark:text-slate-300`} onClick={onComplete}>Done</button>
        </div>
      </div>
    );
  }

  // ── steps ──────────────────────────────────────────────────────────────────
  const steps = ['Hunter', 'Animals', 'Check'];
  return (
    <div className="max-w-xl mx-auto pb-44 lg:pb-28">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Arrival check-in</h1>
      <div className="flex items-center gap-2 my-4">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${step === i + 1 ? 'bg-[#0073ea] text-white' : step > i + 1 ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{step > i + 1 ? '✓' : i + 1}</span>
            <span className={`text-sm ${step === i + 1 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}>{s}</span>
            {i < 2 && <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300 text-sm">Whose trophies are these?</p>
          {client ? (
            <div className="rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950/30 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 dark:text-slate-100">{client.full_name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{[client.client_number, client.email, client.phone].filter(Boolean).join(' · ') || 'No contact details yet'}</p>
                <p className="text-xs mt-1 text-slate-600 dark:text-slate-300">{client.auth_user_id ? 'Already has a profile on the hunter portal' : 'No hunter-portal profile yet — we will send an invitation'}</p>
              </div>
              <button className="text-sm text-[#0073ea] font-semibold min-h-11 px-2" onClick={() => { setClient(null); setQuery(''); }}>Change</button>
            </div>
          ) : mode === 'find' ? (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input className={`${field} pl-9`} placeholder="Search name, phone, e-mail or client number" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
              </div>
              {searching && <p className="text-xs text-slate-400">Searching…</p>}
              <div className="space-y-2">
                {results.map(r => (
                  <button key={r.id} onClick={() => setClient(r)} className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 min-h-14 hover:border-[#0073ea]">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{r.full_name} <span className="font-mono text-xs text-slate-400">{r.client_number}</span></p>
                    <p className="text-xs text-slate-500">{[r.email, r.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
                  </button>
                ))}
                {query.trim().length >= 2 && !searching && results.length === 0 && <p className="text-sm text-slate-500">No one found with that name.</p>}
              </div>
              <button className={`${bigBtn} w-full border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200`} onClick={() => { setMode('new'); setFresh(f => ({ ...f, full_name: query.trim() })); }}>
                <UserPlus className="w-5 h-5" />New hunter
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div><label className={label}>Full name *</label><input className={field} value={fresh.full_name} onChange={e => setFresh(f => ({ ...f, full_name: e.target.value }))} autoFocus /></div>
              {similar.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Is this someone we already have?</p>
                  {similar.map(s => <button key={s.id} className="w-full text-left rounded-lg bg-white dark:bg-slate-900 border border-amber-200 p-2.5 min-h-12 text-sm" onClick={() => { setClient(s); setMode('find'); }}><strong>{s.full_name}</strong> <span className="text-slate-500">{[s.client_number, s.email].filter(Boolean).join(' · ')}</span> — use this one</button>)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Mobile / WhatsApp</label><input className={field} inputMode="tel" placeholder="082 123 4567" value={fresh.phone} onChange={e => setFresh(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className={label}>Country</label><input className={field} placeholder="USA" value={fresh.country} onChange={e => setFresh(f => ({ ...f, country: e.target.value }))} /></div>
              </div>
              <div><label className={label}>E-mail</label><input className={field} type="email" inputMode="email" placeholder="name@example.com" value={fresh.email} onChange={e => setFresh(f => ({ ...f, email: e.target.value }))} /></div>
              <div>
                <label className={label}>Where are the trophies going?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['export', '✈️ Overseas (export)'], ['local', '🇿🇦 South Africa (local)']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setFresh(f => ({ ...f, client_type: v }))} className={`rounded-lg border-2 min-h-12 text-sm font-semibold ${fresh.client_type === v ? 'border-[#0073ea] bg-[#0073ea]/10 text-[#0073ea]' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{l}</button>
                  ))}
                </div>
              </div>
              {!fresh.phone.trim() && !fresh.email.trim() && <p className="text-xs text-amber-700 dark:text-amber-400">Add a phone number or e-mail so we can send them their sign-up link.</p>}
              <button className="text-sm text-[#0073ea] font-semibold min-h-11" onClick={() => setMode('find')}>← Search instead</button>
            </div>
          )}
          {client && openHunts.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm bg-white dark:bg-slate-900">
              {newFile ? <>Starting a <strong>new {new Date().getFullYear()} file</strong>.</> : <>These animals join their open file <strong>{openHunts[0].ref_number ?? openHunts[0].year}</strong>.</>}
              <button className="ml-2 text-[#0073ea] font-semibold" onClick={() => setNewFile(v => !v)}>{newFile ? 'Add to the open file instead' : 'Start a new file instead'}</button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300 text-sm">For <strong>{who}</strong> — add each animal and tick every part that came in.</p>
          {expected.length > 0 && (
            <div className="rounded-2xl border-2 border-green-600 bg-green-50 dark:bg-green-950/30 p-3 space-y-2">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{who.split(' ')[0]} told us to expect {expected.length} animal{expected.length > 1 ? 's' : ''}. Tap each one that arrived.</p>
              {expected.map(e => (
                <button key={e.docId} type="button" onClick={() => arrived(e)} className="w-full text-left flex items-center gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 min-h-14">
                  <span className="text-2xl">{speciesEmoji(e.species)}</span>
                  <span className="flex-1"><span className="block font-semibold text-slate-900 dark:text-slate-100">{e.species}</span><span className="block text-xs text-slate-500">{/pending/i.test(e.mount) ? 'Mount not chosen yet' : e.mount}</span></span>
                  <span className="text-sm font-bold text-green-700">It arrived</span>
                </button>
              ))}
            </div>
          )}
          <input ref={photoRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
          {animals.map((a, idx) => {
            return (
              <div key={a.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Animal {idx + 1}</span>
                  {animals.length > 1 && <button aria-label="Remove animal" className="p-2 -m-2 text-red-500" onClick={() => setAnimals(prev => prev.filter(x => x.id !== a.id))}><Trash2 className="w-5 h-5" /></button>}
                </div>
                <SpeciesField value={a.species} onChange={v => patch(a.id, { species: v })} labelClass={label} fieldClass={field} />
                {a.docId && <p className="text-xs rounded-lg bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-3 py-2">Registered by the hunter{a.mount && !/pending/i.test(a.mount) ? `, they chose: ${a.mount}` : ', mount not chosen yet'}</p>}

                <div>
                  <label className={label}>What came in? Tick every part *</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PART_PRESETS.map(p => <button key={p.label} type="button" className="text-xs font-semibold px-3 min-h-9 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200" onClick={() => patch(a.id, { parts: p.codes })}>{p.label}</button>)}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {RECEIVED_PARTS.map(p => {
                      const on = a.parts.includes(p.code);
                      return (
                        <button key={p.code} type="button" aria-pressed={on} onClick={() => toggle(a, p.code)}
                          className={`rounded-xl border-2 min-h-14 px-1 text-sm font-semibold flex flex-col items-center justify-center gap-0.5 ${on ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>
                          <span className="text-base leading-none">{on ? '✓' : '○'}</span>{p.label}
                        </button>
                      );
                    })}
                  </div>
                  {a.parts.includes('OTHER') && <input className={`${field} mt-2`} placeholder="What else came in? (e.g. hide, antlers, bones)" value={a.other} onChange={e => patch(a.id, { other: e.target.value })} />}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Tag / number (if any)</label><input className={field} value={a.tag} onChange={e => patch(a.id, { tag: e.target.value })} /></div>
                  <div><label className={label}>Condition</label>
                    <select className={field} value={a.condition} onChange={e => patch(a.id, { condition: e.target.value })}>{CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                  </div>
                </div>
                <div><label className={label}>Notes (damage, missing, special)</label><input className={field} value={a.notes} onChange={e => patch(a.id, { notes: e.target.value })} /></div>

                <div className="flex items-center gap-2 flex-wrap">
                  {a.previews.map((src, i) => (
                    <div key={src} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button aria-label="Remove photo" className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center" onClick={() => patch(a.id, { photos: a.photos.filter((_, j) => j !== i), previews: a.previews.filter((_, j) => j !== i) })}><X className="w-3 h-3 text-white" /></button>
                    </div>
                  ))}
                  <button type="button" className="inline-flex items-center gap-2 min-h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200" onClick={() => { setPhotoFor(a.id); setTimeout(() => photoRef.current?.click(), 0); }}><Camera className="w-4 h-4" />Photo</button>
                </div>

                <button type="button" className="text-sm text-[#0073ea] font-semibold min-h-10 inline-flex items-center gap-1.5" onClick={() => sameAgain(a)}><CopyIcon className="w-4 h-4" />Add another {a.species || 'animal'} with the same parts</button>
              </div>
            );
          })}
          <button className={`${bigBtn} w-full border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200`} onClick={() => animals.length < 40 ? setAnimals(prev => [...prev, emptyAnimal()]) : toast.error('Maximum 40 animals per check-in')}><Plus className="w-5 h-5" />Add another animal</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs uppercase font-bold text-slate-500">Hunter</p>
            <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{who}</p>
            <p className="text-xs text-slate-500">{client ? (client.client_number ?? '') : `New · ${fresh.client_type === 'local' ? 'Local' : 'Export'} · ${[fresh.phone, fresh.email].filter(Boolean).join(' · ') || 'no contact details'}`}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {animals.map((a, i) => (
              <div key={a.id} className="px-4 py-3 text-sm">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{i + 1}. {speciesEmoji(a.species)} {a.species}{a.tag ? <span className="text-slate-400 font-normal"> · {a.tag}</span> : null}</p>
                <p className="text-slate-600 dark:text-slate-300">{listParts(a.parts, a.other)} · {CONDITIONS.find(c => c.value === a.condition)?.label}{a.photos.length ? ` · ${a.photos.length} photo${a.photos.length > 1 ? 's' : ''}` : ''}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">After saving you can print the receiving sheet, send {who.split(' ')[0] || 'the hunter'} their link, and print the part labels.</p>
        </div>
      )}

      {/* action bar, always in reach on a phone */}
      <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-700 p-3 lg:left-60">
        <div className="max-w-xl mx-auto flex gap-2">
          {step > 1 && <button className={`${bigBtn} border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100`} onClick={() => setStep((step - 1) as 1 | 2)}><ArrowLeft className="w-5 h-5" />Back</button>}
          {step === 1 && <button className={`${bigBtn} flex-1 bg-[#0073ea] text-white`} disabled={!whoOk || (mode === 'new' && !client && fresh.full_name.trim().length < 2)} onClick={() => setStep(2)}>Next: what came in<ArrowRight className="w-5 h-5" /></button>}
          {step === 2 && <button className={`${bigBtn} flex-1 bg-[#0073ea] text-white`} disabled={!animalsOk} onClick={() => setStep(3)}>{animalsOk ? 'Next: check it' : 'Pick a species and tick the parts'}<ArrowRight className="w-5 h-5" /></button>}
          {step === 3 && <button className={`${bigBtn} flex-1 bg-green-600 text-white`} disabled={saving} onClick={save}>{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}Save check-in</button>}
        </div>
      </div>
    </div>
  );
}
