/**
 * Outbox — the queue of worker actions waiting to reach the server.
 * Pure logic with an injected store so it can be tested without a browser.
 *
 *  - Every action is saved FIRST (with its real time), then sent. Nothing is lost if the connection drops.
 *  - Actions are replayed in the order they happened.
 *  - A network problem stops the replay and keeps everything for the next try.
 *  - A rejection by the server (e.g. "checklist incomplete", "job already moved on") is NOT retried forever:
 *    the action is flagged as a conflict for a manager to look at.
 */

export interface QueuedAction {
  id: string;                      // also sent to the server as the request id, so repeats are ignored
  type: string;
  args: Record<string, unknown>;
  doneAt: string;                  // when the worker really did it
  userId: string | null;
  createdAt: string;
  attempts: number;
  status: 'pending' | 'conflict';
  error?: string;
}

export interface OutboxStore {
  all(): Promise<QueuedAction[]>;
  put(a: QueuedAction): Promise<void>;
  remove(id: string): Promise<void>;
}

export type ExecResult = { ok: true } | { ok: false; retry: boolean; error: string };
export type Executor = (a: QueuedAction) => Promise<ExecResult>;

export interface OutboxState { pending: number; conflicts: number; syncing: boolean; lastSyncAt: string | null }

export class Outbox {
  private listeners = new Set<(s: OutboxState) => void>();
  private syncing = false;
  private lastSyncAt: string | null = null;

  private store: OutboxStore;
  private executors: Record<string, Executor>;
  private now: () => Date;
  private newId: () => string;

  constructor(
    store: OutboxStore,
    executors: Record<string, Executor>,
    now: () => Date = () => new Date(),
    newId: () => string = () => crypto.randomUUID(),
  ) {
    this.store = store; this.executors = executors; this.now = now; this.newId = newId;
  }

  async enqueue(type: string, args: Record<string, unknown>, userId: string | null, doneAt?: Date): Promise<QueuedAction> {
    const t = (doneAt ?? this.now()).toISOString();
    const a: QueuedAction = { id: this.newId(), type, args, doneAt: t, userId, createdAt: t, attempts: 0, status: 'pending' };
    await this.store.put(a);
    await this.emit();
    return a;
  }

  async state(): Promise<OutboxState> {
    const all = await this.store.all();
    return {
      pending: all.filter(a => a.status === 'pending').length,
      conflicts: all.filter(a => a.status === 'conflict').length,
      syncing: this.syncing,
      lastSyncAt: this.lastSyncAt,
    };
  }

  subscribe(fn: (s: OutboxState) => void): () => void {
    this.listeners.add(fn);
    this.state().then(fn);
    return () => { this.listeners.delete(fn); };
  }

  private async emit() { const s = await this.state(); this.listeners.forEach(l => l(s)); }

  /** Replay everything that is waiting. Safe to call at any time; overlapping calls are ignored. */
  async flush(): Promise<{ sent: number; conflicts: number; stoppedOffline: boolean }> {
    if (this.syncing) return { sent: 0, conflicts: 0, stoppedOffline: false };
    this.syncing = true; await this.emit();
    let sent = 0, conflicts = 0, stoppedOffline = false;
    try {
      const queue = (await this.store.all())
        .filter(a => a.status === 'pending')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (const a of queue) {
        const exec = this.executors[a.type];
        if (!exec) { await this.store.put({ ...a, status: 'conflict', error: `Unknown action type "${a.type}"` }); conflicts++; continue; }
        let res: ExecResult;
        try { res = await exec(a); }
        catch (e: any) { res = { ok: false, retry: true, error: String(e?.message ?? e) }; }
        if (res.ok) { await this.store.remove(a.id); sent++; continue; }
        if (res.retry) { await this.store.put({ ...a, attempts: a.attempts + 1, error: res.error }); stoppedOffline = true; break; }
        await this.store.put({ ...a, attempts: a.attempts + 1, status: 'conflict', error: res.error });
        conflicts++;
      }
      if (!stoppedOffline) this.lastSyncAt = this.now().toISOString();
    } finally {
      this.syncing = false; await this.emit();
    }
    return { sent, conflicts, stoppedOffline };
  }

  async listConflicts(): Promise<QueuedAction[]> { return (await this.store.all()).filter(a => a.status === 'conflict'); }
  async dismiss(id: string) { await this.store.remove(id); await this.emit(); }
  async retryConflict(id: string) {
    const a = (await this.store.all()).find(x => x.id === id);
    if (a) { await this.store.put({ ...a, status: 'pending', error: undefined }); await this.emit(); }
  }
}

export class MemoryStore implements OutboxStore {
  private m = new Map<string, QueuedAction>();
  async all() { return [...this.m.values()]; }
  async put(a: QueuedAction) { this.m.set(a.id, a); }
  async remove(id: string) { this.m.delete(id); }
}
