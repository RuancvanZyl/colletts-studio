/**
 * Work in progress is kept on this device, so a refresh, an update of the app or a closed tab never throws it away.
 *   useDraft(name, initial)      like useState, but remembers the value (per person, for three days)
 *   useRememberedScreen(...)     remembers which screen the person was on (for twelve hours)
 * Things that cannot be stored (photos) are left out: the person simply adds them again.
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

const PREFIX = 'apex_draft:';
const DAY = 24 * 3600 * 1000;

type Saved<T> = { t: number; v: T };
function load<T>(key: string, maxAge: number): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const s = JSON.parse(raw) as Saved<T>;
    if (!s || typeof s.t !== 'number' || Date.now() - s.t > maxAge) { localStorage.removeItem(PREFIX + key); return undefined; }
    return s.v;
  } catch { return undefined; }
}
const dropFiles = (_k: string, x: unknown) => ((typeof File !== 'undefined' && x instanceof File) || (typeof Blob !== 'undefined' && x instanceof Blob) ? undefined : x);
function store<T>(key: string, v: T) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v }, dropFiles)); } catch { /* storage full or blocked: the work simply is not kept */ }
}
/** When the copy on this device was last saved (0 when there is none). */
function savedAt(key: string): number {
  try { const s = JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null'); return s && typeof s.t === 'number' ? s.t : 0; } catch { return 0; }
}
export function clearDraft(key: string) { try { localStorage.removeItem(PREFIX + key); } catch { /* nothing to clear */ } }

/** Forget everything kept for people on this device (used when someone signs out). */
export function clearAllDrafts() {
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch { /* fine */ }
}

/** A short stable key for a list of ids. */
export function hashKey(parts: string[]): string {
  let h = 0; const s = parts.join('|');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * serverClientId: for a hunter's work, also keep it on the server (table client_drafts) so the workshop can see what is still being filled in
 * and it survives a change of phone. Without migration 072 this quietly does nothing and the device copy still works.
 */
export function useDraft<T>(name: string, initial: T | (() => T), maxAgeMs = 3 * DAY, revive?: (saved: T) => T, serverClientId?: string | null): [T, Dispatch<SetStateAction<T>>, { clear: () => void; reset: () => void; restored: boolean }] {
  const { user } = useAuth();
  const key = `${user?.id ?? 'anon'}:${name}`;
  const first = useRef<{ v: T; restored: boolean } | null>(null);
  if (!first.current) {
    const saved = load<T>(key, maxAgeMs);
    first.current = saved !== undefined ? { v: revive ? revive(saved) : saved, restored: true } : { v: typeof initial === 'function' ? (initial as () => T)() : initial, restored: false };
  }
  const [value, setValueRaw] = useState<T>(first.current.v);
  const [restored, setRestored] = useState(first.current.restored);
  const touched = useRef(false);
  const latest = useRef(value); latest.current = value;
  const setValue: Dispatch<SetStateAction<T>> = useCallback(v => { touched.current = true; setValueRaw(v); }, []);

  useEffect(() => {
    if (!touched.current) return;
    const t = setTimeout(() => store(key, value), 300);
    return () => clearTimeout(t);
  }, [value, key]);
  // the last few keystrokes are kept even if the app is closed or reloaded a moment later
  useEffect(() => {
    const flush = () => { if (touched.current) store(key, latest.current); };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHide); };
  }, [key]);

  const sync = serverClientId ?? null;
  // a newer copy on the server (another phone, or this one after the browser was cleared) is picked up
  useEffect(() => {
    if (!sync) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await (supabase as any).from('client_drafts').select('data, updated_at').eq('client_id', sync).eq('name', name).maybeSingle();
        if (!alive || !data || touched.current) return;
        const t = Date.parse(data.updated_at);
        if (Date.now() - t > maxAgeMs || t <= savedAt(key) + 2000) return;
        setValueRaw(revive ? revive(data.data as T) : (data.data as T));
        setRestored(true); store(key, data.data);
      } catch { /* no connection or migration 072 not run: the device copy is used */ }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync, key]);
  // and every change is sent to the server a moment later
  useEffect(() => {
    if (!sync || !touched.current) return;
    const t = setTimeout(() => {
      (supabase as any).from('client_drafts').upsert({ client_id: sync, name, data: JSON.parse(JSON.stringify(value, dropFiles) ?? 'null'), updated_at: new Date().toISOString() }, { onConflict: 'client_id,name' }).then(() => undefined, () => undefined);
    }, 1500);
    return () => clearTimeout(t);
  }, [value, sync, name]);
  const dropServer = useCallback(() => { if (sync) (supabase as any).from('client_drafts').delete().eq('client_id', sync).eq('name', name).then(() => undefined, () => undefined); }, [sync, name]);

  const clear = useCallback(() => { touched.current = false; clearDraft(key); dropServer(); }, [key, dropServer]);
  const reset = useCallback(() => {
    touched.current = false; clearDraft(key); dropServer(); setRestored(false);
    setValueRaw(typeof initial === 'function' ? (initial as () => T)() : initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [value, setValue, { clear, reset, restored }];
}

/** Which screen a person was on, so a refresh brings them back to it. */
export function useRememberedScreen<V>(name: string, initial: V, valid: (v: unknown) => boolean = v => typeof v === 'string'): [V, Dispatch<SetStateAction<V>>] {
  const { user } = useAuth();
  const key = `${user?.id ?? 'anon'}:screen:${name}`;
  const [value, setValueRaw] = useState<V>(() => { const s = load<V>(key, 12 * 3600 * 1000); return s !== undefined && valid(s) ? s : initial; });
  const setValue: Dispatch<SetStateAction<V>> = useCallback(v => {
    setValueRaw(prev => { const next = typeof v === 'function' ? (v as (p: V) => V)(prev) : v; store(key, next); return next; });
  }, [key]);
  return [value, setValue];
}
export const hadRememberedScreen = (userId: string | undefined, name: string) => load(`${userId ?? 'anon'}:screen:${name}`, 12 * 3600 * 1000) !== undefined;
