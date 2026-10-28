/**
 * SoakReportButton — on every card at the tannery. In-house: a checklist. Third party: which tannery and their report.
 * Once it is submitted the tannery lead (or management) accepts it or rejects it. A card cannot leave the tannery until it is accepted.
 */
import { useCallback, useEffect, useState } from 'react';
import { Camera, ClipboardCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { uploadHuntFiles } from '../../../../lib/docs';
import { EARS, GOOD_CUT, HOLES_BUTTONS, YES_NO, soakProblems, soakSummary, type SoakFindings } from '../../../../lib/soak';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface Report { id: string; tannery_type: string; status: 'submitted' | 'accepted' | 'rejected'; rejection_reasons: string[]; findings: SoakFindings; holes: number | null }
const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-sm font-semibold text-slate-300 mb-1';

export function SoakReportButton({ docId, huntId, species, onChanged }: { docId: string; huntId?: string; species?: string; onChanged?: () => void }) {
  const [rep, setRep] = useState<Report | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    const { data } = await (supabase as any).from('soak_reports').select('id, tannery_type, status, rejection_reasons, findings, holes').eq('job_doc_id', docId).order('submitted_at', { ascending: false }).limit(1);
    setRep(data?.[0] ?? null);
  }, [docId]);
  useEffect(() => { load(); }, [load]);
  if (rep === undefined) return null;
  const waiting = rep?.status === 'submitted'; const ok = rep?.status === 'accepted'; const rejected = rep?.status === 'rejected';
  return (
    <>
      <button onClick={() => setOpen(true)} className={`mt-2 min-h-11 px-3 rounded-lg border-2 text-sm font-semibold inline-flex items-center gap-2 ${ok ? 'border-green-600 text-green-300' : rejected ? 'border-red-600 text-red-300' : waiting ? 'border-sky-600 text-sky-300' : 'border-amber-500 text-amber-300'}`}>
        <ClipboardCheck className="w-4 h-4" />{ok ? 'Soak report accepted' : waiting ? 'Soak report: waiting for the lead' : rejected ? 'Soak report rejected: do a new one' : 'Soak report (required)'}
      </button>
      {open && <SoakDialog docId={docId} huntId={huntId} species={species} report={rep} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); onChanged?.(); }} />}
    </>
  );
}

