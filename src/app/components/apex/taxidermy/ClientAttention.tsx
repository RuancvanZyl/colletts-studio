/**
 * ClientAttention — the first thing on a client's profile: what is wrong, in plain words,
 * and where to go to fix it. Nothing is shown when everything is fine.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useClientHunts } from '../../../../lib/hooks/useClientHunts';

const RE_INSTR  = /await(ing)?\s*(more\s*)?(photos\s*re\s*)?instr|finalis(e|ing)\s*instr|instructions?\s*(o\s*s|outstanding)|thinking about instructions/i;
const RE_UNPAID = /await(ing)?\s*(a\s*)?(deposit|dep\b|payment|payement|pmt)|req(uest)?\s*balance|o\s*s\s*balance|not paid/i;
const RE_PAID   = /fully\s*paid/i;

export function ClientAttention({ client, onGoTo }: {
  client: { id: string; email?: string | null; phone?: string | null; full_name: string };
  onGoTo: (tab: 'hunts' | 'info' | 'messages') => void;
}) {
  const { hunts, loading } = useClientHunts(client.id);
  if (loading) return null;

  const today = new Date().toISOString().slice(0, 10);
  const items: { text: string; tab: 'hunts' | 'info' | 'messages'; level: 'red' | 'amber' }[] = [];
  const active = hunts.filter(h => h.status === 'active');

  for (const h of active) {
    const ref = h.ref_number;
    const folder = h.dropbox_path ?? '';
    const jobCards = h.documents.filter(d => d.doc_type === 'job_card');
    if (jobCards.length === 0) items.push({ text: `${ref}: no job card yet — the trophies need a job card.`, tab: 'hunts', level: 'amber' });
    if (h.deadline_current && h.deadline_current < today) {
      const days = Math.floor((Date.now() - new Date(h.deadline_current).getTime()) / 86_400_000);
      items.push({ text: `${ref}: ${days} day${days !== 1 ? 's' : ''} past the promised deadline (${new Date(h.deadline_current).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}).`, tab: 'hunts', level: 'red' });
    }
    const late = (h.milestones ?? []).filter(m => !m.completed && m.due_date < today);
    if (late.length > 0) items.push({ text: `${ref}: ${late.length} production milestone${late.length !== 1 ? 's' : ''} overdue (${late.map(m => m.label.split(' — ')[0]).join(', ')}).`, tab: 'hunts', level: 'red' });
    if (RE_UNPAID.test(folder) && !RE_PAID.test(folder)) items.push({ text: `${ref}: deposit / payment still outstanding.`, tab: 'hunts', level: 'amber' });
    if ((h as any).awaiting_instruction || RE_INSTR.test(folder)) items.push({ text: `${ref}: waiting for the client to tell us what they want done.`, tab: 'messages', level: 'amber' });
    if (!folder) items.push({ text: `${ref}: no Dropbox folder linked.`, tab: 'hunts', level: 'amber' });
  }

  const email = (client.email ?? '').trim();
  const phone = (client.phone ?? '').replace(/\D/g, '');
  const emailOk = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email);
  if (!emailOk && phone.length < 7) items.push({ text: 'No usable email or phone number — we cannot contact this client.', tab: 'info', level: 'red' });
  else {
    if (email && !emailOk) items.push({ text: `The email address "${email}" does not look right.`, tab: 'info', level: 'amber' });
    if (!email) items.push({ text: 'No email address on file — updates cannot be emailed.', tab: 'info', level: 'amber' });
  }

  if (items.length === 0) {
    return active.length > 0 ? (
      <div className="mb-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
        <CheckCircle2 className="w-4 h-4" /> Nothing needs attention for {client.full_name} right now.
      </div>
    ) : null;
  }

  return (
    <div className="mb-3 rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50/70 dark:bg-red-950/30 p-3 space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300 flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4" /> Needs attention ({items.length})
      </p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${it.level === 'red' ? 'bg-red-600' : 'bg-amber-500'}`} />
            <span className="flex-1 text-slate-800 dark:text-slate-200">{it.text}</span>
            <button onClick={() => onGoTo(it.tab)} className="text-xs text-[#0073ea] hover:underline shrink-0">
              {it.tab === 'info' ? 'Fix details' : it.tab === 'messages' ? 'Message client' : 'Open hunt'} →
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
