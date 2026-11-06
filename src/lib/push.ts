/** Notifications on a phone or computer: turn on / off for this device, and tell the server about new team messages. */
import { supabase } from './supabase';

const KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushPossible = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const pushConfigured = () => !!KEY;

function keyBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export async function pushIsOn(): Promise<boolean> {
  try {
    if (!pushPossible() || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && await reg.pushManager.getSubscription());
  } catch { return false; }
}

export async function enablePush(): Promise<{ ok: boolean; message?: string }> {
  if (!pushPossible()) return { ok: false, message: 'This phone or browser cannot show notifications. On an iPhone, first add the app to your Home Screen (Share, then Add to Home Screen) and open it from there.' };
  if (!KEY) return { ok: false, message: 'Notifications are not switched on for the app yet. Please tell the office.' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, message: 'Notifications are blocked. Please allow them for Apex Trophy Solutions in your phone or browser settings, then try again.' };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) as any });
    const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    const { error } = await (supabase as any).rpc('save_push_subscription', {
      p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_agent: navigator.userAgent,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: 'Could not switch notifications on. Please try again.' };
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await (supabase as any).rpc('remove_push_subscription', { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
  } catch { /* nothing to switch off */ }
}

/** Trophies have arrived: tell the receiving team and the admins (condition report needed). Never blocks or fails the arrival. */
export async function tellAboutArrival(huntId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'arrival', hunt: huntId }),
    });
  } catch { /* the arrival itself is saved; the notification is only a nudge */ }
}

/** After a message is sent: ask the server to tell the other people's devices. Never blocks or fails the send. */
export async function tellOthersAboutNewMessages(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: '{}',
    });
  } catch { /* the message itself was saved; the notification is only a nudge */ }
}

/** A tapped notification asks for a screen (?open=messages). Remembered across sign-in, removed from the address bar, used once. */
const OPEN_KEY = 'apex_open';
try {
  const u = new URL(window.location.href);
  const v = u.searchParams.get('open');
  if (v) { sessionStorage.setItem(OPEN_KEY, v); u.searchParams.delete('open'); window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash); }
} catch { /* no storage: the notification still opens the app */ }
export function takeOpenRequest(): string | null {
  try { const v = sessionStorage.getItem(OPEN_KEY); if (v) sessionStorage.removeItem(OPEN_KEY); return v; } catch { return null; }
}
/** While the app is already open, a tapped notification arrives as a message from the service worker. */
export function onOpenRequest(fn: (view: string) => void): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};
  const h = (e: MessageEvent) => { if (e.data?.type === 'open' && typeof e.data.view === 'string') fn(e.data.view); };
  navigator.serviceWorker.addEventListener('message', h);
  return () => navigator.serviceWorker.removeEventListener('message', h);
}
