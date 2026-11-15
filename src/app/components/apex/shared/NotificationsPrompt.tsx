/** NotificationsPrompt — alerts switch themselves on.
 *  - Allowed before on this device: quietly signs the device up again every time the app opens (no screen).
 *  - Never asked yet: a small card asks once, with one big button. "Not now" hides it for a week.
 *  - Blocked, not possible, or keys not set up yet: shows nothing. (Adding to the Home Screen is handled by InstallApp.)
 *  Phones only allow alerts after the person taps a button once, so the one-time card is as automatic as it can be. */
import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { enablePush, pushConfigured, pushPossible } from '../../../../lib/push';

const SNOOZE_KEY = 'apex_alerts_not_now';
const WEEK = 7 * 24 * 60 * 60 * 1000;

function snoozed(): boolean {
  try { const t = Number(localStorage.getItem(SNOOZE_KEY) || 0); return Date.now() - t < WEEK; } catch { return false; }
}

export function NotificationsPrompt({ what = 'when there is a new message or news about your trophies' }: { what?: string }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushPossible() || !pushConfigured()) return;
    if (Notification.permission === 'granted') { enablePush(); return; } // keep this device signed up, silently
    if (Notification.permission === 'default' && !snoozed()) {
      const t = setTimeout(() => setShow(true), 1500); // let the screen load first
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  async function turnOn() {
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    setShow(false);
    if (r.ok) toast.success('Alerts are on for this device.');
    else toast.error(r.message ?? 'Could not turn alerts on.', { duration: 12000 });
  }

  function notNow() {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* shows again next time */ }
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div role="dialog" aria-label="Turn on alerts" className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-[rgba(58,174,204,0.35)] bg-[#0B1214] text-white shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[rgba(58,174,204,0.15)] flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-[#3AAECC]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Get alerts on this device?</p>
            <p className="text-sm text-[#9CC3CC] mt-0.5">We will let you know {what}. Your phone will ask you to allow it.</p>
          </div>
          <button onClick={notNow} aria-label="Not now" className="text-[#7AADB8] hover:text-white -mt-1 -mr-1 p-2"><X className="w-4 h-4" /></button>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={turnOn} disabled={busy} className="flex-1 min-h-12 rounded-xl bg-[#3AAECC] text-[#061012] font-bold disabled:opacity-60">
            {busy ? 'Turning on…' : 'Turn on alerts'}
          </button>
          <button onClick={notNow} className="min-h-12 px-4 rounded-xl border border-[rgba(58,174,204,0.35)] text-[#9CC3CC] font-semibold">Not now</button>
        </div>
      </div>
    </div>
  );
}
