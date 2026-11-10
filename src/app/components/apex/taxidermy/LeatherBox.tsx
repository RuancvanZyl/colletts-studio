import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { plainError } from '../../../../lib/plainError';
import { toast } from 'sonner';
import { LeatherCard } from '../shared/LeatherPicker';
import { leatherText, type Leather } from '../../../../lib/leather';

// Leftover skin on a job card: what the client wants done with it. Staff can write down an answer the client gave by phone or in person.
export function LeatherBox({ card, reload }: { card: { docId: string; leather: Leather | null; leftover: boolean }; reload: () => void }) {
  const l = card.leather;
  const [editing, setEditing] = useState(false);
  const undecided = !l?.choice || l.choice === 'later';
  const toConfirm = l?.choice === 'leather' && !l.confirmed_at;

  const save = async (v: Leather) => {
    const { error } = await (supabase as any).rpc('staff_set_leather', { p_doc: card.docId, p_choice: v.choice, p_items: v.choice === 'leather' ? v.items : null, p_note: v.note || null });
    if (error) { toast.error(plainError(error.message)); return; }
    toast.success('Saved on the card.');
    setEditing(false);
    reload();
  };
  const confirm = async () => {
    const note = window.prompt('Leather work agreed with the client. Add the agreed price or a note (optional):');
    if (note === null) return;
    const { error } = await (supabase as any).rpc('staff_confirm_leather', { p_doc: card.docId, p_note: note || null });
    if (error) toast.error(plainError(error.message)); else { toast.success('Marked as agreed.'); reload(); }
  };

  return (
    <div className={`rounded-xl border-2 p-3 space-y-2 ${undecided ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40'}`}>
      <p className="font-bold text-slate-900 dark:text-slate-100">Leftover skin</p>
      <p className="text-sm text-slate-800 dark:text-slate-200">
        {undecided ? (l?.choice === 'later' ? 'The client has not decided yet. Ask them again.' : 'Skin is left over and the client has not said what to do with it. They have been asked in the app.') : leatherText(l)}
        {l?.by_name ? ` · ${l.by === 'workshop' ? 'written down by' : 'chosen by'} ${l.by_name}` : ''}
        {l?.confirmed_at ? ' · agreed with the client' : ''}
      </p>
      {!editing && (
        <div className="flex flex-wrap gap-2">
          <button className="min-h-11 px-4 rounded-lg border-2 border-slate-400 font-bold text-sm text-slate-800 dark:text-slate-100" onClick={() => setEditing(true)}>{undecided ? 'Write down what the client said' : 'Change'}</button>
          {toConfirm && <button className="min-h-11 px-4 rounded-lg bg-green-700 hover:bg-green-800 text-white font-bold text-sm" onClick={confirm}>Agreed with the client</button>}
        </div>
      )}
      {editing && (
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
          <LeatherCard initial={l} saveLabel="Save" onSave={save} />
          <button className="w-full min-h-11 rounded-lg border-2 border-slate-300 dark:border-slate-600 font-bold text-sm text-slate-700 dark:text-slate-200" onClick={() => setEditing(false)}>Back</button>
        </div>
      )}
    </div>
  );
}
