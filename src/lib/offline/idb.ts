/** Tiny IndexedDB layer: the outbox, a read cache and photo files, all kept on the device. Falls back to memory if the browser blocks storage. */
import { MemoryStore, type OutboxStore, type QueuedAction } from './outboxCore';

const DB_NAME = 'apex-offline';
const STORES = ['outbox', 'cache', 'blobs'] as const;
type StoreName = typeof STORES[number];

let dbPromise: Promise<IDBDatabase | null> | null = null;
function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return openDb().then(db => new Promise<T | undefined>(resolve => {
    if (!db) return resolve(undefined);
    try {
      const req = run(db.transaction(store, mode).objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch { resolve(undefined); }
  }));
}

/** Outbox storage — uses IndexedDB, or memory when storage is unavailable (then actions only survive until the tab closes). */
const memoryFallback = new MemoryStore();
export const idbOutboxStore: OutboxStore = {
  async all() {
    const db = await openDb();
    if (!db) return memoryFallback.all();
    return ((await tx<QueuedAction[]>('outbox', 'readonly', s => s.getAll())) ?? []) as QueuedAction[];
  },
  async put(a) {
    const db = await openDb();
    if (!db) return memoryFallback.put(a);
    await tx('outbox', 'readwrite', s => s.put(a));
  },
  async remove(id) {
    const db = await openDb();
    if (!db) return memoryFallback.remove(id);
    await tx('outbox', 'readwrite', s => s.delete(id));
  },
};

// ── Read cache: last good copy of what each screen loaded ─────────────────────
const memoryCache = new Map<string, unknown>();
export async function cacheSet(key: string, value: unknown) {
  memoryCache.set(key, value);
  await tx('cache', 'readwrite', s => s.put({ at: new Date().toISOString(), value }, key));
}
export async function cacheGet<T>(key: string): Promise<{ at: string; value: T } | null> {
  const hit = await tx<{ at: string; value: T }>('cache', 'readonly', s => s.get(key));
  if (hit) return hit;
  return memoryCache.has(key) ? { at: '', value: memoryCache.get(key) as T } : null;
}

// ── Photos waiting to upload ──────────────────────────────────────────────────
export async function blobPut(id: string, file: Blob) { await tx('blobs', 'readwrite', s => s.put(file, id)); }
export async function blobGet(id: string): Promise<Blob | undefined> { return tx<Blob>('blobs', 'readonly', s => s.get(id)); }
export async function blobDelete(id: string) { await tx('blobs', 'readwrite', s => s.delete(id)); }
