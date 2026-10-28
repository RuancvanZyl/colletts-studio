/** LegRecords — management's record of every department a client's trophies went through: sent, accepted (by whom), completed (by whom). Records only. */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { deptLabel } from './progressUi';

interface Leg { id: string; department: string; sent_at: string; accepted_at: string | null; accepted_by_name: string | null; completed_at: string | null; completed_by_name: string | null; override_reason: string | null; hunt_documents: { form_data: any } | null }
const when = (d: string | null) => d ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const span = (a: string | null, b: string | null) => {
  if (!a) return ''; const ms = (b ? new Date(b).getTime() : Date.now()) - new Date(a).getTime(); const h = Math.max(0, Math.round(ms / 3_600_000));
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
};

export function LegRecords({ huntId, client, onClose }: { huntId: string; client: string; onClose: () => void }) {
  const [legs, setLegs] = useState<Leg[] | null>(null);
  useEffect(() => { (async () => {
    const { data } = await (supabase as any).from('job_card_legs').select('*, hunt_documents!inner(form_data, hunt_id)').eq('hunt_documents.hunt_id', huntId).order('sent_at');
    setLegs(data ?? []);
  })(); }, [huntId]);
  const byAnimal = new Map<string, Leg[]>();
  for (const l of legs ?? []) { const k = `${l.hunt_documents?.form_data?.species ?? 'Trophy'} (${l.hunt_documents?.form_data?.mount_type ?? ''})`; (byAnimal.get(k) ?? byAnimal.set(k, []).get(k)!).push(l); }
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">{client}: department records</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-400">For management only. Time in a department is a record and never changes a milestone colour.</p>
        {!legs && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}
        {legs && legs.length === 0 && <p className="text-slate-400">No department hand-overs have been recorded for this client yet. They are recorded from the moment a card enters a department.</p>}
        {[...byAnimal.entries()].map(([animal, ls]) => (
          <div key={animal} className="space-y-1.5">
            <p className="font-bold text-slate-100">{animal}</p>
            <ul className="rounded-xl border border-slate-700 divide-y divide-slate-800 text-sm">
              {ls.map(l => (
                <li key={l.id} className="px-3 py-2 text-slate-300">
                  <strong className="text-slate-100">{deptLabel(l.department)}</strong> · arrived {when(l.sent_at)}
                  <br />{l.accepted_at ? <>Accepted by <strong>{l.accepted_by_name ?? 'a lead'}</strong> {when(l.accepted_at)} (waited {span(l.sent_at, l.accepted_at)})</> : <span className="text-amber-300">Not accepted yet (waiting {span(l.sent_at, null)})</span>}
                  {l.completed_at && <><br />Completed by <strong>{l.completed_by_name ?? 'staff'}</strong> {when(l.completed_at)}{l.accepted_at ? ` (took ${span(l.accepted_at, l.completed_at)})` : ''}</>}
                  {l.override_reason && <><br /><span className="text-red-300">{l.override_reason}</span></>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
