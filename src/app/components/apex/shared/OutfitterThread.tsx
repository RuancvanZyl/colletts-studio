/**
 * OutfitterThread — the conversation between an outfitter and the workshop about ONE hunt (so every hunter is a
 * separate conversation). Used by both sides; `side` says who is looking.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';

interface Msg { id: string; sender: 'outfitter' | 'workshop'; sender_name: string | null; body: string; created_at: string; requirement_id: string | null }

export function OutfitterThread({ huntId, side, canWrite = true, prefill = '', requirementId = null }: { huntId: string; side: 'outfitter' | 'workshop'; canWrite?: boolean; prefill?: string; requirementId?: string | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState(prefill);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from('outfitter_messages').select('id, sender, sender_name, body, created_at, requirement_id').eq('hunt_id', huntId).order('created_at');
    setMsgs(data ?? []); setLoading(false);
    await (supabase as any).rpc('mark_outfitter_thread_read', { p_hunt: huntId });
  }, [huntId]);
  useEffect(() => { load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('send_outfitter_message', { p_hunt: huntId, p_body: text, p_requirement: requirementId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setText(''); load();
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="max-h-[50vh] min-h-[160px] overflow-y-auto p-3 space-y-2">
        {loading && <div className="flex justify-center py-6 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>}
        {!loading && msgs.length === 0 && <p className="text-center text-sm text-slate-500 py-8">No messages yet. {canWrite ? 'Write the first one below.' : ''}</p>}
        {msgs.map(m => {
          const mine = m.sender === side;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-[#0073ea] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'}`}>
                {!mine && <p className="text-xs font-semibold opacity-80">{m.sender_name ?? (m.sender === 'workshop' ? 'Workshop' : 'Outfitter')}</p>}
                <p className="text-base whitespace-pre-wrap leading-snug">{m.body}</p>
                <p className={`text-[11px] mt-0.5 ${mine ? 'text-blue-100' : 'text-slate-500'}`}>{new Date(m.created_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {canWrite ? (
        <div className="border-t border-slate-200 dark:border-slate-700 p-2 flex items-end gap-2">
          <textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Write a message…" className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-3 py-2 text-base" />
          <button aria-label="Send" disabled={busy || !text.trim()} onClick={send} className="min-h-12 min-w-12 rounded-xl bg-[#0073ea] text-white flex items-center justify-center disabled:opacity-50">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
        </div>
      ) : <p className="border-t border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-500">Only managers can write to outfitters.</p>}
    </div>
  );
}
