/**
 * EditJobCard — admin only. Change the mount on a job card (only what the skin allows), or the instructions and tag number.
 * Every change is written on the card (who, when, why) and a mount change tells the hunter.
 *
 * The skin rules (see lib/mountRules.ts): a full mount can become a half body or a shoulder mount, a half body a shoulder mount.
 * A shoulder mount can never become a half body or full mount, and a flat skin can never become a shoulder, half body or full mount.
 * When the client still wants the bigger mount they buy a skin from stock: credit the first mount, hide purchase, new job card.
 */
import { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { mountChange, groupOf, isMounted, TOO_LATE } from '../../../../lib/mountRules';
import { mountsFor } from '../../../../lib/pricing';
import { getPipeline, ALL_DEPARTMENTS } from '../../../../lib/pipeline';
import { loadQuotes, money, type Quote } from '../../../../lib/hooks/useQuotes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { OrderChangeDialog, type OrderChangePrefill } from './OrderChangeDialog';
import { deptLabel } from './progressUi';

const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-sm font-semibold text-slate-300 mb-1';
const TARGETS = ['Full Mount', 'Half Mount', 'Shoulder Mount', 'Offset Shoulder Mount', 'Pedestal Mount', 'Euro Skull', 'Bleach Only', 'Tan Only', 'Rug Mount on Felt'];
const OPEN_QUOTE = ['accepted', 'deposit_paid', 'paid'];

interface Props { docId: string; huntId: string; species: string; mount: string; instructions: string; tag: string; department: string; clientName: string; onChanged: () => void }

export function EditJobCardButton(p: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="min-h-11 px-3 rounded-lg border border-slate-400 text-slate-700 dark:text-slate-200 text-sm font-semibold inline-flex items-center gap-1.5"><Pencil className="w-4 h-4" />Edit this card</button>
      {open && <EditDialog {...p} onClose={() => setOpen(false)} />}
    </>
  );
}

