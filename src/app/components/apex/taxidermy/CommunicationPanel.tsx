import { useState, useRef, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import {
  Mail, MessageSquare, Send, Loader2, ChevronDown,
  Plus, FileText, Clock, CheckCheck, Check, AlertCircle,
  Phone, Inbox, Paperclip, Reply,
} from 'lucide-react';
import { useClientMessages, type Message, type MessageTemplate } from '../../../../lib/hooks/useClientMessages';
import { toast } from 'sonner';

// ── Channel meta ─────────────────────────────────────────────────────────────
const CHANNEL_META = {
  email:    { icon: Mail,          label: 'Email',    color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
  in_app:   { icon: MessageSquare, label: 'In-App',   color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950/30' },
  whatsapp: { icon: Phone,         label: 'WhatsApp', color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  sms:      { icon: MessageSquare, label: 'SMS',      color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent:      <Check className="w-3 h-3 text-slate-400" />,
  delivered: <CheckCheck className="w-3 h-3 text-slate-400" />,
  read:      <CheckCheck className="w-3 h-3 text-blue-500" />,
  failed:    <AlertCircle className="w-3 h-3 text-red-500" />,
  draft:     <Clock className="w-3 h-3 text-amber-400" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  deposit:          'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  status_update:    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  completion:       'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  shipping:         'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  document_request: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  general:          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

// ── Compose modal ─────────────────────────────────────────────────────────────
function ComposeModal({
  clientId,
  clientName,
  clientEmail,
  templates,
  huntRef,
  replyTo,
  onSent,
  onClose,
}: {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  templates: MessageTemplate[];
  huntRef?: string;
  replyTo?: Message;
  onSent: () => void;
  onClose: () => void;
}) {
  const { sendMessage } = useClientMessages(clientId);
  const [channel, setChannel] = useState<'email' | 'in_app' | 'whatsapp' | 'sms'>(
    clientEmail ? 'email' : 'in_app'
  );
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject ?? ''}` : ''
  );
  const [body, setBody] = useState(replyTo ? '' : '');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const defaultVars: Record<string, string> = {
    client_name: clientName,
    ref_number:  huntRef ?? '',
    date_received: new Date().toLocaleDateString('en-ZA'),
  };

  function applyTemplate(t: MessageTemplate) {
    setSubject(fillTemplate(t.subject, defaultVars));
    setBody(fillTemplate(t.body, defaultVars));
    setTemplateOpen(false);
  }

  async function handleSend() {
    if (!body.trim()) { toast.error('Message body is required'); return; }
    if (channel === 'email' && !subject.trim()) { toast.error('Subject is required for email'); return; }
    setSending(true);
    const { error } = await sendMessage({
      subject: subject || undefined,
      body,
      channel,
      to_email: channel === 'email' ? (clientEmail ?? undefined) : undefined,
    });
    setSending(false);
    if (error) { toast.error(error); return; }
    toast.success('Message sent');
    onSent();
    onClose();
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {replyTo ? 'Reply' : 'New Message'} — {clientName}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-3">
        {/* Channel selector */}
        <div>
          <Label className="text-xs text-slate-500">Send via</Label>
          <div className="flex gap-2 mt-1">
            {(Object.entries(CHANNEL_META) as [Message['channel'], typeof CHANNEL_META.email][])
              .filter(([c]) => c !== 'whatsapp' && c !== 'sms' || c === channel)
              .map(([c, meta]) => {
                const Icon = meta.icon;
                const disabled = c === 'email' && !clientEmail;
                return (
                  <button
                    key={c}
                    disabled={disabled}
                    onClick={() => setChannel(c)}
                    title={disabled ? 'No email address on file' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      channel === c
                        ? 'border-[#0073ea] bg-[#0073ea] text-white'
                        : disabled
                          ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {meta.label}
                  </button>
                );
              })}
          </div>
          {channel === 'email' && clientEmail && (
            <p className="text-xs text-slate-400 mt-1">To: {clientEmail}</p>
          )}
        </div>

        {/* Template picker */}
        <div>
          <button
            onClick={() => setTemplateOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs text-[#0073ea] hover:underline"
          >
            <FileText className="w-3 h-3" />
            Use a message template
            <ChevronDown className={`w-3 h-3 transition-transform ${templateOpen ? 'rotate-180' : ''}`} />
          </button>
          {templateOpen && (
            <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left border-b border-slate-100 dark:border-slate-700 last:border-0"
                >
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[t.category]}`}>
                    {t.category.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject */}
        {(channel === 'email') && (
          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
        )}

        {/* Body */}
        <div>
          <Label className="text-xs">Message</Label>
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={12}
            className="mt-1 text-sm font-mono text-xs leading-relaxed"
            placeholder="Type your message here…"
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
        <Button onClick={handleSend} disabled={sending} size="sm" className="bg-[#0073ea] hover:bg-[#0060c0] text-white">
          {sending
            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            : <Send className="w-4 h-4 mr-2" />
          }
          Send {CHANNEL_META[channel].label}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg, clientName, onReply }: { msg: Message; clientName: string; onReply: (m: Message) => void }) {
  const [expanded, setExpanded] = useState(true);
  const isOut = msg.direction === 'outbound';
  const meta = CHANNEL_META[msg.channel];
  const Icon = meta.icon;

  const preview = msg.body.slice(0, 120) + (msg.body.length > 120 ? '…' : '');

  return (
    <div className={`flex gap-3 ${isOut ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${isOut ? 'bg-[#0073ea]' : 'bg-slate-500'}`}>
        {isOut ? (msg.staff as any)?.full_name?.charAt(0) ?? 'S' : clientName.charAt(0)}
      </div>

      <div className={`flex-1 max-w-[85%] ${isOut ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Header row */}
        <div className={`flex items-center gap-2 ${isOut ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isOut ? ((msg.staff as any)?.full_name ?? 'Staff') : clientName}
          </span>
          <span className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
            <Icon className="w-2.5 h-2.5" /> {meta.label}
          </span>
          <span className="text-[10px] text-slate-400">
            {new Date(msg.sent_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
            {' '}
            {new Date(msg.sent_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOut && STATUS_ICON[msg.status]}
        </div>

        {/* Subject */}
        {msg.subject && (
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">{msg.subject}</p>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm cursor-pointer ${
            isOut
              ? 'bg-[#0073ea] text-white rounded-tr-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm'
          }`}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.body}</pre>
          ) : (
            <p className="text-sm opacity-80">{preview}</p>
          )}
        </div>

        {/* Actions */}
        {!isOut && (
          <button
            onClick={() => onReply(msg)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#0073ea] transition-colors px-1"
          >
            <Reply className="w-3 h-3" /> Reply
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main panel export ─────────────────────────────────────────────────────────
export function CommunicationPanel({
  clientId,
  clientName,
  clientEmail,
  huntRef,
}: {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  huntRef?: string;
}) {
  const { messages, templates, loading, refresh } = useClientMessages(clientId);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | undefined>();
  const [filter, setFilter] = useState<'all' | 'email' | 'in_app'>('all');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const filtered = filter === 'all' ? messages : messages.filter(m => m.channel === filter);
  const unread = messages.filter(m => m.direction === 'inbound' && m.status !== 'read').length;

  function openReply(msg: Message) {
    setReplyTo(msg);
    setComposeOpen(true);
  }

  function openCompose() {
    setReplyTo(undefined);
    setComposeOpen(true);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Messages</p>
          {unread > 0 && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unread} new</span>
          )}
        </div>
        <Button size="sm" onClick={openCompose} className="h-7 text-xs bg-[#0073ea] hover:bg-[#0060c0] text-white">
          <Plus className="w-3 h-3 mr-1" /> New Message
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {(['all', 'email', 'in_app'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-[#0073ea] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'in_app' ? 'In-App' : 'Email'}
          </button>
        ))}
        {clientEmail && (
          <span className="ml-auto text-[10px] text-slate-400 self-center truncate max-w-[160px]">{clientEmail}</span>
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0" style={{ maxHeight: 420 }}>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-6 justify-center">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading messages…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
            <Inbox className="w-8 h-8" />
            <p className="text-sm">No messages yet</p>
            <Button size="sm" variant="outline" onClick={openCompose} className="text-xs">
              <Mail className="w-3 h-3 mr-1" /> Send first message
            </Button>
          </div>
        ) : (
          <>
            {/* Date-grouped messages */}
            {filtered.map((msg, i) => {
              const prev = filtered[i - 1];
              const showDate = !prev || new Date(msg.sent_at).toDateString() !== new Date(prev.sent_at).toDateString();
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-[10px] text-slate-400 font-medium px-2">
                        {new Date(msg.sent_at).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    </div>
                  )}
                  <MessageBubble msg={msg} clientName={clientName} onReply={openReply} />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Quick compose bar */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={openCompose}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-400 hover:border-[#0073ea] hover:text-[#0073ea] transition-colors text-left"
        >
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span>Write a message to {clientName}…</span>
        </button>
      </div>

      {/* Compose dialog */}
      <Dialog open={composeOpen} onOpenChange={(open: boolean) => { setComposeOpen(open); if (!open) setReplyTo(undefined); }}>
        <ComposeModal
          clientId={clientId}
          clientName={clientName}
          clientEmail={clientEmail}
          templates={templates}
          huntRef={huntRef}
          replyTo={replyTo}
          onSent={refresh}
          onClose={() => { setComposeOpen(false); setReplyTo(undefined); }}
        />
      </Dialog>
    </div>
  );
}
