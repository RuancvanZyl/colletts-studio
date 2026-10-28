/**
 * RejectionCases — skins rejected at the soak. The outfitter is told, acknowledges it (recorded), the outfitter and the workshop talk
 * (in the app, or on WhatsApp and logged here), and the outcome is one of three: replaced by the outfitter, replaced from stock,
 * or the client decides. A client decision can change the job card and the quote, so both are flagged.
 */
import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useLiveRefresh } from '../../../../lib/liveRefresh';
import { useAuth } from '../../../../lib/auth';
import { WORKSHOP } from '../../../../lib/workshop';
import { whatsappUrl } from '../../../../lib/invite';
import { soakSummary, type SoakFindings } from '../../../../lib/soak';
import { informDaysLeft, informDeadline } from '../../../../lib/cases';
import { recommendOutcome, type OutcomeRecommendation } from '../../../../lib/aiReader';
import { OutfitterThread } from '../shared/OutfitterThread';
import { OrderChangeDialog } from './OrderChangeDialog';
import { loadQuotes, type Quote } from '../../../../lib/hooks/useQuotes';
import { MOUNT_OPTIONS } from '../../../../lib/pricing';

interface Case {
  id: string; hunt_id: string; job_doc_id: string; status: 'open' | 'outcome_set' | 'resolved'; reasons: string[]; note: string | null; created_at: string; created_by_name: string | null;
  outfitter_notified_at: string | null; outfitter_ack_at: string | null; outfitter_ack_by_name: string | null; outcome_at: string | null; ai_recommendation: OutcomeRecommendation | null; ai_recommended_at: string | null;
  outcome: 'outfitter_replacement' | 'stock_replacement' | 'client_decision' | null; outcome_note: string | null; stock_reference: string | null; outcome_by_name: string | null;
  client_informed_by: string | null; client_informed_at: string | null; client_decision: string | null; client_decision_note: string | null;
  needs_job_card_change: boolean; needs_quote_change: boolean; resolved_at: string | null; resolution_note: string | null;
  order_override_at: string | null; order_override_by_name: string | null; order_override_reason: string | null; replacement_arrived_at: string | null; cancelled_at: string | null; cancel_reason: string | null;
  doc: { form_data: any } | null; hunt: { clients: { full_name: string } | null } | null; outfitter: { name: string; phone: string | null; contact_name: string | null } | null;
  soak: { findings: SoakFindings; holes: number | null; tannery_type: string; tannery_name: string | null } | null;
}
const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const fmt = (d: string | null) => d ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const OUTCOMES: { v: NonNullable<Case['outcome']>; title: string; body: string }[] = [
  { v: 'outfitter_replacement', title: 'The outfitter replaces it', body: 'The outfitter supplies another skin.' },
  { v: 'stock_replacement', title: 'Replace it from our stock', body: 'The workshop supplies a skin from its own stock.' },
  { v: 'client_decision', title: 'The client decides', body: 'If neither is possible, the client changes the order or scraps it.' },
];