function EditDialog({ docId, huntId, species, mount, instructions, tag, department, clientName, onChanged, onClose }: Props & { onClose: () => void }) {
  const [part, setPart] = useState<'menu' | 'mount' | 'text'>('menu');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [instr, setInstr] = useState(instructions);
  const [tagNo, setTagNo] = useState(tag);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [clientType, setClientType] = useState('export');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [amend, setAmend] = useState<{ prefill: OrderChangePrefill } | null>(null);
  const [changedTo, setChangedTo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: h }, qs] = await Promise.all([
        (supabase as any).from('hunt_documents').select('form_data').eq('id', docId).single(),
        (supabase as any).from('client_hunts').select('client_type, clients(client_type)').eq('id', huntId).single(),
        loadQuotes({ huntId }),
      ]);
      const fd = d?.form_data ?? {};
      setHistory([...(fd.mount_history ?? []).map((x: any) => ({ ...x, what: `Mount: ${x.from} → ${x.to}` })), ...(fd.edit_history ?? []).map((x: any) => ({ ...x, what: 'Instructions or tag number edited' }))]
        .sort((a, b) => String(b.at).localeCompare(String(a.at))));
      setClientType(h?.client_type ?? h?.clients?.client_type ?? 'export');
      setQuote(qs.find(x => OPEN_QUOTE.includes(x.status)) ?? null);
    })();
  }, [docId, huntId]);

  const rule = to ? mountChange(mount, to) : null;
  const pipeline = to ? getPipeline(to) : [];
  const tooLate = isMounted(department);
  const finishesFirst = rule?.kind === 'allowed' && to && !pipeline.includes(department)
    ? `It is at ${deptLabel(department)} now. It finishes that stage first (any tanning already done is still paid for) and then carries on with the stages of a ${to}.` : null;
  const tanDone = ALL_DEPARTMENTS.indexOf(department) >= ALL_DEPARTMENTS.indexOf('tannery');

  // the invoice line of this card, and what is still left on it to credit
  const line = quote?.lines.find(l => l.hunt_doc_id === docId && l.kind !== 'credit' && l.id);
  const credited = line ? -quote!.lines.filter(l => l.credit_for_line_id === line.id).reduce((s, l) => s + (l.amount ?? 0), 0) : 0;
  const left = line ? Math.max(0, (line.amount ?? 0) - credited) : 0;
  const priceOf = (m: string) => mountsFor(species, clientType).find(x => x.name === m)?.price ?? null;

  async function saveMount() {
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_change_mount', { p_doc: docId, p_new_mount: to, p_reason: reason });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Changed to ${to}. The hunter has been told.`);
    setChangedTo(to);
    onChanged();
  }

  async function saveText() {
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_edit_card', { p_doc: docId, p_instructions: instr, p_tag: tagNo, p_reason: reason });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('The job card was updated.');
    onChanged(); onClose();
  }

  function openInvoiceUpdate(newMount: string) {
    if (!line) return;
    const price = priceOf(newMount);
    setAmend({ prefill: {
      credits: { [line.id!]: String(left) },
      adds: [
        { description: `${species}: ${newMount}`, amount: price ? String(price) : '', docId },
        ...(tanDone ? [{ description: `Tanning already done: ${species}`, amount: '' }] : []),
      ],
      reason: `${clientName} changed the ${species} from ${mount} to ${newMount}`,
    } });
  }

  function openBuySkin() {
    if (!line) return;
    const price = priceOf(to);
    setAmend({ prefill: {
      credits: { [line.id!]: String(left) },
      cancelLineIds: [line.id!],
      adds: [
        { kind: 'hide_purchase', description: `Hide purchase: ${species}`, amount: '' },
        { description: `${species}: ${to}`, amount: price ? String(price) : '', newCard: true, species, mount: to, startDept: 'mounting' },
      ],
      reason: `${clientName} wanted a ${to} but the skin was cut for a ${mount}. They buy a skin from our stock, which is not their own animal's skin`,
    } });
  }

  if (amend && quote) {
    return <OrderChangeDialog quote={quote} clientType={clientType} who={`${species} · ${clientName}`} prefill={amend.prefill} onClose={() => setAmend(null)} onDone={() => { onChanged(); onClose(); }} />;
  }

  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[94vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">Edit the {species} card</DialogTitle></DialogHeader>
        <p className="text-slate-300">{clientName} · now: <strong className="text-white">{mount}</strong>. Only an admin can do this, and every change is written on the card.</p>

        {part === 'menu' && (
          <div className="space-y-3">
            <button className="w-full min-h-14 rounded-xl border-2 border-slate-500 text-left px-4 text-slate-100" onClick={() => setPart('mount')}><span className="block font-bold text-lg">Change the mount</span><span className="block text-sm text-slate-400">For example a full mount to a shoulder mount</span></button>
            <button className="w-full min-h-14 rounded-xl border-2 border-slate-500 text-left px-4 text-slate-100" onClick={() => setPart('text')}><span className="block font-bold text-lg">Change the instructions or tag number</span><span className="block text-sm text-slate-400">What the workshop reads on the card</span></button>
            {history.length > 0 && (
              <div className="rounded-xl border border-slate-700 p-3 space-y-1.5">
                <p className="text-sm font-bold text-slate-300">Changes made to this card</p>
                {history.map((h, i) => <p key={i} className="text-sm text-slate-300">{new Date(h.at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} · {h.by ?? 'Admin'} · {h.what}<span className="block text-slate-500">Why: {h.reason}</span></p>)}
              </div>
            )}
          </div>
        )}

        {part === 'mount' && !changedTo && (
          <div className="space-y-3">
            <div><label className={lab}>Change it to</label>
              <select className={field} value={to} onChange={e => setTo(e.target.value)}>
                <option value="">Choose…</option>
                {TARGETS.filter(t => t !== mount).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {tooLate && <p className="rounded-xl border border-red-500 bg-red-950/30 text-red-100 p-3">{TOO_LATE} It is at {deptLabel(department)} now.</p>}
            {groupOf(mount) === null && <p className="rounded-xl border border-amber-500 bg-amber-950/30 text-amber-100 p-3">{/pending/i.test(mount) || !mount ? 'The hunter has not chosen a mount yet.' : mountChange(mount, 'Full Mount').message}</p>}
            {rule && rule.kind !== 'unknown' && groupOf(mount) !== null && !tooLate && (
              <p className={`rounded-xl border p-3 ${rule.kind === 'blocked' ? 'border-red-500 bg-red-950/30 text-red-100' : 'border-green-600 bg-green-950/30 text-green-100'}`}>{rule.message}</p>
            )}
            {rule?.kind === 'blocked' && rule.canBuySkin && !tooLate && (
              line ? (
                <div className="space-y-2">
                  <p className="text-slate-300">If {clientName} still wants a {to}: their first mount is credited and its card closed, a hide purchase is added to the invoice, and a new job card starts for the stock skin.</p>
                  <button className="w-full min-h-12 rounded-xl border-2 border-amber-500 text-amber-200 font-bold" onClick={openBuySkin}>The client buys a skin from our stock</button>
                </div>
              ) : <p className="text-slate-400 text-sm">There is no accepted invoice for this animal yet. Add the stock skin to the quote first (Money → Quotes → Hide purchase), then come back.</p>
            )}
            {finishesFirst && !tooLate && <p className="rounded-xl border border-amber-500 bg-amber-950/30 text-amber-100 p-3">{finishesFirst}</p>}
            {rule?.kind === 'allowed' && !tooLate && (
              <>
                <div><label className={lab}>Why is it being changed? *</label><textarea rows={2} className={field} value={reason} onChange={e => setReason(e.target.value)} placeholder="For example: client asked on WhatsApp, 12 Nov" /></div>
                <button disabled={busy || !reason.trim()} className="w-full min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2" onClick={saveMount}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Change to {to}</button>
              </>
            )}
            <button className="min-h-11 text-slate-300 font-semibold" onClick={() => { setPart('menu'); setTo(''); }}>Back</button>
          </div>
        )}

        {part === 'mount' && changedTo && (
          <div className="space-y-3">
            <p className="rounded-xl bg-green-950/40 border border-green-700 text-green-200 p-4 text-lg font-semibold">The card is now a {changedTo}. The hunter has been told.</p>
            {line ? (
              <>
                <p className="text-slate-300">The price may change too. {line.description} is {money(line.amount ?? 0, quote!.currency)} on the invoice{priceOf(changedTo) ? `; a ${changedTo} costs ${money(priceOf(changedTo)!, quote!.currency)} on the price list` : ''}.</p>
                <button className="w-full min-h-12 rounded-xl bg-[#0073ea] text-white font-bold" onClick={() => openInvoiceUpdate(changedTo)}>Update the invoice now (credit note)</button>
              </>
            ) : <p className="text-slate-400 text-sm">No accepted invoice has this animal on it, so there is nothing to credit. Check the quote under Money → Quotes.</p>}
            <button className="min-h-11 text-slate-300 font-semibold" onClick={onClose}>Close</button>
          </div>
        )}

        {part === 'text' && (
          <div className="space-y-3">
            <div><label className={lab}>Instructions</label><textarea rows={4} className={field} value={instr} onChange={e => setInstr(e.target.value)} /></div>
            <div><label className={lab}>Tag number</label><input className={field} value={tagNo} onChange={e => setTagNo(e.target.value)} /></div>
            <div><label className={lab}>Why is it being changed? *</label><textarea rows={2} className={field} value={reason} onChange={e => setReason(e.target.value)} /></div>
            <button disabled={busy || !reason.trim() || (instr === instructions && tagNo === tag)} className="w-full min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2" onClick={saveText}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Save the changes</button>
            <button className="min-h-11 text-slate-300 font-semibold" onClick={() => setPart('menu')}>Back</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
