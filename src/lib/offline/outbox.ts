/**
 * The app's single outbox. Worker actions go through here: saved on the device first, sent when possible.
 * See docs/OFFLINE_PLAN.md.
 */
import { supabase } from '../supabase';
import { Outbox, type Executor, type ExecResult, type QueuedAction } from './outboxCore';
import { idbOutboxStore, cacheGet, cacheSet } from './idb';

const NETWORK = /failed to fetch|networkerror|load failed|network request failed|timeout|timed out|fetch failed|offline|aborted/i;

/** Decide whether a failed call should be retried later (connection problem) or flagged (the server said no). */
export function classify(error: { message?: string; code?: string; status?: number } | null | undefined): ExecResult {
  if (!error) return { ok: true };
  const msg = error.message ?? 'Unknown error';
  const status = error.status ?? 0;
  if (NETWORK.test(msg) || status === 0 && !error.code || status >= 500 || status === 408 || status === 429) return { ok: false, retry: true, error: msg };
  if (/jwt|token|not authenticated|pgrst301/i.test(msg) || error.code === 'PGRST301') return { ok: false, retry: true, error: msg };
  return { ok: false, retry: false, error: msg };
}

const rpc = (fn: string, args: Record<string, unknown>) =>
  Promise.resolve((supabase as any).rpc(fn, args)).then(
    (r: any) => classify(r.error),
    (e: any) => classify({ message: String(e?.message ?? e) }),
  );

const executors: Record<string, Executor> = {
  job_open:  a => rpc('job_mark_opened',  { p_doc: a.args.doc, p_at: a.doneAt, p_request_id: a.id }),
  job_start: a => rpc('job_mark_started', { p_doc: a.args.doc, p_at: a.doneAt, p_request_id: a.id }),
  job_check: a => rpc('job_check_item',   { p_doc: a.args.doc, p_item: a.args.item, p_done: a.args.done, p_note: a.args.note ?? null, p_at: a.doneAt, p_request_id: a.id }),
};

export const outbox = new Outbox(idbOutboxStore, executors);

/**
 * Save the action, try to send it now.
 *  - sent            → { error: null, queued: false }
 *  - no connection   → { error: null, queued: true }   (it will go later; the screen shows it as done)
 *  - server said no  → { error: 'why', queued: false } (shown to the worker now)
 */
export async function performAction(type: string, args: Record<string, unknown>, userId: string | null): Promise<{ error: string | null; queued: boolean }> {
  const action = await outbox.enqueue(type, args, userId);
  const r = await outbox.flush();
  const conflict = (await outbox.listConflicts()).find(c => c.id === action.id);
  if (conflict) { await outbox.dismiss(conflict.id); return { error: conflict.error ?? 'Rejected', queued: false }; }
  return { error: null, queued: r.stoppedOffline };
}

/** Actions still waiting (for overlaying "done offline" ticks on a freshly loaded screen). */
export async function pendingActions(type?: string): Promise<QueuedAction[]> {
  const all = (await idbOutboxStore.all()).filter(a => a.status === 'pending');
  return type ? all.filter(a => a.type === type) : all;
}

/**
 * Load fresh data when online; fall back to the last saved copy when the connection is gone.
 * `stale` tells the screen it is showing a saved copy.
 */
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<{ data: T; stale: boolean; savedAt: string | null }> {
  try {
    const data = await fetcher();
    cacheSet(key, data);
    return { data, stale: false, savedAt: null };
  } catch (err) {
    const hit = await cacheGet<T>(key);
    if (hit) return { data: hit.value, stale: true, savedAt: hit.at || null };
    throw err;
  }
}

// ── Automatic replay ──────────────────────────────────────────────────────────
let started = false;
export function startOutboxSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const go = () => { outbox.flush().catch(() => {}); };
  window.addEventListener('online', go);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') go(); });
  setInterval(go, 60_000);
  go();
}
