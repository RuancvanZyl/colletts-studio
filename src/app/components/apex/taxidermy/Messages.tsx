/**
 * Messages — one place for communication inside the workshop and with clients.
 *  - Everyone can read what is addressed to them and confirm they have seen it.
 *  - Only department managers and admins can send.
 *  - Every message is kept for good, with who read it and when.
 *  - Admins also see the complete log (staff and client messages).
 */
import { useMemo, useState } from 'react';
import { Inbox, Send, PenSquare, ScrollText, CheckCircle2, Eye, AlertTriangle, Download, Loader2, RefreshCw, Lock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../../lib/auth';
import { ALL_DEPARTMENTS, DEPT_LABELS } from '../../../../lib/pipeline';
import { PRIORITY_META } from '../../../../lib/hooks/useTaskFlow';
import { useStaffMessages, useCommunicationLog, canCommunicate, isAdminRole, type StaffMessage } from '../../../../lib/hooks/useMessages';
import { Button } from '../../ui/button';

type Tab = 'inbox' | 'sent' | 'compose' | 'log';

const when = (iso: string) => new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function toLabel(m: StaffMessage, nameOf: (id: string | null) => string) {
  if (m.recipient_kind === 'everyone') return 'Everyone';
  if (m.recipient_kind === 'department') return `Department: ${DEPT_LABELS[m.recipient_dept ?? ''] ?? m.recipient_dept}`;
  return nameOf(m.recipient_user);
}

export function Messages({ initialTab }: { initialTab?: Tab }) {
  const { profile } = useAuth();
  const mayWrite = canCommunicate(profile);
  const admin = isAdminRole(profile?.role);
  const { messages, reads, people, inbox, sent, unread, myReads, loading, reload, markRead, send } = useStaffMessages();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'inbox');
  const [openId, setOpenId] = useState<string | null>(null);

  const nameOf = (id: string | null) => people.find(p => p.id === id)?.full_name ?? 'Staff member';
  const unreadAck = unread.filter(m => m.requires_ack).length;

  async function open(m: StaffMessage) {
    setOpenId(o => (o === m.id ? null : m.id));
    if (!myReads.has(m.id)) await markRead([m.id], false);
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#EDF6F9]">Messages</h1>
          <p className="text-sm text-[#7AADB8]">
            {mayWrite ? 'Send instructions to your team. Everything is recorded.' : 'Messages from your managers. Open a message to confirm you have seen it.'}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} disabled={loading} title="Refresh" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {unreadAck > 0 && (
        <div className="bg-red-950/50 border border-red-500/50 rounded-xl px-4 py-3 text-red-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {unreadAck} message{unreadAck !== 1 ? 's need' : ' needs'} your confirmation — open {unreadAck !== 1 ? 'them' : 'it'} and press “I have read this”.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          ['inbox', 'Inbox', Inbox, unread.length],
          ...(mayWrite ? [['compose', 'New message', PenSquare, 0], ['sent', 'Sent', Send, 0]] : []),
          ...(admin ? [['log', 'Everything (admin)', ScrollText, 0]] : []),
        ] as [Tab, string, any, number][]).map(([k, label, Icon, n]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              tab === k ? 'bg-[#3AAECC] text-[#080C0C] border-transparent' : 'bg-[#0F1A1C] text-[#7AADB8] border-[rgba(58,174,204,0.2)] hover:text-[#EDF6F9]'}`}>
            <Icon className="w-4 h-4" />{label}
            {n > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white">{n}</span>}
          </button>
        ))}
        {!mayWrite && (
          <span className="flex items-center gap-1.5 text-xs text-[#7AADB8]/70 ml-auto"><Lock className="w-3.5 h-3.5" />Only department managers and admins can send messages</span>
        )}
      </div>

      {/* ── Inbox ───────────────────────────────────────────────── */}
      {tab === 'inbox' && (
        loading ? <Spinner /> : inbox.length === 0 ? <Empty text="No messages yet." /> : (
          <ul className="space-y-2">
            {inbox.map(m => {
              const isRead = myReads.has(m.id);
              const myRead = reads.find(r => r.message_id === m.id && r.user_id === profile?.id);
              const isOpen = openId === m.id;
              return (
                <li key={m.id} className={`rounded-xl border overflow-hidden ${isRead ? 'bg-[#0F1A1C] border-[rgba(58,174,204,0.12)]' : 'bg-[#10222a] border-[#3AAECC]/50'}`}>
                  <button onClick={() => open(m)} className="w-full text-left px-4 py-3 flex items-start gap-3">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isRead ? 'bg-transparent' : 'bg-[#3AAECC]'}`} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm ${isRead ? 'text-[#EDF6F9]' : 'text-white font-bold'}`}>{m.subject || m.body.slice(0, 60)}</span>
                        {m.priority <= 2 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_META[m.priority].chip}`}>{PRIORITY_META[m.priority].label}</span>}
                        {m.requires_ack && !myRead?.acknowledged && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white">Please confirm</span>}
                      </span>
                      <span className="block text-xs text-[#7AADB8]">{m.sender_name ?? 'Manager'} · to {toLabel(m, nameOf)} · {when(m.sent_at)}</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pl-9 space-y-3">
                      <p className="text-sm text-[#EDF6F9] whitespace-pre-wrap">{m.body}</p>
                      {m.requires_ack && (myRead?.acknowledged
                        ? <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />You confirmed this on {when(myRead.read_at)}</p>
                        : <Button size="sm" onClick={() => markRead([m.id], true).then(() => toast.success('Thank you — your confirmation has been recorded'))} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />I have read this
                          </Button>)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}

      {/* ── Sent ────────────────────────────────────────────────── */}
      {tab === 'sent' && mayWrite && (
        loading ? <Spinner /> : sent.length === 0 ? <Empty text="You have not sent any messages yet." /> : (
          <ul className="space-y-2">
            {sent.map(m => {
              const seen = reads.filter(r => r.message_id === m.id);
              return (
                <li key={m.id} className="rounded-xl border bg-[#0F1A1C] border-[rgba(58,174,204,0.12)] px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#EDF6F9]">{m.subject || m.body.slice(0, 60)}</span>
                    {m.requires_ack && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-black">Confirmation requested</span>}
                  </div>
                  <p className="text-xs text-[#7AADB8]">To {toLabel(m, nameOf)} · {when(m.sent_at)}</p>
                  <p className="text-sm text-[#EDF6F9]/90 whitespace-pre-wrap">{m.body}</p>
                  <div className="text-xs text-[#7AADB8] flex items-start gap-1.5">
                    <Eye className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {seen.length === 0 ? 'Not read by anyone yet'
                      : <span>Read by {seen.map(r => `${nameOf(r.user_id)}${r.acknowledged ? ' ✓ confirmed' : ''} (${when(r.read_at)})`).join(', ')}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}

      {/* ── Compose ─────────────────────────────────────────────── */}
      {tab === 'compose' && mayWrite && (
        <Compose people={people} myId={profile?.id} admin={admin} myDepts={profile?.manages_departments ?? []}
          onSend={async m => {
            const r = await send(m);
            if (r.error) { toast.error(r.error); return false; }
            toast.success(r.queued ? 'Saved on this device — it will be sent when the connection returns' : 'Message sent and recorded');
            setTab('sent'); return true;
          }} />
      )}

      {/* ── Admin: everything ───────────────────────────────────── */}
      {tab === 'log' && admin && <CommunicationLog />}
    </div>
  );
}

function Spinner() { return <div className="flex items-center gap-2 text-[#7AADB8] py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>; }
function Empty({ text }: { text: string }) { return <div className="text-center py-14 text-[#7AADB8] bg-[#0F1A1C] rounded-xl border border-[rgba(58,174,204,0.12)]">{text}</div>; }

function Compose({ people, myId, admin, myDepts, onSend }: {
  people: { id: string; full_name: string; role: string; works_in: string[] }[];
  myId?: string; admin: boolean; myDepts: string[];
  onSend: (m: { kind: 'user' | 'department' | 'everyone'; user?: string; dept?: string; subject: string; body: string; priority: number; ack: boolean }) => Promise<boolean>;
}) {
  const [kind, setKind] = useState<'user' | 'department' | 'everyone'>('department');
  const [user, setUser] = useState('');
  const [dept, setDept] = useState(myDepts[0] ?? ALL_DEPARTMENTS[0]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState(3);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);

  const depts = admin ? ALL_DEPARTMENTS : myDepts;
  const recipients = people.filter(p => p.id !== myId && (admin || p.role === 'admin' || p.role === 'studio_manager' || p.works_in.some(d => myDepts.includes(d))));

  async function submit() {
    if (!body.trim()) { toast.error('Write your message first'); return; }
    if (kind === 'user' && !user) { toast.error('Choose who the message is for'); return; }
    setBusy(true);
    const ok = await onSend({ kind, user, dept, subject, body, priority, ack });
    setBusy(false);
    if (ok) { setSubject(''); setBody(''); setAck(false); setPriority(3); }
  }

  return (
    <div className="bg-[#0F1A1C] border border-[rgba(58,174,204,0.2)] rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {([['department', 'A department'], ['user', 'One person'], ...(admin ? [['everyone', 'Everyone']] : [])] as ['user' | 'department' | 'everyone', string][]).map(([k, label]) => (
          <button key={k} onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${kind === k ? 'bg-[#3AAECC] text-[#080C0C] border-transparent' : 'border-[rgba(58,174,204,0.25)] text-[#7AADB8]'}`}>{label}</button>
        ))}
      </div>
      {kind === 'department' && (
        <label className="block text-xs text-[#7AADB8]">Department
          <select value={dept} onChange={e => setDept(e.target.value)} className="mt-1 w-full rounded-lg border border-[rgba(58,174,204,0.25)] bg-[#142028] text-[#EDF6F9] px-3 py-2 text-sm">
            {depts.map(d => <option key={d} value={d}>{DEPT_LABELS[d] ?? d}</option>)}
          </select>
        </label>
      )}
      {kind === 'user' && (
        <label className="block text-xs text-[#7AADB8]">Person
          <select value={user} onChange={e => setUser(e.target.value)} className="mt-1 w-full rounded-lg border border-[rgba(58,174,204,0.25)] bg-[#142028] text-[#EDF6F9] px-3 py-2 text-sm">
            <option value="">Choose…</option>
            {recipients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </label>
      )}
      <label className="block text-xs text-[#7AADB8]">Subject (optional)
        <input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-[rgba(58,174,204,0.25)] bg-[#142028] text-[#EDF6F9] px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs text-[#7AADB8]">Message
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-[rgba(58,174,204,0.25)] bg-[#142028] text-[#EDF6F9] px-3 py-2 text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-xs text-[#7AADB8] flex items-center gap-2">Importance
          <select value={priority} onChange={e => setPriority(Number(e.target.value))} className="rounded-lg border border-[rgba(58,174,204,0.25)] bg-[#142028] text-[#EDF6F9] px-2 py-1.5 text-sm">
            {[1, 2, 3, 4].map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#7AADB8] flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} /> Ask them to confirm they have read it
        </label>
        <Button onClick={submit} disabled={busy} className="ml-auto bg-[#3AAECC] hover:bg-[#2E9EB8] text-[#080C0C] font-bold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1.5" />Send</>}
        </Button>
      </div>
      <p className="text-[11px] text-[#7AADB8]/70">Messages cannot be edited or deleted after they are sent. Admins can see every message.</p>
    </div>
  );
}

function CommunicationLog() {
  const { rows, loading, error, reload } = useCommunicationLog();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'' | 'staff' | 'client'>('');
  const [limit, setLimit] = useState(100);

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter(r => (!kind || r.kind === kind) &&
      (!n || [r.from_name, r.to_name, r.subject, r.body].some(x => (x ?? '').toLowerCase().includes(n))));
  }, [rows, q, kind]);

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['When', 'Type', 'From', 'To', 'Subject', 'Message', 'Read by'].map(esc).join(',')]
      .concat(visible.map(r => [new Date(r.sent_at).toISOString(), r.kind, r.from_name, r.to_name, r.subject, r.body, r.read_count].map(esc).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `apex-communication-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#7AADB8] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search names, subject, text…" className="text-xs pl-8 pr-3 py-2 w-64 rounded-lg border border-[rgba(58,174,204,0.25)] bg-[#142028] text-[#EDF6F9]" />
        </div>
        <select value={kind} onChange={e => setKind(e.target.value as any)} className="text-xs px-2 py-2 rounded-lg border border-[rgba(58,174,204,0.25)] bg-[#142028] text-[#EDF6F9]">
          <option value="">Staff and clients</option><option value="staff">Staff messages</option><option value="client">Client messages</option>
        </select>
        <span className="text-xs text-[#7AADB8]">{visible.length} message{visible.length !== 1 ? 's' : ''}</span>
        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
        <Button variant="ghost" size="icon" onClick={reload} title="Refresh" aria-label="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
      </div>
      {error && <p className="text-sm text-red-400">Could not load the log: {error} (has migration 043 been run?)</p>}
      {loading ? <Spinner /> : visible.length === 0 ? <Empty text="Nothing recorded yet." /> : (
        <ul className="rounded-xl border border-[rgba(58,174,204,0.15)] divide-y divide-[rgba(58,174,204,0.1)] bg-[#0F1A1C]">
          {visible.slice(0, limit).map(r => (
            <li key={`${r.kind}-${r.id}`} className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className={`font-bold px-1.5 py-0.5 rounded-full ${r.kind === 'client' ? 'bg-violet-600 text-white' : 'bg-sky-700 text-white'}`}>{r.kind === 'client' ? 'Client' : 'Staff'}</span>
                <span className="text-[#EDF6F9] font-semibold">{r.from_name ?? '—'}</span><span className="text-[#7AADB8]">→</span><span className="text-[#EDF6F9]">{r.to_name ?? '—'}</span>
                <span className="text-[#7AADB8] ml-auto">{when(r.sent_at)}</span>
              </div>
              {r.subject && <p className="text-sm font-semibold text-[#EDF6F9]">{r.subject}</p>}
              <p className="text-sm text-[#EDF6F9]/85 whitespace-pre-wrap line-clamp-4">{r.body}</p>
              <p className="text-[11px] text-[#7AADB8]">{r.read_count > 0 ? `Read${r.kind === 'staff' ? ` by ${r.read_count}` : ''}` : 'Not read yet'}</p>
            </li>
          ))}
        </ul>
      )}
      {visible.length > limit && <button onClick={() => setLimit(l => l + 200)} className="w-full py-2 text-xs font-semibold text-[#3AAECC]">Show more ({visible.length - limit} left)</button>}
    </div>
  );
}
