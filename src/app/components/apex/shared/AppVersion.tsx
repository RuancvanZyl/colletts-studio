/** AppVersion — which version of the app this is, a button to look for a newer one, and a banner when one is waiting. */
import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { APP_BUILT, APP_VERSION, applyUpdate, checkForUpdate, useUpdateWaiting } from '../../../../lib/appUpdate';

const built = () => APP_BUILT ? new Date(APP_BUILT).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export function AppVersion({ className = '' }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const waiting = useUpdateWaiting();
  async function look() {
    if (waiting) { applyUpdate(); return; }
    setBusy(true);
    const found = await checkForUpdate();
    setBusy(false);
    if (found) applyUpdate(); else toast.success('You have the latest version');
  }
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <p className="flex-1 min-w-0 text-[10px] opacity-70 truncate">Version {APP_VERSION}{built() ? ` · ${built()}` : ''}</p>
      <button onClick={look} disabled={busy} className={`text-[10px] font-semibold underline min-h-7 ${waiting ? 'text-amber-300' : ''}`}>{busy ? <Loader2 className="w-3 h-3 animate-spin inline" /> : waiting ? 'Update now' : 'Check for updates'}</button>
    </div>
  );
}

export function UpdateBanner() {
  const waiting = useUpdateWaiting();
  if (!waiting) return null;
  return (
    <div className="mb-4 max-w-2xl mx-auto rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex items-center gap-3 text-slate-900 dark:text-slate-100">
      <RefreshCw className="w-5 h-5 shrink-0 text-amber-600" />
      <p className="flex-1 text-sm font-semibold leading-tight">A new version of the app is ready. Update to see the latest changes.</p>
      <button className="min-h-11 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold" onClick={() => applyUpdate()}>Update now</button>
    </div>
  );
}