function SoakDialog({ docId, huntId, species, report, onClose, onDone }: { docId: string; huntId?: string; species?: string; report: Report | null; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<'in_house' | 'third_party'>('in_house');
  const [f, setF] = useState<SoakFindings>({});
  const [holes, setHoles] = useState<number | null>(null);
  const [many, setMany] = useState(false);
  const [name, setName] = useState(''); const [notes, setNotes] = useState(''); const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const view = report && report.status !== 'rejected';   // an accepted or waiting report is shown, not redone

  const complete = type === 'in_house'
    ? !!(f.ears && f.eyes && f.lips && f.nose && YES_NO.every(y => typeof f[y.key] === 'boolean') && holes !== null)
    : !!name.trim() && (files.length > 0 || !!notes.trim());

  async function submit() {
    setBusy(true);
    try {
      let hunt = huntId;
      if (!hunt && files.length) hunt = (await (supabase as any).from('hunt_documents').select('hunt_id').eq('id', docId).single()).data?.hunt_id;
      const paths = files.length && hunt ? await uploadHuntFiles(hunt, files) : [];
      const { error } = await (supabase as any).rpc('soak_submit', { p_doc: docId, p_type: type, p_name: type === 'third_party' ? name : null, p_findings: type === 'in_house' ? f : {}, p_holes: type === 'in_house' ? holes : null, p_files: paths, p_notes: notes || null });
      if (error) throw new Error(error.message);
      toast.success('Soak report handed in. The lead will accept or reject it.'); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  const Seg = ({ value, opts, onPick }: { value?: string; opts: { value: string; label: string }[]; onPick: (v: string) => void }) => (
    <div className="flex gap-2">{opts.map(o => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onPick(o.value)} className={`flex-1 min-h-12 rounded-lg border-2 text-base font-semibold ${value === o.value ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-600 text-slate-200'}`}>{o.label}</button>)}</div>
  );

  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">Soak report{species ? `: ${species}` : ''}</DialogTitle></DialogHeader>
        {view && report && (
          <div className="space-y-2">
            <p className={`rounded-lg p-3 font-semibold ${report.status === 'accepted' ? 'bg-green-950/40 text-green-200' : 'bg-sky-950/40 text-sky-200'}`}>{report.status === 'accepted' ? 'This soak report was accepted.' : 'This soak report is waiting for the tannery lead to accept or reject it.'}</p>
            {report.tannery_type === 'in_house' && <p className="text-sm text-slate-300">{soakSummary(report.findings, report.holes)}</p>}
          </div>
        )}
        {!view && (
          <>
            {report?.status === 'rejected' && <p className="rounded-lg bg-red-950/40 border border-red-700 text-red-200 p-3 text-sm">The last soak report was rejected: {report.rejection_reasons.join(', ')}. Record a new one, for example once a replacement skin is soaked.</p>}
            <div className="grid grid-cols-2 gap-2">
              {([['in_house', 'In-house'], ['third_party', '3rd party tannery']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={type === v} onClick={() => setType(v)} className={`min-h-12 rounded-xl border-2 font-bold ${type === v ? 'border-[#0073ea] bg-[#0073ea] text-white' : 'border-slate-600 text-slate-200'}`}>{l}</button>)}
            </div>
            {type === 'in_house' ? (
              <div className="space-y-4">
                <div><label className={lab}>Ears</label><Seg value={f.ears} opts={EARS} onPick={v => setF(p => ({ ...p, ears: v as SoakFindings['ears'] }))} /></div>
                <div><label className={lab}>Eyes</label><Seg value={f.eyes} opts={GOOD_CUT} onPick={v => setF(p => ({ ...p, eyes: v as 'good' | 'cut' }))} /></div>
                <div><label className={lab}>Lips</label><Seg value={f.lips} opts={GOOD_CUT} onPick={v => setF(p => ({ ...p, lips: v as 'good' | 'cut' }))} /></div>
                <div><label className={lab}>Nose</label><Seg value={f.nose} opts={GOOD_CUT} onPick={v => setF(p => ({ ...p, nose: v as 'good' | 'cut' }))} /></div>
                {YES_NO.map(y => (
                  <div key={y.key}><label className={lab}>{y.label}</label>
                    <Seg value={typeof f[y.key] === 'boolean' ? (f[y.key] ? 'yes' : 'no') : undefined} opts={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} onPick={v => setF(p => ({ ...p, [y.key]: v === 'yes' }))} /></div>
                ))}
                <div>
                  <label className={lab}>Holes in the skin</label>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: HOLES_BUTTONS + 1 }, (_, i) => i).map(n => <button key={n} type="button" aria-pressed={!many && holes === n} onClick={() => { setMany(false); setHoles(n); }} className={`min-h-11 rounded-lg border-2 font-bold ${!many && holes === n ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-600 text-slate-200'}`}>{n}</button>)}
                    <button type="button" aria-pressed={many} onClick={() => { setMany(true); setHoles(null); }} className={`col-span-6 min-h-11 rounded-lg border-2 font-bold ${many ? 'border-amber-500 bg-amber-600 text-white' : 'border-slate-600 text-slate-200'}`}>More than {HOLES_BUTTONS}</button>
                  </div>
                  {many && <input type="number" min={HOLES_BUTTONS + 1} className={`${field} mt-2`} placeholder="How many holes?" value={holes ?? ''} onChange={e => setHoles(e.target.value ? +e.target.value : null)} />}
                </div>
                <div><label className={lab}>Notes <span className="font-normal text-slate-500">(optional)</span></label><input className={field} value={notes} onChange={e => setNotes(e.target.value)} /></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div><label className={lab}>Which tannery?</label><input className={field} value={name} onChange={e => setName(e.target.value)} /></div>
                <div><label className={lab}>Their soak report (photo or PDF)</label>
                  <label className="min-h-12 px-4 rounded-xl border-2 border-dashed border-slate-500 text-slate-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"><Camera className="w-5 h-5" />{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} chosen` : 'Take a photo or choose a file'}
                    <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files ?? []))} /></label></div>
                <div><label className={lab}>What does it say? <span className="font-normal text-slate-500">(or instead of a file)</span></label><textarea rows={3} className={field} value={notes} onChange={e => setNotes(e.target.value)} /></div>
              </div>
            )}
            {type === 'in_house' && f.ears && soakProblems(f, holes).length > 0 && <p className="text-sm text-amber-300">Noted: {soakProblems(f, holes).join(', ')}. The lead decides whether to accept or reject it.</p>}
            <div className="flex gap-2">
              <button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={onClose}>Cancel</button>
              <button className="flex-1 min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2" disabled={!complete || busy} onClick={submit}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Hand in the soak report</button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
