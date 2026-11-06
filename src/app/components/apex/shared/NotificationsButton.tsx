/** NotificationsButton — turn notifications on or off for this phone or computer. */
import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { disablePush, enablePush, pushIsOn, pushPossible } from '../../../../lib/push';

export function NotificationsButton({ className = '' }: { className?: string }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushIsOn().then(setOn); }, []);
  if (!pushPossible()) return null;

  async function toggle() {
    setBusy(true);
    if (on) {
      await disablePush(); setOn(false);
      toast.success('Notifications are off on this device.');
    } else {
      const r = await enablePush();
      if (r.ok) { setOn(true); toast.success('Notifications are on. You will be told when a message arrives.'); }
      else toast.error(r.message ?? 'Could not switch notifications on.', { duration: 12000 });
    }
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy} className={`inline-flex items-center gap-1.5 text-xs font-semibold underline min-h-9 ${className}`}>
      {on ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
      {on ? 'Turn notifications off' : 'Turn on notifications'}
    </button>
  );
}
