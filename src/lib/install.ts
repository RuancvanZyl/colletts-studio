/**
 * Installing the app on a phone or computer. Chrome and Edge give us a one-tap install button; iPhones do not,
 * so there we show the two taps (Share, Add to Home Screen). The listener is registered at start-up so the browser's
 * install offer is not missed.
 */
import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let deferred: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as InstallEvent; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; installed = true; notify(); });
}

export type InstallPlatform = 'ios-safari' | 'ios-other' | 'android' | 'desktop';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as any).standalone === true;
}

export function installPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV/.test(ua) ? 'ios-safari' : 'ios-other';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const l = () => force(n => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return {
    standalone: isStandalone() || installed,
    platform: installPlatform(),
    canPrompt: !!deferred,
    async prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
      if (!deferred) return 'unavailable';
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null; notify();
      return outcome;
    },
  };
}
