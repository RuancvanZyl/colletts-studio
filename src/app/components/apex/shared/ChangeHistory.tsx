/** ChangeHistory — everything that was changed on an order or for a client: when, who, what it was and what it became.
 *  Only managers can read it (the database decides) and nobody can edit or delete a line. */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface Line { id: string; at: string; table_name: string; action: 'insert' | 'update' | 'delete'; changed_by_name: string | null; changed_by_role: string | null; changes: Record<string, any>; }

const THING: Record<string, string> = {
  quotes: 'the quote', quote_lines: 'a line on the quote', quote_payments: 'a payment', quote_amendments: 'a credit note', client_credits: 'the client\'s credit',
  client_hunts: 'the hunt', hunt_documents: 'a job card', hunt_receivings: 'the receiving sheet', quality_cases: 'a rejected skin', soak_reports: 'a soak report',
  part_followups: 'missing parts', hunt_requirements: 'a document', trophy_photos: 'a photo', job_card_legs: 'a stage of a job card',
};
const WORD: Record<string, string> = {
  status: 'status', amount: 'amount', amount_due_now: 'amount due now', payment_option: 'how they pay', deposit_percent: 'deposit percent', currency: 'currency', note: 'note',
  description: 'description', 'form_data.mount_type': 'mount', 'form_data.instructions': 'instructions', 'form_data.tag_number': 'tag number', 'form_data.leather': 'leather work',
  'form_data.receiving_issue': 'issue found on arrival', 'form_data.condition': 'condition', current_department: 'department', deadline_current: 'deadline', completed_at: 'finished',
  shared_with_client: 'shown to the client', caption: 'caption', timeline_started_at: 'order clock started', work_authorised_at: 'work allowed to start',
};
const nice = (k: string) => WORD[k] ?? k.replace(/^form_data\./, '').replace(/_/g, ' ');
const show = (v: unknown) => v === null || v === undefined || v === '' ? 'nothing' : typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80);
const when = (iso: string) => new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function sentence(l: Line): string {
  const thing = THING[l.table_name] ?? l.table_name.replace(/_/g, ' ');
  if (l.action === 'insert') {
    const r = l.changes.row ?? {};
    const extra = l.table_name === 'quote_payments' ? ` of ${r.amount}${r.method ? ` (${r.method})` : ''}` : l.table_name === 'client_credits' ? ` of ${r.amount}` : l.table_name === 'quote_lines' || l.table_name === 'hunt_documents' ? `: ${r.description ?? r.title ?? ''}` : '';
    return `Added ${thing}${extra}`;
  }
  if (l.action === 'delete') return `Removed ${thing}`;
  const parts = Object.entries(l.changes).slice(0, 4).map(([k, v]: [string, any]) => `${nice(k)}: ${show(v?.from)} → ${show(v?.to)}`);
  const more = Object.keys(l.changes).length > 4 ? ` (and ${Object.keys(l.changes).length - 4} more)` : '';
  return `Changed ${thing}. ${parts.join('; ')}${more}`;
}

export function ChangeHistory({ huntId, clientId, limit = 100 }: { huntId?: string; clientId?: string; limit?: number }) {
  const [rows, setRows] = useState<Line[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    (async () => {
      let q = (supabase as any).from('audit_log').select('id, at, table_name, action, changed_by_name, changed_by_role, changes').order('at', { ascending: false }).limit(limit);
      if (huntId) q = q.eq('hunt_id', huntId);
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) { setFailed(true); setRows([]); return; }
      setRows(data ?? []);
    })();
  }, [huntId, clientId, limit]);

  if (rows === null) return <div className="flex items-center gap-2 text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" />Loading the history…</div>;
  if (failed) return <p className="text-sm text-slate-400">The history is not switched on yet. It starts once the history SQL has been run.</p>;
  if (rows.length === 0) return <p className="text-sm text-slate-400">Nothing has been changed yet.</p>;
  return (
    <ul className="divide-y divide-slate-800 rounded-lg border border-slate-700 text-sm">
      {rows.map(r => (
        <li key={r.id} className="px-3 py-2">
          <p className="text-slate-100">{sentence(r)}</p>
          <p className="text-xs text-slate-400">{when(r.at)} · {r.changed_by_name ?? 'Someone'}{r.changed_by_role ? ` (${r.changed_by_role.replace('_', ' ')})` : ''}</p>
        </li>
      ))}
    </ul>
  );
}
