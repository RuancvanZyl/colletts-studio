/**
 * back — the one Back for the whole app (see backStack.ts for how it works).
 *
 *   useBack(open, close)        a screen that can be gone into (a client, a quote, a step, a pop-up) registers while it is open
 *   useViewLevels(...)          a portal that switches between screens: each switch can be undone with Back
 *   <BackButton />              the on-screen Back button: shown everywhere except the home screen
 *   goBack(fallback)            what the button does
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BackStack } from './backStack';

const stack = new BackStack(window.history);
let installed = false;

/** Call once at start-up: the phone's back gesture and the browser's back button then close the newest level. */
export function installBack() {
  if (installed) return;
  installed = true;
  window.addEventListener('popstate', () => { stack.onPop(); });
}

export const pushBackLevel = (close: () => void) => stack.push(close, 'view');
export const clearBack = () => stack.clear();
export const goBack = (fallback?: () => void) => { if (!stack.back()) fallback?.(); };

export function useBackDepth(): number {
  return useSyncExternalStore(fn => stack.subscribe(fn), () => stack.depth, () => 0);
}
/** How many things are open on top of the current screen (a client, a step of a form, a pop-up). */
function useDetailDepth(): number {
  return useSyncExternalStore(fn => stack.subscribe(fn), () => stack.count('detail'), () => 0);
}

/** While `active` is true, Back closes this screen (by calling `close`). */
export function useBack(active: boolean, close: () => void) {
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    if (!active) return;
    const id = stack.push(() => latest.current(), 'detail');
    return () => stack.remove(id);
  }, [active]);
}

/**
 * For a portal that shows one screen at a time: returns a `go(next)` that switches screen and remembers the one it left,
 * so Back brings it back. Switching to the screen already shown does nothing.
 */
export function useViewLevels<T>(current: T, set: (v: T) => void, same: (a: T, b: T) => boolean = (a, b) => a === b) {
  return (next: T) => {
    if (same(current, next)) return;
    const before = current;
    pushBackLevel(() => set(before));
    set(next);
  };
}

/** "← Back". Hidden on the home screen. `home` is where Back goes when there is nothing earlier to go back to. */
export function BackButton({ atHome, home, className = '' }: { atHome: boolean; home: () => void; className?: string }) {
  const open = useDetailDepth();
  if (atHome && open === 0) return null;          // the home screen, with nothing opened on top of it
  return (
    <button onClick={() => goBack(home)} className={`inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg font-semibold ${className}`} aria-label="Back" title="Back">
      <ArrowLeft className="w-5 h-5" /><span>Back</span>
    </button>
  );
}