export function RejectionCases({ initialCaseId, onNavigate }: { initialCaseId?: string; onNavigate: (view: string, id?: string) => void }) {
  const { profile } = useAuth();
  const isMgmt = ['admin', 'studio_manager'].includes(profile?.role ?? '');
  const canDecide = isMgmt || ((profile as any)?.manages_departments ?? []).includes('tannery');
  const [cases, setCases] = useState<Case[] | null>(null);
  const [open, setOpen] = useState<string | null>(initialCaseId ?? null);
  const load = useCallback(async () => {
    const { data } = await (supabase as any).from('quality_cases').select('*, doc:hunt_documents(form_data), hunt:client_hunts(clients(full_name)), outfitter:outfitters(name, phone, contact_name), soak:soak_reports(findings, holes, tannery_type, tannery_name)').order('created_at', { ascending: false });
    setCases(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['quality_cases', 'outfitter_messages'], load);

  if (!cases) return <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>;
  const held = (c: Case) => c.status !== 'resolved' && !!c.order_override_at;
  const groups: [string, Case[]][] = [
    ['Held aside: the order is carrying on without these', cases.filter(held)],
    ['Waiting for the outfitter to acknowledge', cases.filter(c => !held(c) && c.status === 'open' && !c.outfitter_ack_at && c.outfitter)],
    ['Being discussed', cases.filter(c => !held(c) && c.status === 'open' && (c.outfitter_ack_at || !c.outfitter))],
    ['Outcome set, still to be completed', cases.filter(c => !held(c) && c.status === 'outcome_set')],
    ['Closed', cases.filter(c => c.status === 'resolved')],
  ];
  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-slate-100">Rejected skins</h1><p className="text-base text-slate-400 mt-1">Skins rejected at the soak. The outfitter is told with the reasons, acknowledges it, and you agree what happens next.</p></div>
        <button onClick={load} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-slate-700 text-slate-300" aria-label="Refresh"><RefreshCw className="w-5 h-5" /></button>
      </div>
      {cases.length === 0 && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">No skins have been rejected.</p>}
      {groups.map(([title, list]) => list.length > 0 && (
        <section key={title} className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">{title} · {list.length}</h2>
          {list.map(c => <CaseCard key={c.id} c={c} open={open === c.id} toggle={() => setOpen(open === c.id ? null : c.id)} canDecide={canDecide} isMgmt={isMgmt} reload={load} onNavigate={onNavigate} />)}
        </section>
      ))}
    </div>
  );
}

function CaseCard({ c, open, toggle, canDecide, isMgmt, reload, onNavigate }: { c: Case; open: boolean; toggle: () => void; canDecide: boolean; isMgmt: boolean; reload: () => void; onNavigate: (view: string, id?: string) => void }) {
  const species = c.doc?.form_data?.species ?? 'Skin'; const client = c.hunt?.clients?.full_name ?? 'Client';
  const [wa, setWa] = useState({ from: 'outfitter', text: '' });
  const [stock, setStock] = useState(''); const [outNote, setOutNote] = useState('');
  const [who, setWho] = useState(c.outcome === 'client_decision' && (informDaysLeft(c) ?? 1) < 0 ? 'workshop' : 'outfitter'); const [decision, setDecision] = useState(''); const [cnote, setCnote] = useState('');
  const [resNote, setResNote] = useState(''); const [busy, setBusy] = useState(false); const [thinking, setThinking] = useState(false);
  const [newMount, setNewMount] = useState('');
  const [changeQuote, setChangeQuote] = useState<{ quote: Quote; type: string } | null>(null);
  async function openChange() {
    setBusy(true);
    const [q] = await loadQuotes({ huntId: c.hunt_id });
    const { data: h } = await (supabase as any).from('client_hunts').select('client_type, clients(client_type)').eq('id', c.hunt_id).single();
    setBusy(false);
    if (!q || !['accepted', 'deposit_paid', 'paid'].includes(q.status)) { toast.error('There is no accepted invoice for this hunt yet. Edit the quote instead.'); return; }
    setChangeQuote({ quote: q, type: h?.clients?.client_type ?? h?.client_type ?? 'export' });
  }
  const rec = c.ai_recommendation;
  const left = informDaysLeft(c);
  async function askAi() {
    setThinking(true);
    try {
      const r = await recommendOutcome(c.id);
      const { error } = await (supabase as any).rpc('case_save_recommendation', { p_case: c.id, p_data: r });
      if (error) throw new Error(error.message);
      toast.success('Recommendation ready. You still choose the outcome.'); reload();
    } catch (e: any) { toast.error(e.message); } finally { setThinking(false); }
  }
  const call = async (fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(true); const { error } = await (supabase as any).rpc(fn, args); setBusy(false);
    if (error) { toast.error(error.message); return false; } toast.success(ok); reload(); return true;
  };
  const message = `Hi ${(c.outfitter?.contact_name ?? c.outfitter?.name ?? '').split(' ')[0]}, the ${species} for ${client} was rejected at the soak at ${WORKSHOP.name}. Reasons: ${c.reasons.join(', ')}. Please open the app to acknowledge this and tell us how you want to proceed: ${WORKSHOP.portalUrl}`;
  const heldAside = c.status !== 'resolved' && !!c.order_override_at;
  const ask = (q: string) => { const r = window.prompt(q); return r && r.trim() ? r.trim() : null; };
  const chip = heldAside ? ['Held aside', 'bg-red-900/60 text-red-200'] : c.status === 'resolved' ? ['Closed', 'bg-slate-700 text-slate-200'] : c.status === 'outcome_set' ? ['Outcome set', 'bg-sky-900/60 text-sky-200'] : !c.outfitter ? ['No outfitter', 'bg-amber-900/60 text-amber-200'] : c.outfitter_ack_at ? ['Acknowledged', 'bg-green-900/60 text-green-200'] : ['Not acknowledged yet', 'bg-red-900/60 text-red-200'];

  return (
    <div className="rounded-2xl border border-slate-700 bg-[#111c26] overflow-hidden">
      <button onClick={toggle} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-16">
        <span className="flex-1 min-w-0"><span className="block text-lg font-bold text-slate-100">{species} <span className="font-normal text-slate-400">· {client}</span></span><span className="block text-sm text-slate-400">{c.outfitter ? `via ${c.outfitter.name} · ` : ''}rejected {fmt(c.created_at)} · {c.reasons.join(', ')}</span></span>
        <span className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${chip[1]}`}>{chip[0]}</span>
        {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-3">
          <div className="space-y-1 text-sm text-slate-300">
            <p><strong className="text-slate-100">Why:</strong> {c.reasons.join(', ')}{c.note ? ` · ${c.note}` : ''}</p>
            {c.soak?.tannery_type === 'in_house' && <p><strong className="text-slate-100">Soak report:</strong> {soakSummary(c.soak.findings, c.soak.holes)}</p>}
            {c.soak?.tannery_type === 'third_party' && <p><strong className="text-slate-100">Soak report:</strong> third-party tannery {c.soak.tannery_name}</p>}
            <p><strong className="text-slate-100">Outfitter:</strong> {!c.outfitter ? 'This hunt has no outfitter. Contact the hunter directly.' : c.outfitter_ack_at ? `acknowledged ${fmt(c.outfitter_ack_at)}` : `notified ${fmt(c.outfitter_notified_at)}, has not acknowledged yet`}</p>
          </div>

          {c.outfitter && (
            <div className="flex flex-wrap gap-2">
              <button disabled={!c.outfitter.phone} onClick={() => window.open(whatsappUrl(c.outfitter!.phone, message), '_blank', 'noopener')} className="min-h-11 px-4 rounded-lg border border-slate-500 text-slate-100 font-semibold flex items-center gap-2 disabled:opacity-50"><MessageCircle className="w-4 h-4 text-green-400" />Send on WhatsApp</button>
              <button onClick={async () => { try { await navigator.clipboard.writeText(message); toast.success('Message copied'); } catch { window.prompt('Copy this message:', message); } }} className="min-h-11 px-4 rounded-lg border border-slate-500 text-slate-100 font-semibold flex items-center gap-2"><Copy className="w-4 h-4" />Copy message</button>
            </div>
          )}

          {c.outfitter && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">The conversation</h3>
              <OutfitterThread huntId={c.hunt_id} side="workshop" caseId={c.id} canWrite={canDecide} />
              {canDecide && (
                <div className="rounded-xl border border-slate-700 p-3 space-y-2">
                  <p className="text-sm font-semibold text-slate-300">Spoke on WhatsApp or the phone? Write down what was said so it is on record.</p>
                  <select className={field} value={wa.from} onChange={e => setWa(p => ({ ...p, from: e.target.value }))}><option value="outfitter">The outfitter said</option><option value="workshop">We said</option></select>
                  <textarea rows={2} className={field} value={wa.text} onChange={e => setWa(p => ({ ...p, text: e.target.value }))} placeholder="Paste or type the message" />
                  <button disabled={busy || !wa.text.trim()} className="min-h-11 px-4 rounded-lg bg-[#0073ea] text-white font-semibold disabled:opacity-50" onClick={async () => { if (await call('log_case_whatsapp', { p_case: c.id, p_from: wa.from, p_body: wa.text }, 'Added to the conversation')) setWa(p => ({ ...p, text: '' })); }}>Add to the conversation</button>
                </div>
              )}
            </div>
          )}

          {c.status !== 'resolved' && (
            <div className={`rounded-xl border-2 p-3 space-y-2 ${heldAside ? 'border-red-600 bg-red-950/20' : 'border-slate-600'}`}>
              <h3 className="text-lg font-bold text-slate-100">The rest of the order</h3>
              {heldAside ? (
                <>
                  <p className="text-sm text-red-200"><strong>The order is carrying on without this trophy.</strong> Overridden by {c.order_override_by_name} on {fmt(c.order_override_at)}: {c.order_override_reason}. The good trophies can be passed on and shipped. This one stays red on the job card until it is solved.</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300">Until this is solved the order cannot be shipped. If the other trophies are good, management can let them carry on.</p>
                  {isMgmt ? <button disabled={busy} onClick={async () => { const r = ask('Why can the order carry on without this trophy? (this is recorded)'); if (r) await call('case_override_order', { p_case: c.id, p_reason: r }, 'The order will carry on without this trophy'); }} className="min-h-12 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50">Carry on with the good trophies (management override)</button> : <p className="text-xs text-slate-500">Only management can override this.</p>}
                </>
              )}
              <p className="text-sm text-slate-300">It is solved when:</p>
              <ul className="text-sm text-slate-300 list-disc pl-5"><li>a replacement arrives and gets a new soak report that is accepted (the trophy then catches up), or</li><li>management cancels this trophy and the quote is credited.</li></ul>
              <div className="flex flex-wrap gap-2">
                {canDecide && ['outfitter_replacement', 'stock_replacement'].includes(c.outcome ?? '') && !c.replacement_arrived_at && <button disabled={busy} onClick={async () => { const r = window.prompt('Note about the replacement (optional)'); if (r !== null) await call('case_replacement_arrived', { p_case: c.id, p_note: r || null }, 'Recorded: do a new soak report on the card'); }} className="min-h-11 px-4 rounded-lg border-2 border-green-500 text-green-200 font-bold disabled:opacity-50">The replacement has arrived</button>}
                {c.replacement_arrived_at && <p className="text-sm text-green-200 self-center">Replacement arrived {fmt(c.replacement_arrived_at)}. A new soak report is needed on the card.</p>}
                {isMgmt && <button disabled={busy} onClick={async () => { const r = ask('Why is this trophy cancelled? (this is recorded, and the quote will need a credit)'); if (r && window.confirm('Cancel this trophy? Its job card will be cancelled.')) await call('case_cancel_trophy', { p_case: c.id, p_reason: r }, 'Trophy cancelled. Review the quote.'); }} className="min-h-11 px-4 rounded-lg border-2 border-red-500 text-red-200 font-bold disabled:opacity-50">Cancel this trophy</button>}
              </div>
            </div>
          )}

          {canDecide && c.status !== 'resolved' && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">What happens next</h3>
              {!c.outcome && c.outfitter && (
                <div className="rounded-xl border border-violet-600 bg-violet-950/20 p-3 space-y-2">
                  <div className="flex items-center gap-3"><p className="flex-1 font-bold text-violet-200">AI recommendation</p><button disabled={thinking} onClick={askAi} className="min-h-11 px-4 rounded-lg border border-violet-400 text-violet-100 font-semibold disabled:opacity-50 flex items-center gap-2">{thinking && <Loader2 className="w-4 h-4 animate-spin" />}{rec ? 'Read the conversation again' : 'Read the conversation and recommend'}</button></div>
                  {rec && (
                    <div className="space-y-1.5 text-sm text-slate-200">
                      <p className="text-base font-bold text-violet-100">{rec.recommended_outcome ? OUTCOMES.find(o => o.v === rec.recommended_outcome)?.title : 'Not enough to recommend yet'}</p>
                      <p>{rec.reasoning}</p>
                      {rec.what_was_said.length > 0 && <ul className="list-disc pl-5 text-slate-300">{rec.what_was_said.map((w, i) => <li key={i}>{w}</li>)}</ul>}
                      {rec.unclear.length > 0 && <p className="text-amber-200"><strong>Still unclear:</strong> {rec.unclear.join('; ')}</p>}
                      <p><strong>Next step:</strong> {rec.next_step}</p>
                      <p className="text-xs text-slate-500">A suggestion from the AI based on the conversation{c.ai_recommended_at ? `, ${fmt(c.ai_recommended_at)}` : ''}. You decide below.</p>
                    </div>
                  )}
                </div>
              )}
              {!c.outcome ? (
                <div className="space-y-2">
                  {OUTCOMES.map(o => (
                    <div key={o.v} className="rounded-xl border border-slate-600 p-3 space-y-2">
                      <p className="font-bold text-slate-100">{o.title}{rec?.recommended_outcome === o.v && <span className="ml-2 rounded-full bg-violet-700 text-white text-xs px-2 py-0.5">AI suggests</span>}</p><p className="text-sm text-slate-400">{o.body}</p>
                      {o.v === 'stock_replacement' && <input className={field} placeholder="Which skin from stock?" value={stock} onChange={e => setStock(e.target.value)} />}
                      <input className={field} placeholder="Note (optional)" value={outNote} onChange={e => setOutNote(e.target.value)} />
                      <button disabled={busy || (o.v === 'stock_replacement' && !stock.trim())} onClick={() => call('case_set_outcome', { p_case: c.id, p_outcome: o.v, p_note: outNote || null, p_stock_ref: o.v === 'stock_replacement' ? stock : null }, 'Outcome recorded')} className="min-h-11 px-4 rounded-lg border-2 border-[#0073ea] text-sky-200 font-bold disabled:opacity-50">Choose this</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-sky-700 bg-sky-950/30 p-3 space-y-2 text-sm text-slate-200">
                  <p className="font-bold text-sky-200">{OUTCOMES.find(o => o.v === c.outcome)?.title}</p>
                  {c.stock_reference && <p>From stock: {c.stock_reference}</p>}
                  {c.outcome_note && <p>{c.outcome_note}</p>}
                  <p className="text-slate-400">Set by {c.outcome_by_name}</p>
                  {c.outcome === 'client_decision' && (
                    <div className="space-y-2 pt-1">
                      <p className="text-slate-300">The outfitter has 3 weeks to tell the client. After that it is the workshop's job.</p>
                      {!c.client_informed_at && left !== null && (left < 0
                        ? <p className="rounded-lg border-2 border-red-500 bg-red-950/30 text-red-200 font-semibold p-2">The outfitter has not told the client in 3 weeks ({-left} day{left === -1 ? '' : 's'} over). The workshop must now tell the client.</p>
                        : <p className="text-amber-200">The outfitter should tell the client by {informDeadline(c.outcome_at)?.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} ({left} day{left === 1 ? '' : 's'} left).</p>)}
                      <select className={field} value={who} onChange={e => setWho(e.target.value)}><option value="outfitter">The outfitter told the client</option><option value="workshop">The workshop told the client</option></select>
                      <select className={field} value={decision} onChange={e => setDecision(e.target.value)}><option value="">The client has not decided yet</option><option value="change_order">The client changes the order</option><option value="scrap">The client scraps it</option></select>
                      <input className={field} placeholder="Note (optional)" value={cnote} onChange={e => setCnote(e.target.value)} />
                      <button disabled={busy} onClick={() => call('case_record_client', { p_case: c.id, p_informed_by: who, p_decision: decision || null, p_note: cnote || null }, 'Recorded')} className="min-h-11 px-4 rounded-lg border-2 border-[#0073ea] text-sky-200 font-bold disabled:opacity-50">Record</button>
                      {c.client_informed_at && <p className="text-slate-300">Client told by the {c.client_informed_by} {fmt(c.client_informed_at)}{c.client_decision ? ` · decided to ${c.client_decision === 'scrap' ? 'scrap it' : 'change the order'}` : ' · no decision yet'}</p>}
                    </div>
                  )}
                </div>
              )}
              {(c.needs_job_card_change || c.needs_quote_change) && (
                <div className="rounded-xl border-2 border-amber-500 bg-amber-950/20 p-3 space-y-3">
                  <p className="font-bold text-amber-200">This changes the order</p>
                  {c.needs_job_card_change && (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-100"><strong>The job card.</strong> Keep it as it is (a replacement skin of the same mount), or change the mount.</p>
                      {isMgmt ? (
                        <div className="flex flex-wrap gap-2">
                          <select className={`${field} !w-auto min-w-[180px]`} value={newMount} onChange={e => setNewMount(e.target.value)}><option value="">Choose a different mount…</option>{MOUNT_OPTIONS.filter(m => !m.special).map(m => <option key={m.key} value={m.name}>{m.name}</option>)}</select>
                          <button disabled={busy || !newMount} onClick={() => call('case_update_card', { p_case: c.id, p_mount: newMount }, 'The job card now has the new mount')} className="min-h-11 px-4 rounded-lg border border-amber-400 text-amber-100 font-semibold disabled:opacity-50">Change the mount</button>
                          <button disabled={busy} onClick={() => call('case_update_card', { p_case: c.id, p_mount: null }, 'Job card left as it is')} className="min-h-11 px-4 rounded-lg border border-amber-400 text-amber-100 font-semibold disabled:opacity-50">Keep it as it is</button>
                        </div>
                      ) : <p className="text-xs text-slate-400">Management changes the job card.</p>}
                    </div>
                  )}
                  {c.needs_quote_change && (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-100"><strong>The invoice.</strong> Run a credit note for the trophy, then add what replaces it: a new mount, a hide bought from stock, or both.</p>
                      <div className="flex flex-wrap gap-2">
                        <button disabled={busy} onClick={openChange} className="min-h-11 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold disabled:opacity-50">Credit and amend the invoice</button>
                        <button className="min-h-11 px-4 rounded-lg border border-amber-400 text-amber-100 font-semibold" onClick={() => onNavigate('quotes', c.hunt_id)}>Open the quote</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {c.outcome && (
                <div className="space-y-2">
                  <input className={field} placeholder="Closing note (optional)" value={resNote} onChange={e => setResNote(e.target.value)} />
                  <button disabled={busy} onClick={() => call('case_resolve', { p_case: c.id, p_note: resNote || null }, 'Case closed')} className="min-h-12 px-5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50">Close this case</button>
                </div>
              )}
            </div>
          )}
          {changeQuote && <OrderChangeDialog quote={changeQuote.quote} clientType={changeQuote.type} who={client} caseInfo={{ id: c.id, docId: c.job_doc_id, species, reasons: c.reasons }} onClose={() => setChangeQuote(null)} onDone={() => { setChangeQuote(null); reload(); }} />}
          {c.status === 'resolved' && <p className="text-sm text-slate-400">Closed {fmt(c.resolved_at)} by {c.outcome_by_name}{c.resolution_note ? `: ${c.resolution_note}` : ''}</p>}
        </div>
      )}
    </div>
  );
}
