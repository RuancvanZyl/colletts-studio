/**
 * ClientCare — makes sure hunters are actually kept in the loop.
 *
 * Lists every client with live work, ranked by how badly they need to hear
 * from us, and lets staff send a progress update in one or two clicks.
 */

import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { useClientCare, type CareClient } from '../../../../lib/hooks/useClientCare';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, Mail, MessageCircle, Clock, AlertTriangle,
  CheckCircle2, X, Send, Users,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

const LEVEL_STYLE = {
  overdue: { chip: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',    dot: 'bg-red-500',    label: 'Needs contact' },
  due:     { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500', label: 'Update due' },
  ok:      { chip: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300', dot: 'bg-green-500', label: 'Up to date' },
} as const;

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/** A friendly default update the staff member can edit before sending. */
function draftUpdate(c: CareClient, workshop = 'Apex Trophy Solutions') {
  const first = c.name.split(' ')[0];
  const stage = c.latestDeptLabel ? ` Your trophies are currently in ${c.latestDeptLabel}.` : '';
  const count = c.activeTrophies === 1 ? 'your trophy' : `your ${c.activeTrophies} trophies`;
  return `Hi ${first},\n\nA quick update on ${count} with us.${stage}\n\nEverything is progressing well and we'll be in touch again as soon as the next stage is complete. If you have any questions in the meantime, just reply to this message.\n\nKind regards,\n${workshop}`;
}

export function ClientCare() {
  const { clients, loading, overdue, due, refresh } = useClientCare();
  const { profile } = useAuth();
  const [filter, setFilter]   = useState<'all' | 'overdue' | 'due'>('all');
  const [search, setSearch]   = useState('');
  const [compose, setCompose] = useState<CareClient | null>(null);
  const [body, setBody]       = useState('');
  const [sending, setSending] = useState(false);

  function openCompose(c: CareClient) {
    setCompose(c);
    setBody(draftUpdate(c));
  }

  async function sendUpdate() {
    if (!compose) return;
    setSending(true);

    const { data, error } = await (supabase as any)
      .from('client_messages')
      .insert({
        client_id: compose.clientId,
        direction: 'outbound',
        channel:   compose.email ? 'email' : 'in_app',
        subject:   'Progress update on your trophies',
        body,
        sent_by:   profile?.id ?? null,
        status:    'sent',
      })
      .select('id')
      .single();

    if (error) { toast.error(`Could not save the update: ${error.message}`); setSending(false); return; }

    // Best-effort email delivery — the update is recorded either way
    if (compose.email) {
      try {
        await (supabase as any).functions.invoke('send-client-email', {
          body: {
            to: compose.email,
            subject: 'Progress update on your trophies',
            body,
            message_id: data.id,
          },
        });
      } catch {
        toast.warning('Update saved, but the email could not be sent.');
      }
    }

    toast.success(`Update logged for ${compose.name}`);
    setCompose(null);
    setSending(false);
    refresh();
  }

  const visible = clients
    .filter(c => filter === 'all' || c.level === filter)
    .filter(c => !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.clientNumber?.toLowerCase().includes(search.toLowerCase()) ?? false));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Client Care</h2>
          <p className="text-sm text-slate-500">Who needs to hear from us, and how long it's been</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Need contact', value: overdue, color: 'text-red-600',   f: 'overdue' as const },
          { label: 'Update due',   value: due,     color: 'text-amber-600', f: 'due' as const },
          { label: 'All clients',  value: clients.length, color: 'text-slate-900 dark:text-slate-100', f: 'all' as const },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilter(s.f)}
            className={`p-3 rounded-xl border text-center transition-all ${
              filter === s.f
                ? 'border-[#0073ea] bg-blue-50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a] hover:border-slate-300'
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </button>
        ))}
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search hunter or client number…"
        className="max-w-md"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading client care…
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">
            {clients.length === 0
              ? 'No clients with active work right now'
              : 'Nobody in this group — everyone is up to date'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(c => {
            const style = LEVEL_STYLE[c.level];
            return (
              <div
                key={c.clientId}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a]"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#0073ea]/15 text-[#0073ea] flex items-center justify-center text-sm font-bold">
                    {initials(c.name)}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#1c2b3a] ${style.dot}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
                    {c.clientNumber && <span className="text-xs font-mono text-slate-400">{c.clientNumber}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.chip}`}>{style.label}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {c.unansweredInbound > 0 && <MessageCircle className="w-3.5 h-3.5 text-red-500" />}
                    {c.reason}
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    {c.activeTrophies} {c.activeTrophies === 1 ? 'trophy' : 'trophies'}
                    {c.latestDeptLabel && <> in {c.latestDeptLabel}</>}
                  </p>
                  {!c.email && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">No email on file — add one to send updates</p>
                  )}
                </div>

                <Button size="sm" onClick={() => openCompose(c)} className="gap-1.5 shrink-0">
                  <Send className="w-3.5 h-3.5" /> Send update
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose */}
      {compose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Update {compose.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  {compose.email
                    ? <><Mail className="w-3 h-3" /> {compose.email}</>
                    : <><Clock className="w-3 h-3" /> No email — this will be logged in their portal only</>}
                </p>
              </div>
              <button onClick={() => setCompose(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0073ea] resize-none"
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCompose(null)} className="flex-1">Cancel</Button>
              <Button onClick={sendUpdate} disabled={sending || !body.trim()} className="flex-1 gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Send update
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
