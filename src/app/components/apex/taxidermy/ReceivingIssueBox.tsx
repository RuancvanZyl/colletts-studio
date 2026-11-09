import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { plainError } from '../../../../lib/plainError';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export interface ReceivingIssue {
  open: boolean; note: string; summary?: string; at?: string; by?: string; hold?: boolean;
  decision?: { option: string; note?: string | null; stock_ref?: string | null; by?: string; at?: string };
}

// What the workshop can decide for an animal that arrived with an issue. Production carries on while it is sorted out.
export const ISSUE_OPTIONS: { key: string; title: string; hint: string }[] = [
  { key: 'outfitter_replacement', title: 'The outfitter sends a replacement', hint: 'We ask the outfitter to send another one.' },
  { key: 'stock_replacement',     title: 'We replace it from our own stock', hint: 'You say which one from stock is used.' },
  { key: 'repair',                title: 'We repair it here', hint: 'The workshop fixes it as part of the work.' },
  { key: 'accept_as_is',          title: 'Carry on as it is', hint: 'Only if the client or outfitter agreed. Write who agreed.' },
  { key: 'client_decides',        title: 'The client must decide', hint: 'The outfitter is asked to talk to the client and tell us here.' },
];

export function issueOptionTitle(key?: string) { return ISSUE_OPTIONS.find(o => o.key === key)?.title ?? ''; }

export function ReceivingIssueBox({ card, isAdmin, reload }: { card: { docId: string; receivingIssue: ReceivingIssue | null }; isAdmin: boolean; reload: () => void }) {
  const issue = card.receivingIssue!;
  const dec = issue.decision;
  const [choosing, setChoosing] = useState(false);
  const [option, setOption] = useState(dec?.option ?? '');
  const [note, setNote] = useState(dec?.note ?? '');
  const [stock, setStock] = useState(dec?.stock_ref ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_decide_receiving_issue', { p_doc: card.docId, p_option: option, p_note: note.trim() || null, p_stock_ref: stock.trim() || null });
    setBusy(false);
    if (error) { toast.error(plainError(error.message)); return; }
    toast.success('Saved. The outfitter has been told.');
    setChoosing(false);
    reload();
  };

  const solved = async () => {
    const text = window.prompt('The issue is solved. Add a short note for the record and the outfitter (optional):');
    if (text === null) return;
    const { error } = await (supabase as any).rpc('staff_resolve_receiving_issue', { p_doc: card.docId, p_note: text || null });
    if (error) toast.error(plainError(error.message)); else { toast.success('Marked as solved. The outfitter has been told.'); reload(); }
  };

  return (
    <div role="alert" className={`rounded-xl border-2 p-3 space-y-2 ${dec ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-red-500 bg-red-50 dark:bg-red-950/30'}`}>
      <p className="font-bold text-red-800 dark:text-red-200">Received with an issue{issue.hold ? ' (held until it is solved)' : ' (production carries on)'}</p>
      <p className="text-sm text-slate-900 dark:text-slate-100">{issue.note || issue.summary}{issue.by ? ` · ${issue.by}` : ''}</p>

      {dec ? (
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Decided: {issueOptionTitle(dec.option)}{dec.stock_ref ? ` (${dec.stock_ref})` : ''}{dec.note ? `. ${dec.note}` : ''}{dec.by ? ` · ${dec.by}` : ''}
        </p>
      ) : (
        <p className="text-sm font-semibold text-red-800 dark:text-red-200">Still to decide: what do we do about this animal?</p>
      )}

      {!isAdmin && !dec && <p className="text-xs text-slate-600 dark:text-slate-400">A manager will decide. You can carry on with your work.</p>}

      {isAdmin && !choosing && (
        <div className="flex flex-wrap gap-2">
          <button className="min-h-11 px-4 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm" onClick={() => setChoosing(true)}>
            {dec ? 'Change the decision' : 'Decide what to do'}
          </button>
          <button className="min-h-11 px-4 rounded-lg bg-green-700 hover:bg-green-800 text-white font-bold text-sm" onClick={solved}>The issue is solved</button>
        </div>
      )}

      {isAdmin && choosing && (
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">What will we do about this animal?</p>
          {ISSUE_OPTIONS.map(o => (
            <label key={o.key} className={`flex gap-3 items-start rounded-lg border-2 p-2.5 cursor-pointer ${option === o.key ? 'border-green-600 bg-green-50 dark:bg-green-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="radio" name={`issue-${card.docId}`} className="mt-1 w-5 h-5" checked={option === o.key} onChange={() => setOption(o.key)} />
              <span><span className="block font-semibold text-sm text-slate-900 dark:text-slate-100">{o.title}</span><span className="block text-xs text-slate-600 dark:text-slate-400">{o.hint}</span></span>
            </label>
          ))}
          {option === 'stock_replacement' && (
            <input className="w-full min-h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" placeholder="Which one from stock? (for example the skin number)" value={stock} onChange={e => setStock(e.target.value)} />
          )}
          <textarea className="w-full min-h-20 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" value={note} onChange={e => setNote(e.target.value)}
            placeholder={option === 'accept_as_is' ? 'Who agreed to carry on as it is? (needed)' : 'A short note for the record and the outfitter (optional)'} />
          <div className="flex flex-wrap gap-2">
            <button disabled={!option || busy} className="min-h-11 px-4 rounded-lg bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-bold text-sm inline-flex items-center gap-2" onClick={save}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}Save and tell the outfitter
            </button>
            <button className="min-h-11 px-4 rounded-lg border-2 border-slate-300 dark:border-slate-600 font-bold text-sm text-slate-700 dark:text-slate-200" onClick={() => setChoosing(false)}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
