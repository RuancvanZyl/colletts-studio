/**
 * Keeping everyone on the same version. A new version is applied automatically when it is safe (the app has just been opened,
 * or has been in the background for a while) and offered with a banner and a button otherwise, so nobody is stuck on an old copy.
 */
import { useEffect, useState } from 'react';

declare const __APP_VERSION__: string;
declare const __APP_BUILT__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ === 'undefined' ? 'dev' : __APP_VERSION__;
export const APP_BUILT: string = typeof __APP_BUILT__ === 'undefined' ? '' : __APP_BUILT__;

let apply: (() => void) | null = null;
let check: (() => Promise<void>) | null = null;
let waiting = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export function registerUpdater(fns: { apply: () => void; check: () => Promise<void> }) { apply = fns.apply; check = fns.check; }
export function markUpdateWaiting() { waiting = true; notify(); }
export const updateWaiting = () => waiting;
export function applyUpdate() { apply?.(); }
/** Look for a new version now. Resolves true when one is ready. */
export async function checkForUpdate(): Promise<boolean> {
  try { await check?.(); } catch { /* offline: nothing to check */ }
  await new Promise(r => setTimeout(r, 1500));   // give the new version a moment to arrive
  return waiting;
}

export function useUpdateWaiting() {
  const [, force] = useState(0);
  useEffect(() => { const l = () => force(n => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return waiting;
}
