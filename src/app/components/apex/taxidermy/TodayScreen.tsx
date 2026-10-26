/**
 * TodayScreen — the manager's morning view, in plain sentences:
 *   what needs you, what is in the workshop, how the month is going.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { ArrowRight, CheckCircle2, ClipboardCheck, RefreshCw, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../../../../lib/auth';
import { useWorkshopStats } from '../../../../lib/hooks/useWorkshopStats';
import { useAttentionItems } from '../../../../lib/hooks/useAttentionItems';
import { useClientCare } from '../../../../lib/hooks/useClientCare';
import { useDeadlineWatch } from '../../../../lib/hooks/useDeadlineWatch';
import { useAwaitingInstruction } from '../../../../lib/hooks/useAwaitingInstruction';
import { DEPT_COLORS } from '../../../../lib/pipeline';
import { DEPT_TO_VIEW } from '../../../../lib/stations';
import { useQuotePipeline } from '../../../../lib/hooks/useQuotes';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function TodayScreen({ onNavigate }: { onNavigate: (view: string, clientId?: string) => void }) {
  const { profile } = useAuth();
  const { stats, loading, refresh } = useWorkshopStats();
  const { items: attention } = useAttentionItems();
  const { overdue: careOverdue } = useClientCare();
  const { overdue: deadlinesOverdue } = useDeadlineWatch();
  const { hunts: waitingForMounts } = useAwaitingInstruction();
  const { rows: quoteRows } = useQuotePipeline();
  const toQuote = quoteRows.filter(r => r.stage === 'to_quote').length;
  const changes = quoteRows.filter(r => r.stage === 'declined').length;
  const awaitingPay = quoteRows.filter(r => r.stage === 'awaiting_deposit').length;

  const [docs, setDocs] = useState({ toCheck: 0, fromOutfitter: 0, unreadChat: 0, unverified: 0 });
  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const { data: v } = await db.from('v_hunt_documents').select('to_check, waiting_outfitter');
      const { count } = await db.from('outfitter_messages').select('id', { count: 'exact', head: true }).eq('sender', 'outfitter').is('read_at', null);
      const { count: unv } = await db.from('registered_numbers').select('id', { count: 'exact', head: true }).is('verified_at', null);
      setDocs({ unverified: unv ?? 0, toCheck: (v ?? []).reduce((n: number, r: any) => n + +r.to_check, 0), fromOutfitter: (v ?? []).filter((r: any) => +r.waiting_outfitter > 0).length, unreadChat: count ?? 0 });
    })().catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = profile?.full_name?.split(' ')[0] ?? '';

  // Most urgent first. Each one is a sentence a person can act on.
  const needs = [
    { n: toQuote, text: plural(toQuote, 'hunter has chosen their mounts and needs a quote', 'hunters have chosen their mounts and need a quote'), go: 'quotes', tone: 'amber' },
    { n: changes, text: plural(changes, 'hunter asked for changes to their quote', 'hunters asked for changes to their quote'), go: 'quotes', tone: 'red' },
    { n: awaitingPay, text: plural(awaitingPay, 'accepted quote is waiting for payment', 'accepted quotes are waiting for payment'), go: 'quotes', tone: 'amber' },
    { n: docs.toCheck, text: plural(docs.toCheck, 'document has arrived and needs checking', 'documents have arrived and need checking'), go: 'documents', tone: 'amber' },
    { n: docs.unverified, text: plural(docs.unverified, 'permit number from an outfitter needs verifying', 'permit numbers from outfitters need verifying'), go: 'permit-numbers', tone: 'amber' },
    { n: docs.unreadChat, text: plural(docs.unreadChat, 'unread message from an outfitter', 'unread messages from outfitters'), go: 'outfitter-chat', tone: 'amber' },
    { n: docs.fromOutfitter, text: plural(docs.fromOutfitter, 'hunt is waiting on documents from the outfitter', 'hunts are waiting on documents from outfitters'), go: 'documents', tone: 'blue' },
    { n: deadlinesOverdue.length, text: plural(deadlinesOverdue.length, 'hunt is past its deadline', 'hunts are past their deadline'), go: 'deadline-watch', tone: 'red' },
    { n: attention?.stalledRed ?? 0, text: plural(attention?.stalledRed ?? 0, 'animal has been stuck for far too long', 'animals have been stuck for far too long'), go: 'daily-todo', tone: 'red' },
    { n: attention?.unreadMessages ?? 0, text: plural(attention?.unreadMessages ?? 0, 'unread message from a hunter', 'unread messages from hunters'), go: 'client-inbox', tone: 'amber' },
    { n: waitingForMounts.length, text: plural(waitingForMounts.length, 'hunter has not told us what to do with their trophies', 'hunters have not told us what to do with their trophies'), go: 'awaiting-instruction', tone: 'amber' },
    { n: careOverdue, text: plural(careOverdue, 'hunter needs a call or message from us', 'hunters need a call or message from us'), go: 'client-care', tone: 'amber' },
    { n: attention?.unassignedActive ?? 0, text: plural(attention?.unassignedActive ?? 0, 'job has nobody assigned', 'jobs have nobody assigned'), go: 'dispatch', tone: 'blue' },
    { n: attention?.newHunterSubmissions ?? 0, text: plural(attention?.newHunterSubmissions ?? 0, 'new job from a hunter to review', 'new jobs from hunters to review'), go: 'inventory', tone: 'blue' },
  ].filter(x => x.n > 0);

  const tone: Record<string, string> = {
    red: 'border-l-red-500', amber: 'border-l-amber-500', blue: 'border-l-sky-500',
  };
  const maxDept = Math.max(1, ...(stats?.byDept.map(d => d.count) ?? [1]));

  return (
    <div className="max-w-3xl space-y-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">{greeting}{first ? `, ${first}` : ''}</h1>
          <p className="text-base text-slate-400 mt-1">{new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={refresh} disabled={loading} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:text-white" aria-label="Refresh">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => onNavigate('arrival')} className="min-h-16 rounded-2xl bg-[#0073ea] hover:bg-[#0064cc] text-white text-lg font-bold flex items-center justify-center gap-3">
          <ClipboardCheck className="w-6 h-6" />Check in trophies
        </button>
        <button onClick={() => onNavigate('clients')} className="min-h-16 rounded-2xl border-2 border-slate-600 text-slate-100 text-lg font-bold flex items-center justify-center gap-3 hover:border-slate-400">
          <Search className="w-6 h-6" />Find a hunter
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Needs you</h2>
        {needs.length === 0 ? (
          <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 flex items-center gap-3 text-emerald-300 text-lg">
            <CheckCircle2 className="w-7 h-7 shrink-0" />Nothing needs you right now.
          </div>
        ) : needs.map(x => (
          <button key={x.go + x.text} onClick={() => onNavigate(x.go)}
            className={`w-full text-left rounded-xl border border-slate-700 border-l-8 ${tone[x.tone]} bg-[#111c26] hover:bg-[#162330] px-4 py-4 flex items-center gap-4 min-h-16`}>
            <span className="text-3xl font-bold text-white tabular-nums w-14 shrink-0">{x.n}</span>
            <span className="flex-1 text-lg text-slate-100 leading-snug">{x.text.replace(/^\d+ /, '')}</span>
            <ArrowRight className="w-5 h-5 text-slate-500 shrink-0" />
          </button>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">In the workshop</h2>
          {stats && <span className="text-base text-slate-300">{plural(stats.totalActive, 'animal', 'animals')} in total</span>}
        </div>
        {loading && !stats ? <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div> : (
          <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
            {(stats?.byDept ?? []).length === 0 && <p className="p-5 text-slate-400 text-base">Nothing in production.</p>}
            {(stats?.byDept ?? []).map(d => {
              const color = DEPT_COLORS[d.dept] ?? '#64748b';
              return (
                <button key={d.dept} onClick={() => onNavigate(DEPT_TO_VIEW[d.dept] ?? 'workshop-brief')}
                  className="w-full text-left px-4 py-3 flex items-center gap-4 min-h-14 hover:bg-[#162330]">
                  <span className="flex-1 sm:flex-none sm:w-48 shrink-0 text-base text-slate-100 font-medium">{d.label}</span>
                  <span className="hidden sm:block flex-1 h-3 rounded-full bg-slate-800 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${(d.count / maxDept) * 100}%`, backgroundColor: color }} /></span>
                  <span className="w-10 text-right text-xl font-bold text-white tabular-nums">{d.count}</span>
                  {d.stalled > 0 && <span className="text-sm font-semibold text-red-300 bg-red-950/60 rounded-full px-2.5 py-0.5 whitespace-nowrap">{d.stalled} stuck</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">This month</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { n: Math.max(0, (stats?.totalActive ?? 0) - (stats?.byDept.find(d => d.dept === 'receiving')?.count ?? 0)), label: 'Being worked on' },
            { n: stats?.completedThisMonth ?? 0, label: 'Finished' },
            { n: (stats?.pendingPayment ?? 0) + awaitingPay, label: 'Waiting for payment' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-slate-700 bg-[#111c26] p-4 text-center">
              <p className="text-4xl font-bold text-white tabular-nums">{loading && !stats ? '–' : s.n}</p>
              <p className="text-sm text-slate-300 mt-1 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
