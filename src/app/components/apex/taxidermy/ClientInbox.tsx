import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { RefreshCw, MessageCircle, Send, Loader2, Sparkles, ChevronRight, Tag, Plus, Trash2, BookMarked } from 'lucide-react';

interface Message {
  id: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  huntId: string | null;
  direction: 'inbound' | 'outbound';
  subject: string | null;
  body: string;
  sentAt: string;
  readAt: string | null;
  trophyTag: string | null;
  species: string | null;
}

interface Thread {
  clientId: string;
  clientName: string;
  clientNumber: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  messages: Message[];
}

const UPSELL_IDEAS = [
  // Back skin
  { category: 'Hide & Leather', label: 'Back Skin / Leftover Hide', body: 'Hi! We wanted to check in about the back skin and any leftover hide from your trophy. We have a few great options:\n\n• Tan & return the full back skin\n• Biltong or dry-wors bag\n• Hand-stitched leather knife sheath\n• Leather hat band\n• Full rug mount on felt\n\nIf we don\'t hear from you, the leftover skin will unfortunately go to waste — so please let us know what you\'d prefer. Happy to quote on any of these!' },
  { category: 'Hide & Leather', label: 'Leather Hat Band', body: 'We can craft a beautiful leather hat band from the hide of your trophy — a unique keepsake that keeps your hunting memory close every day. Interested?' },
  { category: 'Hide & Leather', label: 'Knife Sheath', body: 'Your trophy\'s hide can be made into a hand-stitched knife sheath — perfect for your hunting knife and a great conversation piece. Shall we include that in your order?' },
  { category: 'Hide & Leather', label: 'Biltong / Dry-Wors Bag', body: 'We can make a traditional biltong or dry-wors bag from your trophy\'s hide — a practical, beautiful reminder of your hunt. Would you like to add one?' },
  { category: 'Hide & Leather', label: 'Flat Skin / Rug Mount', body: 'The hide from this trophy could be tanned and finished as a flat skin or rug mount — a classic, elegant display piece. Would you like a quote?' },
  // Mounts
  { category: 'Mount Upgrades', label: 'Euro / Skull Upgrade', body: 'Your trophy\'s skull could be cleaned and mounted as a Euro skull — a striking, natural display that shows off the bone structure beautifully. Would you like to upgrade?' },
  { category: 'Mount Upgrades', label: 'Pedestal Base', body: 'We can add a hand-carved hardwood pedestal base to your shoulder mount, turning it into a stunning floor-standing statement piece. Interested in upgrading?' },
  { category: 'Mount Upgrades', label: 'Full Body / Lifesize Mount', body: 'Have you considered a full body lifesize mount of this animal? It creates an incredible display piece that shows the animal in its natural pose. We\'d love to discuss options with you.' },
  { category: 'Mount Upgrades', label: 'Dip & Pack for Overseas', body: 'If you\'re planning to have your trophy mounted overseas, we offer a full dip & pack service — properly treated and crated for international shipping. Would that suit your plans?' },
  // Furniture & Home
  { category: 'Furniture & Home', label: 'Hide-Upholstered Chair / Stool', body: 'Did you know we can upholster a chair, bar stool, or ottoman with the tanned hide from your trophy? It becomes a truly one-of-a-kind piece of furniture with an incredible story behind it. Would you like to explore this?' },
  { category: 'Furniture & Home', label: 'Horn Coat Hooks / Rack', body: 'The horns or antlers from your trophy can be mounted as a beautiful coat hook rack or key holder — a stunning, functional piece for your home or lodge. Interested?' },
  { category: 'Furniture & Home', label: 'Horn Lamp Stand', body: 'We can craft a unique lamp stand or floor lamp base using the horns from your trophy — a real statement piece for any room. Would you like a quote?' },
  { category: 'Furniture & Home', label: 'Hide Cushion Covers', body: 'The tanned hide from your trophy can be made into beautiful cushion covers — rustic, tactile, and completely unique. Would you like a set for your home or hunting lodge?' },
  { category: 'Furniture & Home', label: 'Hide Throw / Blanket', body: 'A tanned and softened full-skin throw is a luxurious addition to any couch or bed — especially meaningful when it comes from your own hunt. Would you like us to prepare one?' },
  { category: 'Furniture & Home', label: 'Curtain Tie-Backs', body: 'Horn or bone pieces from your trophy can be turned into elegant curtain tie-backs — a subtle, beautiful way to bring the bush into your home. Interested?' },
  // Creative & Unique
  { category: 'Creative & Unique', label: 'Walking Stick / Cane', body: 'We can craft a hand-turned walking stick or cane featuring horn, bone, or hide from your trophy — a timeless, personal keepsake. Would you like one made?' },
  { category: 'Creative & Unique', label: 'Bookends', body: 'Horn or skull pieces make incredible bookends — substantial, unique, and always a conversation starter. Would you like a pair for your study or office?' },
  { category: 'Creative & Unique', label: 'Wall Art / Bone Sculpture', body: 'We work with artists who can create one-of-a-kind wall art or bone sculptures using material from your trophy. It\'s an incredible way to display your hunt as fine art. Interested in exploring this?' },
  { category: 'Creative & Unique', label: 'Trophy Room / Lodge Fit-Out', body: 'If you\'re planning or updating a trophy room or hunting lodge, we can advise on displays, lighting, and complementary pieces that make the most of your collection. We\'d love to be part of that project — shall we chat?' },
  { category: 'Creative & Unique', label: 'Custom Gift Box', body: 'We can put together a beautiful gift box for a fellow hunter — featuring a leather item, biltong bag, or small keepsake made from African game hide. Perfect for a birthday, Christmas, or "thank you" gift. Interested?' },
];

