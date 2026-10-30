/**
 * OutfitterThread — the conversation between an outfitter and the workshop about ONE hunt (so every hunter is a
 * separate conversation). Used by both sides; `side` says who is looking.
 *
 * Every message is saved under a topic (general, documents, rejected skin, quote and payment, a trophy), the heading says who
 * the conversation is about, and the topics can be filtered. Talking on WhatsApp or the phone is only a nudge ("there is a message
 * in the app") or is written down here afterwards, so the record stays in one place.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { WORKSHOP } from '../../../../lib/workshop';
import { TOPICS, TOPIC_LABEL, whatsappLink } from '../../../../lib/threadTopics';

interface Msg { id: string; sender: 'outfitter' | 'workshop'; sender_name: string | null; body: string; created_at: string; requirement_id: string | null; channel?: string; case_id?: string | null; topic?: string; job?: { form_data?: { species?: string; tag_number?: string } } | null }
interface HuntInfo { ref: string | null; client: string; outfitter: string; phone: string | null; contact: string | null }

const fld = 'rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-3 min-h-11 text-base';

export function OutfitterThread({ huntId, side, canWrite = true, prefill = '', requirementId = null, caseId = null, topic = null, docId = null }: {
  huntId: string; side: 'outfitter' | 'workshop'; canWrite?: boolean; prefill?: string; requirementId?: string | null; caseId?: string | null;
  /** the topic new messages are saved under (and the topic that is shown first) */
  topic?: string | null;
  /** the trophy a new message is about */
  docId?: string | null;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState(prefill);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<HuntInfo | null>(null);
  const [filter, setFilter] = useState<string>(topic && !caseId ? topic : 'all');
  const [sendTopic, setSendTopic] = useState<string>(topic ?? (requirementId ? 'documents' : 'general'));
  const [wa, setWa] = useState({ from: 'outfitter', channel: 'phone', text: '' });
  const bottom = useRef<HTMLDivElement>(null);
  const hasTopics = useRef(true);

  useEffect(() => {
    (async () => {
      const { data: h } = await (supabase as any).from('client_hunts').select('ref_number, clients(full_name), outfitters(name, phone, contact_name)').eq('id', huntId).maybeSingle();
      if (h) setInfo({ ref: h.ref_number ?? null, client: h.clients?.full_name ?? 'the hunter', outfitter: h.outfitters?.name ?? 'the outfitter', phone: h.outfitters?.phone ?? null, contact: h.outfitters?.contact_name ?? null });
    })();
  }, [huntId]);

  const load = useCallback(async () => {
    const build = (cols: string) => {
      let query = (supabase as any).from('outfitter_messages').select(cols).eq('hunt_id', huntId);
      if (caseId) query = query.eq('case_id', caseId);
      return query.order('created_at');
    };
    let { data, error } = await build('id, sender, sender_name, body, created_at, requirement_id, channel, case_id, topic, job:hunt_documents(form_data)');
    if (error) { hasTopics.current = false; ({ data } = await build('id, sender, sender_name, body, created_at, requirement_id, channel, case_id')); }
    setMsgs(data ?? []); setLoading(false);
    await (supabase as any).rpc('mark_outfitter_thread_read', { p_hunt: huntId });
  }, [huntId, caseId]);
  useEffect(() => { load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, filter]);

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    const args: Record<string, unknown> = { p_hunt: huntId, p_body: text, p_requirement: requirementId, p_case: caseId };
    let { error } = await (supabase as any).rpc('send_outfitter_message', { ...args, p_topic: caseId ? 'rejected_skin' : sendTopic, p_doc: docId });
    // the workshop has not switched on topics yet: send it the way it always worked
    if (error && /could not find the function|schema cache/i.test(error.message)) ({ error } = await (supabase as any).rpc('send_outfitter_message', args));
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setText(''); load();
  }

  async function writeDown() {
    if (!wa.text.trim() || busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('log_outfitter_conversation', { p_hunt: huntId, p_from: wa.from, p_channel: wa.channel, p_body: wa.text, p_topic: sendTopic, p_doc: docId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Written into the conversation'); setWa(p => ({ ...p, text: '' })); load();
  }

  const shown = filter === 'all' || caseId ? msgs : msgs.filter(m => (m.topic ?? 'general') === filter);
  const counts: Record<string, number> = {};
  for (const m of msgs) counts[m.topic ?? 'general'] = (counts[m.topic ?? 'general'] ?? 0) + 1;
  const first = (info?.contact ?? info?.outfitter ?? '').split(' ')[0];
  // the WhatsApp message only points at the app; the conversation itself lives here
  const nudge = side === 'workshop'
    ? whatsappLink(info?.phone, `Hi ${first}, there is a new message about ${info?.client ?? 'a hunter'} in the Apex app. Please open the app to read it and reply: ${WORKSHOP.portalUrl}`)
    : whatsappLink(WORKSHOP.whatsapp, `Hi, I have written a message about ${info?.client ?? 'a hunter'}${info?.ref ? ` (${info.ref})` : ''} in the Apex app. Please open it and reply.`);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {info && (
        <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <p className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">{side === 'workshop' ? info.outfitter : 'The workshop'} about {info.client}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">{info.ref ? `${info.ref} · ` : ''}Everything said here is saved against this hunter.</p>
        </div>
      )}
      {!caseId && hasTopics.current && msgs.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto px-2 py-2 border-b border-slate-200 dark:border-slate-700">
          {[{ key: 'all', label: 'Everything' }, ...TOPICS].filter(t => t.key === 'all' || counts[t.key]).map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} className={`shrink-0 min-h-10 px-3 rounded-full border-2 text-sm font-semibold ${filter === t.key ? 'border-[#0073ea] bg-[#0073ea] text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{t.label}{t.key !== 'all' ? ` · ${counts[t.key]}` : ''}</button>
          ))}
        </div>
      )}
      <div className="max-h-[50vh] min-h-[160px] overflow-y-auto p-3 space-y-2">
        {loading && <div className="flex justify-center py-6 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>}
        {!loading && shown.length === 0 && <p className="text-center text-sm text-slate-500 py-8">No messages yet. {canWrite ? 'Write the first one below.' : ''}</p>}
        {shown.map(m => {
          const mine = m.sender === side;
          const tag = filter === 'all' && m.topic && m.topic !== 'general' ? TOPIC_LABEL[m.topic] : null;
          const animal = m.job?.form_data?.species ? `${m.job.form_data.species}${m.job.form_data.tag_number ? ` #${m.job.form_data.tag_number}` : ''}` : null;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-[#0073ea] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'}`}>
                {(!mine || m.channel === 'whatsapp' || m.channel === 'phone') && <p className="text-xs font-semibold opacity-80">{m.sender_name ?? (m.sender === 'workshop' ? 'Workshop' : 'Outfitter')}{m.channel === 'whatsapp' && !/WhatsApp/.test(m.sender_name ?? '') ? ' · WhatsApp' : ''}</p>}
                {(tag || animal) && <p className={`text-[11px] font-bold uppercase tracking-wide ${mine ? 'text-blue-100' : 'text-slate-500'}`}>{[tag, animal].filter(Boolean).join(' · ')}</p>}
                <p className="text-base whitespace-pre-wrap leading-snug">{m.body}</p>
                <p className={`text-[11px] mt-0.5 ${mine ? 'text-blue-100' : 'text-slate-500'}`}>{new Date(m.created_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {canWrite ? (
        <div className="border-t border-slate-200 dark:border-slate-700 p-2 space-y-2">
          {!caseId && !requirementId && hasTopics.current && (
            <label className="block text-sm text-slate-600 dark:text-slate-300">This message is about
              <select className={`${fld} !min-h-10 w-full mt-1`} value={sendTopic} onChange={e => setSendTopic(e.target.value)}>{TOPICS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
            </label>
          )}
          <div className="flex items-end gap-2">
            <textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Write a message…" className={`flex-1 py-2 ${fld}`} />
            <button aria-label="Send" disabled={busy || !text.trim()} onClick={send} className="min-h-12 min-w-12 rounded-xl bg-[#0073ea] text-white flex items-center justify-center disabled:opacity-50">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
          </div>
        </div>
      ) : <p className="border-t border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-500">Only managers can write to outfitters.</p>}

      {(nudge || (side === 'workshop' && canWrite && !caseId)) && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2 space-y-2 bg-slate-50 dark:bg-slate-800/40">
          {nudge && <a href={nudge} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 min-h-10 text-sm font-semibold text-slate-700 dark:text-slate-200 underline"><MessageCircle className="w-4 h-4 text-green-600" />{side === 'workshop' ? 'Not seen it? Nudge them on WhatsApp' : 'Not getting a reply? Nudge the office on WhatsApp'}</a>}
          {side === 'workshop' && canWrite && !caseId && (
            <details>
              <summary className="cursor-pointer min-h-10 flex items-center text-sm font-semibold text-slate-700 dark:text-slate-200">Spoke on WhatsApp or the phone? Write down what was said</summary>
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <select className={fld} value={wa.from} onChange={e => setWa(p => ({ ...p, from: e.target.value }))}><option value="outfitter">The outfitter said</option><option value="workshop">We said</option></select>
                  <select className={fld} value={wa.channel} onChange={e => setWa(p => ({ ...p, channel: e.target.value }))}><option value="phone">On the phone</option><option value="whatsapp">On WhatsApp</option></select>
                </div>
                <textarea rows={2} className={`w-full py-2 ${fld}`} value={wa.text} onChange={e => setWa(p => ({ ...p, text: e.target.value }))} placeholder="Type or paste what was said" />
                <button disabled={busy || !wa.text.trim()} className="min-h-11 px-4 rounded-lg bg-[#0073ea] text-white font-semibold disabled:opacity-50" onClick={writeDown}>Add to the conversation</button>
                <p className="text-xs text-slate-500">It is saved under the topic chosen above ({TOPIC_LABEL[sendTopic] ?? 'General'}).</p>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
