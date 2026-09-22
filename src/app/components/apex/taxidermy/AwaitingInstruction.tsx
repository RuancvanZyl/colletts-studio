/**
 * AwaitingInstruction — every hunt where trophies have arrived but the
 * client hasn't yet said how to mount them ("WI" hunts). Flags anyone silent
 * 2+ weeks. Reminders are always drafted first and shown to staff — nothing
 * is emailed to a client without someone reviewing it and clicking Send.
 */

import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAwaitingInstruction, type AwaitingInstructionHunt } from '../../../../lib/hooks/useAwaitingInstruction';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, Mail, Clock, CheckCircle2, Send, Users, AlertTriangle, X, Eye,
} from 'lucide-react';
import { Button } from '../../ui/button';

function draftReminder(h: AwaitingInstructionHunt) {
  const firstName = h.clientName?.split(' ')[0] ?? 'there';
  return {
    subject: `Your trophies are ready — we need your mounting instructions (${h.refNumber})`,
    body:
`Hi ${firstName},

Your trophies (ref ${h.refNumber}) are ready and waiting at our workshop — we just need to hear from you on how you'd like each one mounted before we can begin.

If you could let us know your mounting preferences (shoulder, pedestal, full mount, euro, etc. for each trophy) whenever you have a moment, we'll get started right away.

Just reply to this email, or log into your hunter portal to let us know.

Kind regards,
Apex Trophy Solutions`,
  };
}

export function AwaitingInstruction() {
  const { hunts, loading, due, refresh } = useAwaitingInstruction();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  // Review-before-send state
  const [previewHunt, setPreviewHunt] = useState<AwaitingInstructionHunt | null>(null);
  const [previewBody, setPreviewBody] = useState('');
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);

  function openPreview(h: AwaitingInstructionHunt) {
    setPreviewHunt(h);
    setPreviewBody(draftReminder(h).body);
  }

  async function confirmSend(huntId: string) {
    setSendingId(huntId);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-instruction-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ hunt_id: huntId, custom_body: previewBody }),
    });
    const result = await res.json();
    setSendingId(null);
    if (!res.ok) { toast.error(result.error ?? 'Could not send reminder'); return; }
    toast.success('Reminder sent and logged');
    setPreviewHunt(null);
    refresh();
  }

  async function confirmSendAll() {
    setSendingAll(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-instruction-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({}),
    });
    const result = await res.json();
    setSendingAll(false);
    if (!res.ok) { toast.error(result.error ?? 'Could not send reminders'); return; }
    toast.success(`Sent ${result.processed} reminder${result.processed !== 1 ? 's' : ''}`);
    setBulkPreviewOpen(false);
    refresh();
  }

  async function markReceived(huntId: string) {
    const { error } = await (supabase as any).rpc('mark_instruction_received', { p_hunt_id: huntId });
    if (error) { toast.error(error.message); return; }
    toast.success('Marked as received — moved out of Awaiting Instruction');
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Awaiting Instruction</h2>
          <p className="text-sm text-slate-500">Trophies are in — waiting on the client to say how to mount them</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {due.length > 0 && (
            <Button onClick={() => setBulkPreviewOpen(true)} size="sm" className="gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Review & Send Due ({due.length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a] text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{hunts.length}</p>
          <p className="text-xs text-slate-500">Awaiting instruction</p>
        </div>
        <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-center">
          <p className="text-2xl font-bold text-amber-600">{due.length}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">Due a check-in (2+ weeks silent)</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : hunts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">Nobody is currently awaiting instruction</p>
        </div>
      ) : (
        <div className="space-y-2">
          {hunts.map(h => (
            <div
              key={h.huntId}
              className={`flex items-center gap-4 p-4 rounded-xl border ${
                h.reminderDue
                  ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a]'
              }`}
            >
              {h.reminderDue
                ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                : <Clock className="w-5 h-5 text-slate-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{h.clientName}</span>
                  <span className="text-xs font-mono text-slate-400">{h.refNumber}</span>
                  {h.reminderCount > 0 && (
                    <span className="text-xs text-slate-400">· reminded {h.reminderCount}×</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                  {h.clientEmail
                    ? <><Mail className="w-3 h-3" /> {h.clientEmail}</>
                    : <span className="text-amber-600 dark:text-amber-400">No email on file — can't email</span>}
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  {h.daysSinceLastContact} days since last contact
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openPreview(h)}
                  disabled={!h.clientEmail}
                  className="gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Review & Send
                </Button>
                <Button size="sm" onClick={() => markReceived(h.huntId)} className="gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Received
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single-client draft review — nothing sends until staff confirms here */}
      {previewHunt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Review before sending</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" /> To: {previewHunt.clientEmail}
                </p>
              </div>
              <button onClick={() => setPreviewHunt(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs font-semibold text-slate-500">Subject</p>
            <p className="text-sm text-slate-800 dark:text-slate-200 -mt-2">{draftReminder(previewHunt).subject}</p>
            <p className="text-xs font-semibold text-slate-500">Message</p>
            <textarea
              value={previewBody}
              onChange={e => setPreviewBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm resize-none"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPreviewHunt(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => confirmSend(previewHunt.huntId)} disabled={sendingId === previewHunt.huntId} className="flex-1 gap-2">
                {sendingId === previewHunt.huntId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk review — shows who is about to be emailed before anything sends */}
      {bulkPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                About to email {due.length} client{due.length !== 1 ? 's' : ''}
              </h3>
              <button onClick={() => setBulkPreviewOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500">
              Everyone below has been silent for 2+ weeks on mounting instructions. Each gets the same standard check-in message. Review the list, then confirm.
            </p>
            <div className="flex-1 overflow-y-auto space-y-1.5 border-t border-b border-slate-100 dark:border-slate-800 py-2">
              {due.map(h => (
                <div key={h.huntId} className="flex items-center justify-between text-sm py-1">
                  <span className="text-slate-800 dark:text-slate-200">{h.clientName}</span>
                  <span className="text-xs text-slate-400">{h.clientEmail}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setBulkPreviewOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={confirmSendAll} disabled={sendingAll} className="flex-1 gap-2">
                {sendingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Confirm & Send All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
