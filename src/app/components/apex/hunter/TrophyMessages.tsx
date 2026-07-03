import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useHunterClient } from '../../../../lib/hooks/useHunterClient';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Send, Loader2, MessageCircle, Sparkles, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  subject: string | null;
  sentAt: string;
  trophyTag: string | null;
  species: string | null;
}

interface Trophy {
  docId: string;
  tagNumber: string;
  species: string;
  mountType: string;
  currentDept: string;
}

const DEPT_LABELS: Record<string, string> = {
  receiving: 'Received', skinning: 'Skinning', salting: 'Salting',
  cleaning_bleach: 'Cleaning & Bleach', tannery: 'Tannery', dip_pack: 'Dip & Pack',
  mounting: 'Mounting', finishing: 'Finishing', quality_check: 'Quality Check',
  photos: 'Photos', packing: 'Packing', administration: 'Administration',
};

const QUESTION_STARTERS = [
  'How is my mount coming along?',
  'What can you do with my back skin / leftover hide?',
  'What does the process involve for this trophy?',
  'When will this trophy be ready?',
  'Can I see a progress photo?',
  'What are my options for this trophy?',
  'Can I change the mount style?',
];

export function TrophyMessages() {
  const { client } = useHunterClient();
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Trophy | null>(null);
  const [body, setBody]         = useState('');
  const [sending, setSending]   = useState(false);
  const [showStarters, setShowStarters] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!client?.id) return;
    setLoading(true);

    // Load this hunter's job cards
    const { data: hunts } = await (supabase as any)
      .from('client_hunts')
      .select('id')
      .eq('client_id', client.id);

    const huntIds = (hunts ?? []).map((h: any) => h.id);

    if (huntIds.length > 0) {
      const { data: docs } = await (supabase as any)
        .from('hunt_documents')
        .select('id, form_data, current_department, status')
        .in('hunt_id', huntIds)
        .eq('doc_type', 'job_card')
        .neq('status', 'pending_payment');

      setTrophies((docs ?? []).map((d: any) => ({
        docId:       d.id,
        tagNumber:   d.form_data?.tag_number ?? '—',
        species:     d.form_data?.species ?? '—',
        mountType:   d.form_data?.mount_type ?? '—',
        currentDept: d.current_department ?? '—',
      })));
    }

    // Load messages
    const { data: msgs } = await (supabase as any)
      .from('client_messages')
      .select('id, direction, body, subject, sent_at, form_data')
      .eq('client_id', client.id)
      .order('sent_at', { ascending: true });

    setMessages((msgs ?? []).map((m: any) => ({
      id:        m.id,
      direction: m.direction,
      body:      m.body,
      subject:   m.subject,
      sentAt:    m.sent_at,
      trophyTag: m.form_data?.trophy_tag ?? null,
      species:   m.form_data?.species ?? null,
    })));

    setLoading(false);
  }

  useEffect(() => { load(); }, [client?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  async function send() {
    if (!client?.id || !body.trim()) return;
    setSending(true);
    const formData = selected
      ? { trophy_tag: selected.tagNumber, species: selected.species }
      : undefined;
    const { error } = await (supabase as any)
      .from('client_messages')
      .insert({
        client_id: client.id,
        direction: 'inbound',
        channel:   'in_app',
        subject:   selected ? `Question about ${selected.species} (${selected.tagNumber})` : 'General question',
        body:      body.trim(),
        status:    'sent',
        form_data: formData,
      });
    setSending(false);
    if (error) { toast.error('Could not send message'); return; }
    setBody('');
    setShowStarters(false);
    await load();
  }

  // Separate upsell messages (outbound with Sparkles icon implied)
  const upsellMessages = messages.filter(m => m.direction === 'outbound');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ask the Workshop</h1>
        <p className="text-sm text-slate-500 mt-1">Ask questions about your mounts, request updates, or explore creative options</p>
      </div>

      {/* Back skin prompt — always shown if they have active trophies */}
      {trophies.length > 0 && (
        <div className="bg-gradient-to-br from-stone-50 to-amber-50 dark:from-stone-900/60 dark:to-amber-950/30 rounded-2xl border border-stone-200 dark:border-stone-700 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">What would you like done with your back skin?</p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                When your trophy is skinned, there is often usable back skin and leftover hide. We can put it to good use — just let us know what you'd prefer:
              </p>
              {([
                { heading: 'From the hide', options: ['Tan & return as flat skin', 'Biltong / dry-wors bag', 'Leather knife sheath', 'Leather hat band', 'Rug mount on felt', 'Hide cushion covers', 'Hide throw / blanket'] },
                { heading: 'Furniture & home', options: ['Hide-upholstered chair or stool', 'Horn coat hook rack', 'Horn lamp stand', 'Curtain tie-backs', 'Bookends'] },
                { heading: 'Creative & unique', options: ['Walking stick / cane', 'Wall art / bone sculpture', 'Custom gift box', 'Trophy room / lodge fit-out — I\'d love advice', 'Something else — I\'ll describe it in my message'] },
                { heading: 'No thanks', options: ['Dispose of the leftover hide'] },
              ] as const).map(group => (
                <div key={group.heading} className="mt-3">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">{group.heading}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.options.map(option => (
                      <button
                        key={option}
                        onClick={() => setBody(`Regarding the back skin / leftover hide from my trophy — I'd like: ${option}. Please let me know if you need anything else from me.`)}
                        className="text-left text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white/70 dark:bg-stone-800/50 text-stone-700 dark:text-stone-300 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upsell / workshop ideas banner */}
      {upsellMessages.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-lime-50 dark:from-amber-950/30 dark:to-lime-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Ideas from the Workshop</h2>
          </div>
          <div className="space-y-3">
            {upsellMessages.map(m => (
              <div key={m.id} className="bg-white/70 dark:bg-slate-800/50 rounded-xl p-3">
                {m.subject && (
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">{m.subject}</p>
                )}
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{m.body}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-slate-400">{new Date(m.sentAt).toLocaleDateString()}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                    onClick={() => { setBody('Yes, I\'m interested! Can you tell me more about this?'); }}
                  >
                    I'm interested!
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Messages */}
        <div className="max-h-96 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">No messages yet</p>
              <p className="text-slate-400 text-xs mt-1">Ask the workshop anything about your trophies</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                  msg.direction === 'inbound'
                    ? 'bg-green-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
                }`}>
                  {(msg.trophyTag || msg.species) && (
                    <div className={`flex items-center gap-1 mb-1 text-xs ${msg.direction === 'inbound' ? 'text-green-200' : 'text-slate-500'}`}>
                      <Tag className="w-3 h-3" />
                      {msg.trophyTag} {msg.species && `· ${msg.species}`}
                    </div>
                  )}
                  {msg.direction === 'outbound' && msg.subject && (
                    <p className="text-xs font-semibold text-slate-500 mb-1">{msg.subject}</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${msg.direction === 'inbound' ? 'text-green-200' : 'text-slate-400'}`}>
                    {new Date(msg.sentAt).toLocaleString()}
                    {msg.direction === 'inbound' && ' · You'}
                    {msg.direction === 'outbound' && ' · Apex Trophy Solutions'}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-3">
          {/* Trophy selector */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">About which trophy? (optional)</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelected(null)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  !selected
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                General
              </button>
              {trophies.map(t => (
                <button
                  key={t.docId}
                  onClick={() => setSelected(t)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    selected?.docId === t.docId
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {t.tagNumber} · {t.species}
                  <span className="ml-1 opacity-60 text-[10px]">{DEPT_LABELS[t.currentDept] ?? t.currentDept}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick starters */}
          <div>
            <button
              onClick={() => setShowStarters(v => !v)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showStarters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Quick questions
            </button>
            {showStarters && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUESTION_STARTERS.map(q => (
                  <button
                    key={q}
                    onClick={() => { setBody(q); setShowStarters(false); }}
                    className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-green-100 dark:hover:bg-green-950/40 hover:text-green-700 dark:hover:text-green-300 transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 items-end">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={selected ? `Ask about your ${selected.species}…` : 'Type your question…'}
              rows={2}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1e2b] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button
              size="sm"
              className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white h-10"
              onClick={send}
              disabled={sending || !body.trim()}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
