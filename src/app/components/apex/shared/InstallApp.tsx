/**
 * InstallApp — gets the app onto the phone's home screen. InstallCard is the full step-by-step; InstallBanner is the
 * small reminder shown at the top of each portal until the app is installed (or dismissed for two weeks).
 */
import { useState } from 'react';
import { Copy, Download, Share, SquarePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInstall } from '../../../../lib/install';

const DISMISS_KEY = 'apex_install_dismissed';
const dismissedRecently = () => { try { const t = +(localStorage.getItem(DISMISS_KEY) ?? 0); return Date.now() - t < 14 * 86_400_000; } catch { return false; } };

export function InstallCard({ onDone }: { onDone?: () => void }) {
  const { standalone, platform, canPrompt, prompt } = useInstall();
  if (standalone) return null;
  const step = (n: number, body: React.ReactNode) => (
    <li className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-sky-600 text-white text-sm font-bold flex items-center justify-center shrink-0">{n}</span><span className="pt-0.5">{body}</span></li>
  );
  async function go() { const r = await prompt(); if (r === 'accepted') { toast.success('Installed. Open the app from your home screen and sign in.'); onDone?.(); } }
  return (
    <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 dark:bg-sky-950/30 p-4 space-y-3 text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-3">
        <img src="/pwa-192x192.png" alt="" className="w-14 h-14 rounded-xl border border-slate-300" />
        <div><p className="font-bold text-lg leading-tight">Get the app on your phone</p><p className="text-sm text-slate-600 dark:text-slate-300">Opens full screen from its own icon, and works when the signal is poor.</p></div>
      </div>
      {platform === 'ios-safari' && (
        <ol className="space-y-2.5 text-base">
          {step(1, <>Tap the <strong>Share</strong> button <Share className="inline w-4 h-4 -mt-0.5" /> in Safari (the square with an arrow, at the bottom or top of the screen).</>)}
          {step(2, <>Scroll down and tap <strong>Add to Home Screen</strong> <SquarePlus className="inline w-4 h-4 -mt-0.5" />.</>)}
          {step(3, <>Tap <strong>Add</strong>. The Apex icon is now on your home screen.</>)}
        </ol>
      )}
      {platform === 'ios-other' && (
        <div className="space-y-2 text-base">
          <p>On an iPhone the app can only be added from <strong>Safari</strong>. Copy this page's address, open Safari, paste it and follow the steps there.</p>
          <button className="min-h-12 px-4 rounded-xl border border-slate-400 font-semibold flex items-center gap-2" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); toast.success('Address copied. Now open Safari and paste it.'); } catch { window.prompt('Copy this address:', window.location.href); } }}><Copy className="w-4 h-4" />Copy this page's address</button>
        </div>
      )}
      {(platform === 'android' || platform === 'desktop') && (canPrompt ? (
        <button className="w-full min-h-14 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-lg font-bold flex items-center justify-center gap-2" onClick={go}><Download className="w-5 h-5" />Install the app</button>
      ) : (
        <ol className="space-y-2.5 text-base">
          {step(1, platform === 'android' ? <>Tap the <strong>⋮ menu</strong> at the top right of Chrome.</> : <>Click the <strong>install icon</strong> at the right end of the address bar, or open the browser menu.</>)}
          {step(2, <>Choose <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</>)}
        </ol>
      ))}
      <p className="text-sm text-slate-600 dark:text-slate-300">After installing, open the app from your home screen and <strong>sign in with the same e-mail and password</strong>.</p>
    </div>
  );
}

export function InstallBanner() {
  const { standalone, platform, canPrompt } = useInstall();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(dismissedRecently());
  const mobile = platform !== 'desktop';
  if (standalone || hidden || (!mobile && !canPrompt)) return null;
  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* fine */ } setHidden(true); };
  return (
    <div className="mb-4 max-w-2xl mx-auto">
      {open ? (
        <div className="space-y-2"><InstallCard onDone={dismiss} /><button className="text-sm underline min-h-11 text-slate-500" onClick={() => setOpen(false)}>Close</button></div>
      ) : (
        <div className="rounded-xl border border-sky-400 bg-sky-50 dark:bg-sky-950/30 px-3 py-2 flex items-center gap-3 text-slate-900 dark:text-slate-100">
          <img src="/pwa-192x192.png" alt="" className="w-9 h-9 rounded-lg" />
          <p className="flex-1 text-sm font-semibold leading-tight">Install the app on your phone</p>
          <button className="min-h-10 px-3 rounded-lg bg-sky-600 text-white text-sm font-bold" onClick={() => setOpen(true)}>Install</button>
          <button className="min-h-10 min-w-10 flex items-center justify-center text-slate-500" onClick={dismiss} aria-label="Not now"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
