/**
 * HuntDocuments — the workshop's paperwork desk. Every hunt has a checklist of required documents; each says who is
 * responsible, and a document only counts once the workshop has checked it is correct, complete, signed and stamped.
 * Final dispatch is blocked until every required document is approved.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Eye, FileText, Loader2, MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { OutfitterThread } from '../shared/OutfitterThread';
import { HuntRegister } from './HuntRegister';
import { PROVINCES, RESPONSIBLE_LABEL, STATUS_LABEL, STATUS_TONE, uploadHuntFiles, openHuntFile, waiting } from '../../../../lib/docs';

interface BoardRow { hunt_id: string; ref_number: string | null; client_name: string; outfitter_name: string | null; required: number; approved: number; waiting_outfitter: number; waiting_hunter: number; waiting_other: number; to_check: number; rejected: number; oldest_wait: string | null; complete: boolean; province: string | null }
interface Req { id: string; name: string; responsible: string; status: string; needs_signature: boolean; needs_stamp: boolean; file_paths: string[]; note: string | null; requested_at: string; received_at: string | null; received_by_name: string | null; rejection_reason: string | null; checked_signed: boolean; checked_stamped: boolean; reference_numbers: string[]; check_kind: string | null; must_show: string[]; shown_ok: string[]; ph_permit_seen: string | null; ho_permit_seen: string | null }

const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-sm font-semibold text-slate-300 mb-1';

export function HuntDocuments({ initialHuntId }: { initialHuntId?: string }) {
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(initialHuntId ?? null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('v_hunt_documents').select('*').order('client_name');
    setRows((data ?? []).map((r: any) => ({ ...r, required: +r.required, approved: +r.approved, waiting_outfitter: +r.waiting_outfitter, waiting_hunter: +r.waiting_hunter, waiting_other: +r.waiting_other, to_check: +r.to_check, rejected: +r.rejected })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const g: { key: string; title: string; hint: string; items: BoardRow[] }[] = [
      { key: 'check', title: 'To check', hint: 'Documents have arrived and need the workshop\'s check', items: [] },
      { key: 'rejected', title: 'Sent back', hint: 'Waiting for a corrected document', items: [] },
      { key: 'outfitter', title: 'Waiting on the outfitter', hint: 'The outfitter has not sent everything yet', items: [] },
      { key: 'hunter', title: 'Waiting on the hunter', hint: '', items: [] },
      { key: 'other', title: 'With the workshop or authorities', hint: '', items: [] },
      { key: 'done', title: 'Complete', hint: 'Ready to ship from a paperwork point of view', items: [] },
    ];
    const term = search.trim().toLowerCase();
    for (const r of rows.filter(x => !term || `${x.client_name} ${x.outfitter_name ?? ''} ${x.ref_number ?? ''} ${x.province ?? ''}`.toLowerCase().includes(term))) {
      const k = r.to_check > 0 ? 'check' : r.rejected > 0 ? 'rejected' : r.waiting_outfitter > 0 ? 'outfitter' : r.waiting_hunter > 0 ? 'hunter' : r.waiting_other > 0 ? 'other' : 'done';
      g.find(x => x.key === k)!.items.push(r);
    }
    return g.filter(x => x.items.length);
  }, [rows, search]);

  if (open) return <Checklist huntId={open} onBack={() => { setOpen(null); load(); }} />;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Documents</h1>
        <p className="text-base text-slate-400 mt-1">Trophies can only be exported when every document is correct, complete, signed and stamped. This shows what is outstanding and who it is waiting on.</p>
      </div>
      <input className={field} placeholder="Search by hunter, outfitter, reference or province" value={search} onChange={e => setSearch(e.target.value)} />
      {loading && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}
      {!loading && rows.length === 0 && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">No hunts have a document checklist yet. Set up the list of required documents under Setup, and new hunts get it automatically.</p>}
      {groups.map(g => (
        <section key={g.key} className="space-y-2">
          <div><h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">{g.title} · {g.items.length}</h2>{g.hint && <p className="text-xs text-slate-500">{g.hint}</p>}</div>
          <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
            {g.items.map(r => (
              <button key={r.hunt_id} onClick={() => setOpen(r.hunt_id)} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-16 hover:bg-[#162330]">
                <span className="flex-1 min-w-0">
                  <span className="block text-lg font-semibold text-slate-100">{r.client_name} <span className="font-mono text-xs text-slate-500">{r.ref_number}</span></span>
                  <span className="block text-sm text-slate-400">{r.outfitter_name ? `via ${r.outfitter_name} · ` : ''}{r.province ? `${r.province} · ` : ''}{r.approved} of {r.required} approved{r.oldest_wait && !r.complete ? ` · oldest waiting ${waiting(r.oldest_wait)}` : ''}</span>
                </span>
                <span className="flex flex-col items-end gap-1 text-xs font-semibold">
                  {!r.province && <span className="rounded-full bg-orange-900/50 text-orange-300 px-2.5 py-0.5">Province needed</span>}
                  {r.to_check > 0 && <span className="rounded-full bg-sky-900/50 text-sky-300 px-2.5 py-0.5">{r.to_check} to check</span>}
                  {r.rejected > 0 && <span className="rounded-full bg-red-900/50 text-red-300 px-2.5 py-0.5">{r.rejected} sent back</span>}
                  {r.waiting_outfitter > 0 && <span className="rounded-full bg-amber-900/50 text-amber-300 px-2.5 py-0.5">{r.waiting_outfitter} from outfitter</span>}
                  {r.waiting_hunter > 0 && <span className="rounded-full bg-amber-900/50 text-amber-300 px-2.5 py-0.5">{r.waiting_hunter} from hunter</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Checklist({ huntId, onBack }: { huntId: string; onBack: () => void }) {
  const { profile } = useAuth();
  const isManager = ['admin', 'studio_manager', 'bookkeeper'].includes(profile?.role ?? '');
  const [info, setInfo] = useState<{ client: string; ref: string; outfitter: string | null; outfitterId: string | null; province: string | null } | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [numbersFor, setNumbersFor] = useState<Req | null>(null);
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [review, setReview] = useState<Req | null>(null);
  const [chat, setChat] = useState<{ text: string; req: string | null } | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<string | null>(null);

  const load = async () => {
    const { data: h } = await (supabase as any).from('client_hunts').select('ref_number, outfitter_id, province, clients(full_name), outfitters(name)').eq('id', huntId).single();
    setInfo({ client: h?.clients?.full_name ?? '', ref: h?.ref_number ?? '', outfitter: h?.outfitters?.name ?? null, outfitterId: h?.outfitter_id ?? null, province: h?.province ?? null });
    const { data } = await (supabase as any).from('hunt_requirements').select('*').eq('hunt_id', huntId).order('name');
    setReqs(data ?? []);
  };
  useEffect(() => { load(); }, [huntId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setProvince(v: string) {
    const { error } = await (supabase as any).rpc('set_hunt_province', { p_hunt: huntId, p_province: v || null });
    if (error) toast.error(error.message); else { toast.success('Province saved. The list now matches it.'); load(); }
  }
  async function create() { const { data, error } = await (supabase as any).rpc('generate_hunt_requirements', { p_hunt: huntId }); if (error) toast.error(error.message); else { toast.success(data ? `${data} documents added` : 'Nothing to add. Check the list under Setup.'); load(); } }
  async function upload(files: FileList | null) {
    if (!files?.length || !uploadFor) return;
    setBusy(uploadFor);
    try {
      const paths = await uploadHuntFiles(huntId, Array.from(files));
      const { error } = await (supabase as any).rpc('submit_requirement', { p_req: uploadFor, p_paths: paths });
      if (error) throw new Error(error.message);
      toast.success('Document added'); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }
  async function notNeeded(r: Req) {
    const why = window.prompt(`Why is "${r.name}" not needed for this hunt? (this is recorded)`);
    if (!why?.trim()) return;
    const { error } = await (supabase as any).rpc('staff_set_requirement', { p_req: r.id, p_status: 'not_needed', p_note: why });
    if (error) toast.error(error.message); else load();
  }

  if (!reqs || !info) return <div className="flex items-center gap-2 text-slate-400 py-10"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>;
  const open = reqs.filter(r => !['approved', 'not_needed'].includes(r.status)).length;

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-base text-[#3AAECC] font-semibold min-h-11"><ArrowLeft className="w-4 h-4" />All hunts</button>
      <div><h1 className="text-3xl font-bold text-slate-100 leading-tight">{info.client}</h1><p className="text-slate-400">{info.ref}{info.outfitter ? ` · via ${info.outfitter}` : ' · no outfitter'}</p></div>
      <div className={`rounded-xl border p-3 space-y-1 ${info.province ? 'border-slate-700 bg-[#111c26]' : 'border-orange-500 bg-orange-950/20'}`}>
        <label className={lab}>Which province was the hunt in?{!info.province && ' The documents depend on it.'}</label>
        <select className={field} value={info.province ?? ''} onChange={e => setProvince(e.target.value)}>
          <option value="">Choose a province…</option>
          {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className={`rounded-xl border p-4 text-lg font-semibold ${open === 0 && reqs.length > 0 ? 'border-emerald-600 bg-emerald-950/30 text-emerald-200' : 'border-amber-600 bg-amber-950/20 text-amber-200'}`}>
        {reqs.length === 0 ? 'No checklist on this hunt yet.' : open === 0 ? 'All documents approved. The paperwork is complete.' : `${open} document${open > 1 ? 's' : ''} still to be approved. Final dispatch is blocked until they are.`}
      </div>
      {reqs.length === 0 && <button className="min-h-12 px-5 rounded-xl bg-[#0073ea] text-white font-bold" onClick={create}>Create the checklist</button>}

      <div className="space-y-3">
        {reqs.map(r => (
          <div key={r.id} className="rounded-2xl border border-slate-700 bg-[#111c26] p-4 space-y-2">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-slate-100 leading-tight">{r.name}</p>
                <p className="text-sm text-slate-400">{RESPONSIBLE_LABEL[r.responsible]} is responsible{r.needs_signature ? ' · signed' : ''}{r.needs_stamp ? ' · stamped' : ''}{r.status === 'awaiting' || r.status === 'rejected' ? ` · waiting ${waiting(r.requested_at)}` : ''}</p>
              </div>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
            </div>
            {r.rejection_reason && r.status === 'rejected' && <p className="rounded-lg bg-red-950/40 border border-red-800 text-red-200 text-sm p-2.5">Sent back: {r.rejection_reason}</p>}
            {r.note && r.status === 'not_needed' && <p className="text-sm text-slate-400">Not needed: {r.note}</p>}
            {r.file_paths.length > 0 && <div className="flex flex-wrap gap-2">{r.file_paths.map((p, i) => <button key={p} onClick={() => openHuntFile(p).catch(e => toast.error(e.message))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 text-slate-200 text-sm px-3 min-h-10"><Eye className="w-4 h-4" />File {i + 1}</button>)}{r.received_at && <span className="text-xs text-slate-500 self-center">received {new Date(r.received_at).toLocaleDateString('en-ZA')}{r.received_by_name ? ` from ${r.received_by_name}` : ''}</span>}</div>}
            {r.file_paths.length > 0 && isManager && (
              <p className="text-sm text-slate-400">Numbers on it: {(r.reference_numbers ?? []).length ? <span className="font-mono text-slate-200">{r.reference_numbers.join(', ')}</span> : 'none entered'} <button className="text-sky-300 underline ml-1 min-h-9" onClick={() => setNumbersFor(r)}>{(r.reference_numbers ?? []).length || r.ph_permit_seen || r.ho_permit_seen ? 'Change' : 'Enter them'}</button>{r.ph_permit_seen ? <span className="block">Shows PH permit no. <span className="font-mono text-slate-200">{r.ph_permit_seen}</span></span> : null}{r.ho_permit_seen ? <span className="block">Shows outfitter permit no. <span className="font-mono text-slate-200">{r.ho_permit_seen}</span></span> : null}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {['received', 'rejected', 'approved'].includes(r.status) && r.file_paths.length > 0 && isManager && <button className="min-h-10 px-4 rounded-lg bg-[#0073ea] text-white font-semibold flex items-center gap-1.5" onClick={() => setReview(r)}><CheckCircle2 className="w-4 h-4" />{r.status === 'approved' ? 'Check again' : 'Check it'}</button>}
              {!['approved', 'not_needed'].includes(r.status) && <button disabled={busy === r.id} className="min-h-10 px-4 rounded-lg border border-slate-500 text-slate-100 font-semibold flex items-center gap-1.5 disabled:opacity-50" onClick={() => { setUploadFor(r.id); setTimeout(() => fileRef.current?.click(), 0); }}>{busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}Add a file</button>}
              {['awaiting', 'rejected'].includes(r.status) && info.outfitterId && r.responsible === 'outfitter' && <button className="min-h-10 px-4 rounded-lg border border-amber-500 text-amber-200 font-semibold flex items-center gap-1.5" onClick={() => setChat({ text: r.status === 'rejected' ? `About ${info.client}: please send a corrected "${r.name}". ${r.rejection_reason ?? ''}`.trim() : `About ${info.client}: we are still waiting for the "${r.name}". Please send it as soon as you can.`, req: r.id })}><MessageSquare className="w-4 h-4" />Ask the outfitter</button>}
              {r.status === 'awaiting' && isManager && <button className="min-h-10 px-4 rounded-lg text-slate-400 underline" onClick={() => notNeeded(r)}>Not needed</button>}
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <button className="w-full min-h-14 rounded-2xl border-2 border-sky-500 text-sky-200 font-bold text-lg" onClick={() => setShowRegister(v => !v)}>{showRegister ? 'Hide the hunt register' : 'Type in and check the hunt register'}</button>
        {showRegister && <HuntRegister huntId={huntId} canEdit={isManager} defaults={{ province: info.province, outfitter: info.outfitter, client: info.client }} onChanged={load} />}
      </section>

      {isManager && <button className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-600 text-slate-200 font-semibold px-4 min-h-12" onClick={() => setAdding(true)}><Plus className="w-5 h-5" />Add another document to this hunt</button>}

      {info.outfitterId && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">Chat with {info.outfitter}</h2>
          <p className="text-sm text-slate-400">This conversation is only about {info.client}.</p>
          <OutfitterThread key={chat?.text ?? 'plain'} huntId={huntId} side="workshop" canWrite={isManager} prefill={chat?.text ?? ''} requirementId={chat?.req ?? null} />
        </section>
      )}

      {numbersFor && <NumbersPopup req={numbersFor} onClose={() => setNumbersFor(null)} onDone={() => { setNumbersFor(null); load(); }} />}
      {review && <ReviewPopup req={review} onClose={() => setReview(null)} onDone={() => { setReview(null); load(); }} />}
      {adding && <AddDocPopup huntId={huntId} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function ReviewPopup({ req, onClose, onDone }: { req: Req; onClose: () => void; onDone: () => void }) {
  const [c, setC] = useState({ correct: false, complete: false, signed: false, stamped: false });
  const [shown, setShown] = useState<string[]>(req.shown_ok ?? []);
  const [reason, setReason] = useState('');
  const [sendBack, setSendBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = c.correct && c.complete && (!req.needs_signature || c.signed) && (!req.needs_stamp || c.stamped) && (req.must_show ?? []).every(x => shown.includes(x));

  async function go(approve: boolean) {
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_review_requirement', { p_req: req.id, p_approve: approve, p_correct: c.correct, p_complete: c.complete, p_signed: c.signed, p_stamped: c.stamped, p_reason: reason || null, p_shown: shown });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? 'Approved' : 'Sent back'); onDone();
  }
  const Box = ({ k, label }: { k: keyof typeof c; label: string }) => (
    <button type="button" aria-pressed={c[k]} onClick={() => setC(p => ({ ...p, [k]: !p[k] }))} className={`w-full text-left flex items-center gap-3 rounded-xl border-2 px-3 min-h-14 ${c[k] ? 'border-green-500 bg-green-950/30 text-white' : 'border-slate-600 text-slate-200'}`}>
      <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-sm ${c[k] ? 'border-green-500 bg-green-500 text-white' : 'border-slate-500'}`}>{c[k] ? '✓' : ''}</span><span className="text-base font-semibold">{label}</span>
    </button>
  );
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">{req.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-300">Look at the document, then tick what is true. It only counts as approved when everything that is required is ticked.</p>
        <div className="space-y-2">
          <Box k="correct" label="It is correct" /><Box k="complete" label="It is complete (every page)" />
          {(req.must_show ?? []).map(x => { const on = shown.includes(x); return (
            <button key={x} type="button" aria-pressed={on} onClick={() => setShown(p => on ? p.filter(y => y !== x) : [...p, x])} className={`w-full text-left flex items-center gap-3 rounded-xl border-2 px-3 min-h-14 ${on ? 'border-green-500 bg-green-950/30 text-white' : 'border-slate-600 text-slate-200'}`}>
              <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-sm ${on ? 'border-green-500 bg-green-500 text-white' : 'border-slate-500'}`}>{on ? '✓' : ''}</span><span className="text-base font-semibold">It shows: {x}</span>
            </button>
          ); })}
          {req.needs_signature && <Box k="signed" label="It is signed" />}{req.needs_stamp && <Box k="stamped" label="It is stamped" />}
        </div>
        {sendBack && <div><label className={lab}>What is wrong? The {req.responsible === 'hunter' ? 'hunter' : 'outfitter'} will see this.</label><textarea rows={3} className={field} value={reason} onChange={e => setReason(e.target.value)} autoFocus /></div>}
        <div className="flex gap-2 pt-1">
          {!sendBack ? (
            <>
              <button className="min-h-12 px-4 rounded-xl border border-red-500 text-red-300 font-semibold" onClick={() => setSendBack(true)}>Send it back</button>
              <button className="flex-1 min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2" disabled={busy || !ready} onClick={() => go(true)}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Approve</button>
            </>
          ) : (
            <>
              <button className="min-h-12 px-4 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={() => setSendBack(false)}>Back</button>
              <button className="flex-1 min-h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-lg font-bold disabled:opacity-50" disabled={busy || !reason.trim()} onClick={() => go(false)}>Send back with this reason</button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddDocPopup({ huntId, onClose, onDone }: { huntId: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: '', responsible: 'outfitter', sig: true, stamp: true });
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_add_requirement', { p_hunt: huntId, p_name: f.name, p_responsible: f.responsible, p_signature: f.sig, p_stamp: f.stamp });
    setBusy(false);
    if (error) toast.error(error.message); else onDone();
  }
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-2xl">Add a document</DialogTitle></DialogHeader>
        <div><label className={lab}>Name of the document</label><input className={field} value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
        <div><label className={lab}>Who must supply it?</label><select className={field} value={f.responsible} onChange={e => setF(p => ({ ...p, responsible: e.target.value }))}>{Object.entries(RESPONSIBLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <label className="flex items-center gap-3 text-base text-slate-200 min-h-11"><input type="checkbox" className="w-5 h-5" checked={f.sig} onChange={e => setF(p => ({ ...p, sig: e.target.checked }))} />It must be signed</label>
        <label className="flex items-center gap-3 text-base text-slate-200 min-h-11"><input type="checkbox" className="w-5 h-5" checked={f.stamp} onChange={e => setF(p => ({ ...p, stamp: e.target.checked }))} />It must be stamped</label>
        <div className="flex gap-2"><button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={onClose}>Cancel</button><button className="flex-1 min-h-12 rounded-xl bg-[#0073ea] text-white text-lg font-bold disabled:opacity-50" disabled={busy || !f.name.trim()} onClick={go}>Add it</button></div>
      </DialogContent>
    </Dialog>
  );
}

function NumbersPopup({ req, onClose, onDone }: { req: Req; onClose: () => void; onDone: () => void }) {
  const [nums, setNums] = useState((req.reference_numbers ?? []).join(', '));
  const [ph, setPh] = useState(req.ph_permit_seen ?? '');
  const [ho, setHo] = useState(req.ho_permit_seen ?? '');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_set_reference_numbers', { p_req: req.id, p_numbers: nums.split(',').map(x => x.trim()).filter(Boolean), p_ph: ph || null, p_ho: ho || null });
    setBusy(false);
    if (error) toast.error(error.message); else onDone();
  }
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-2xl">Numbers on this document</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-300">Type in what the document shows. The hunt register is checked against it, and any difference is highlighted.</p>
        <div><label className={lab}>Permit numbers on it <span className="font-normal text-slate-500">(separate with commas)</span></label><input className={field} value={nums} onChange={e => setNums(e.target.value)} /></div>
        <div><label className={lab}>PH permit number it shows <span className="font-normal text-slate-500">(if any)</span></label><input className={field} value={ph} onChange={e => setPh(e.target.value)} /></div>
        <div><label className={lab}>Outfitter permit number it shows <span className="font-normal text-slate-500">(if any)</span></label><input className={field} value={ho} onChange={e => setHo(e.target.value)} /></div>
        <div className="flex gap-2"><button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={onClose}>Cancel</button><button className="flex-1 min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50" disabled={busy} onClick={go}>Save</button></div>
      </DialogContent>
    </Dialog>
  );
}