interface CustomTemplate { id: string; name: string; body: string }

export function ClientInbox() {
  const { profile } = useAuth();
  const [threads, setThreads]             = useState<Thread[]>([]);
  const [active, setActive]               = useState<Thread | null>(null);
  const [reply, setReply]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [loading, setLoading]             = useState(true);
  const [showUpsell, setShowUpsell]       = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [newName, setNewName]             = useState('');
  const [newBody, setNewBody]             = useState('');
  const [addingNew, setAddingNew]         = useState(false);
  const [savingNew, setSavingNew]         = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadTemplates() {
    const { data } = await (supabase as any)
      .from('message_templates')
      .select('id, name, body')
      .eq('category', 'upsell')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    setCustomTemplates(data ?? []);
  }

  async function saveTemplate() {
    if (!newName.trim() || !newBody.trim()) return;
    setSavingNew(true);
    await (supabase as any).from('message_templates').insert({
      name: newName.trim(),
      category: 'upsell',
      subject: newName.trim(),
      body: newBody.trim(),
      is_active: true,
    });
    setSavingNew(false);
    setNewName('');
    setNewBody('');
    setAddingNew(false);
    loadTemplates();
  }

  async function deleteTemplate(id: string) {
    await (supabase as any).from('message_templates').update({ is_active: false }).eq('id', id);
    loadTemplates();
  }

  async function load() {
    setLoading(true);

    const { data: msgs } = await (supabase as any)
      .from('client_messages')
      .select('id, client_id, hunt_id, direction, subject, body, sent_at, read_at, form_data')
      .order('sent_at', { ascending: true });

    if (!msgs) { setLoading(false); return; }

    // Pull client info
    const clientIds = [...new Set(msgs.map((m: any) => m.client_id))];
    const { data: clients } = await (supabase as any)
      .from('clients')
      .select('id, full_name, client_number')
      .in('id', clientIds);

    const clientMap: Record<string, { full_name: string; client_number: string }> = {};
    for (const c of clients ?? []) clientMap[c.id] = c;

    // Group into threads per client
    const threadMap: Record<string, Thread> = {};
    for (const m of msgs) {
      const cid = m.client_id;
      const cl = clientMap[cid] ?? {};
      if (!threadMap[cid]) {
        threadMap[cid] = {
          clientId: cid,
          clientName: cl.full_name ?? '—',
          clientNumber: cl.client_number ?? '',
          lastMessage: '',
          lastAt: '',
          unread: 0,
          messages: [],
        };
      }
      const msg: Message = {
        id: m.id,
        clientId: cid,
        clientName: cl.full_name ?? '—',
        clientNumber: cl.client_number ?? '',
        huntId: m.hunt_id,
        direction: m.direction,
        subject: m.subject,
        body: m.body,
        sentAt: m.sent_at,
        readAt: m.read_at,
        trophyTag: m.form_data?.trophy_tag ?? null,
        species: m.form_data?.species ?? null,
      };
      threadMap[cid].messages.push(msg);
      if (m.direction === 'inbound' && !m.read_at) threadMap[cid].unread++;
      threadMap[cid].lastMessage = m.body.slice(0, 80);
      threadMap[cid].lastAt = m.sent_at;
    }

    const sorted = Object.values(threadMap).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
    setThreads(sorted);

    // Keep active thread in sync
    if (active) {
      const updated = sorted.find(t => t.clientId === active.clientId);
      if (updated) setActive(updated);
    }

    setLoading(false);
  }

  useEffect(() => { load(); loadTemplates(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages.length]);

  async function markRead(thread: Thread) {
    const unreadIds = thread.messages
      .filter(m => m.direction === 'inbound' && !m.readAt)
      .map(m => m.id);
    if (unreadIds.length === 0) return;
    await (supabase as any)
      .from('client_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds);
  }

  async function openThread(thread: Thread) {
    setActive(thread);
    setShowUpsell(false);
    await markRead(thread);
    await load();
  }

  async function sendReply() {
    if (!active || !reply.trim()) return;
    setSending(true);
    const { error } = await (supabase as any)
      .from('client_messages')
      .insert({
        client_id: active.clientId,
        direction: 'outbound',
        channel: 'in_app',
        body: reply.trim(),
        sent_by: profile?.id ?? null,
        status: 'sent',
      });
    setSending(false);
    if (error) { toast.error('Failed to send'); return; }
    setReply('');
    setShowUpsell(false);
    await load();
  }

  function insertUpsell(idea: typeof UPSELL_IDEAS[0]) {
    setReply(idea.body);
    setShowUpsell(false);
  }

  const isOwner = profile?.role === 'admin' || profile?.role === 'studio_manager';
  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1e2b]">

      {/* Thread list */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Client Messages</span>
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">{totalUnread}</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No messages yet</p>
            </div>
          ) : (
            threads.map(t => (
              <button
                key={t.clientId}
                onClick={() => openThread(t)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                  active?.clientId === t.clientId ? 'bg-green-50 dark:bg-green-950/30 border-l-2 border-l-green-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{t.clientName}</span>
                  {t.unread > 0 && (
                    <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0 ml-2 flex-shrink-0">{t.unread}</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{t.lastMessage}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(t.lastAt).toLocaleDateString()}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation panel */}
      {!active ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Select a conversation</p>
          <p className="text-slate-400 text-sm mt-1">Reply to client questions and send upsell ideas</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conversation header */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center text-sm font-bold text-green-700 dark:text-green-300 flex-shrink-0">
              {active.clientName[0]}
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{active.clientName}</p>
              {active.clientNumber && <p className="text-xs text-slate-500">{active.clientNumber}</p>}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {active.messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.direction === 'outbound'
                    ? 'bg-green-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
                }`}>
                  {(msg.trophyTag || msg.species) && (
                    <div className={`flex items-center gap-1.5 mb-1.5 text-xs ${msg.direction === 'outbound' ? 'text-green-200' : 'text-slate-500'}`}>
                      <Tag className="w-3 h-3" />
                      {msg.trophyTag && <span>{msg.trophyTag}</span>}
                      {msg.species && <span>· {msg.species}</span>}
                    </div>
                  )}
                  {msg.subject && (
                    <p className={`text-xs font-semibold mb-1 ${msg.direction === 'outbound' ? 'text-green-200' : 'text-slate-500'}`}>
                      {msg.subject}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-green-200' : 'text-slate-400'}`}>
                    {new Date(msg.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Upsell picker — authorised staff only */}
          {isOwner && showUpsell && (
            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 max-h-72 overflow-y-auto space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 bg-slate-50 dark:bg-slate-900/60 py-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Upsell Ideas — click to insert
              </p>

              {/* Built-in ideas by category */}
              {(['Hide & Leather', 'Mount Upgrades', 'Furniture & Home', 'Creative & Unique'] as const).map(cat => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{cat}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {UPSELL_IDEAS.filter(i => i.category === cat).map(idea => (
                      <button
                        key={idea.label}
                        onClick={() => insertUpsell(idea)}
                        className="text-left text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors flex items-center gap-1.5"
                      >
                        <ChevronRight className="w-3 h-3 text-green-500 flex-shrink-0" />
                        {idea.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Custom / saved templates */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookMarked className="w-3 h-3" />
                    Your Ideas
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => setAddingNew(v => !v)}
                      className="text-[10px] text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />Add idea
                    </button>
                  )}
                </div>

                {/* Add new form — owner only */}
                {isOwner && addingNew && (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-2 space-y-2">
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Idea name (e.g. Bone chess set)"
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <textarea
                      value={newBody}
                      onChange={e => setNewBody(e.target.value)}
                      placeholder="Write the message you'll send to the client…"
                      rows={3}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setAddingNew(false); setNewName(''); setNewBody(''); }} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Cancel</button>
                      <button
                        onClick={saveTemplate}
                        disabled={savingNew || !newName.trim() || !newBody.trim()}
                        className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg flex items-center gap-1"
                      >
                        {savingNew ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookMarked className="w-3 h-3" />}
                        Save idea
                      </button>
                    </div>
                  </div>
                )}

                {/* Saved templates list */}
                {customTemplates.length === 0 && !addingNew ? (
                  <p className="text-xs text-slate-400 italic">None saved yet — add your first idea above</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {customTemplates.map(t => (
                      <div key={t.id} className="flex items-center gap-1.5 group">
                        <button
                          onClick={() => insertUpsell({ label: t.name, body: t.body })}
                          className="flex-1 text-left text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors flex items-center gap-1.5"
                        >
                          <ChevronRight className="w-3 h-3 text-green-500 flex-shrink-0" />
                          {t.name}
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => deleteTemplate(t.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reply bar — authorised staff only */}
          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex gap-2 items-end">
          {!isOwner && (
            <div className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-400 text-center">
              Only Admin, Manager, and the Studio Owner can reply to clients
            </div>
          )}
          {isOwner && (<>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpsell(v => !v)}
              className={`flex-shrink-0 ${showUpsell ? 'border-amber-400 text-amber-600' : ''}`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Upsell
            </Button>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1e2b] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button
              size="sm"
              className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white"
              onClick={sendReply}
              disabled={sending || !reply.trim()}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </>)}
          </div>
        </div>
      )}
    </div>
  );
}
