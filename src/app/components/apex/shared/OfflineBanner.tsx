/**
 * OfflineBanner — always tells the worker the truth about the connection:
 *  - "You are offline — work is being saved on this device"
 *  - "N actions waiting to send" / "All synced"
 *  - a list of anything the server refused (so a manager can look at it)
 */
import { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { outbox, startOutboxSync } from '../../../../lib/offline/outbox';
import '../../../../lib/offline/completeStage';   // registers the stage-completion replayer
import '../../../../lib/offline/photos';          // registers the photo-upload replayer
import type { OutboxState, QueuedAction } from '../../../../lib/offline/outboxCore';

const TITLES: Record<string, string> = { job_open: 'Opened a job card', job_start: 'Started a task', job_check: 'Ticked a checklist step', job_complete: 'Completed a stage' };

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [state, setState] = useState<OutboxState>({ pending: 0, conflicts: 0, syncing: false, lastSyncAt: null });
  const [showIssues, setShowIssues] = useState(false);
  const [issues, setIssues] = useState<QueuedAction[]>([]);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    startOutboxSync();
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    const unsub = outbox.subscribe(setState);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); unsub(); };
  }, []);

  useEffect(() => { if (showIssues) outbox.listConflicts().then(setIssues); }, [showIssues, state.conflicts]);

  // brief "all sent" confirmation — only when something that was waiting has just gone through
  const prevPending = useRef(0);
  useEffect(() => {
    const was = prevPending.current;
    prevPending.current = state.pending;
    if (online && was > 0 && state.pending === 0) { setJustSynced(true); const t = setTimeout(() => setJustSynced(false), 4000); return () => clearTimeout(t); }
  }, [state.pending, online]);

  if (online && state.pending === 0 && state.conflicts === 0 && !justSynced) return null;

  return (
    <div className="sticky top-0 z-40">
      {!online && (
        <div className="bg-amber-500 text-black px-4 py-2 text-sm font-semibold flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="flex-1">You are offline — keep working, everything is saved on this device and will send itself when the connection returns.{state.pending > 0 && ` (${state.pending} waiting)`}</span>
        </div>
      )}
      {online && state.pending > 0 && (
        <div className="bg-sky-600 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 shrink-0 ${state.syncing ? 'animate-spin' : ''}`} />
          <span className="flex-1">{state.syncing ? 'Sending' : 'Waiting to send'} {state.pending} saved action{state.pending !== 1 ? 's' : ''}…</span>
          <button onClick={() => outbox.flush()} className="underline text-xs">Send now</button>
        </div>
      )}
      {online && state.pending === 0 && justSynced && state.conflicts === 0 && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> All saved work has been sent.
        </div>
      )}
      {state.conflicts > 0 && (
        <div className="bg-red-700 text-white px-4 py-2 text-sm font-semibold">
          <button onClick={() => setShowIssues(v => !v)} className="flex items-center gap-2 w-full text-left">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{state.conflicts} saved action{state.conflicts !== 1 ? 's were' : ' was'} refused by the server — tap to see why</span>
          </button>
          {showIssues && (
            <ul className="mt-2 space-y-1.5 bg-red-900/60 rounded-lg p-2">
              {issues.map(a => (
                <li key={a.id} className="text-xs flex items-start gap-2">
                  <span className="flex-1">
                    <b>{TITLES[a.type] ?? a.type}</b> · {new Date(a.doneAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    <br /><span className="opacity-90">{a.error}</span>
                  </span>
                  <button onClick={() => outbox.retryConflict(a.id).then(() => outbox.flush())} className="underline shrink-0">Try again</button>
                  <button onClick={() => outbox.dismiss(a.id)} className="shrink-0" title="Dismiss" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
