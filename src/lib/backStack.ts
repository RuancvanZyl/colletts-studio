/**
 * BackStack — one "Back" for the whole app. Every place the person can go deeper into (a client, a quote, a step of a form, a pop-up,
 * another menu tab) registers a level. The on-screen Back button, the phone's back gesture and the browser back button all close
 * the newest level first, then the one before it, until the home screen is reached.
 *
 * The browser history is kept in step: opening a level adds a history entry and closing it by hand removes it again, so the
 * phone's back button never throws the person out of the app while there is still somewhere to go back to.
 */
export interface HistoryLike {
  pushState(state: unknown, title: string): void;
  back(): void;
  readonly state: unknown;
}

/** 'view' = another screen of the portal; 'detail' = something opened on top of a screen (a client, a step, a pop-up) */
export type LevelKind = 'view' | 'detail';
interface Level { id: number; close: () => void; kind: LevelKind }

export class BackStack {
  private seq = 0;
  private levels: Level[] = [];
  private skip = 0;                       // history moves we caused ourselves: popstate must ignore them
  private listeners = new Set<() => void>();
  private h: HistoryLike;
  constructor(h: HistoryLike) { this.h = h; }

  get depth() { return this.levels.length; }
  /** how many levels of this kind are open */
  count(kind: LevelKind) { return this.levels.filter(l => l.kind === kind).length; }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(fn => fn()); }

  /** A new level is open. `close` puts the screen back as it was. */
  push(close: () => void, kind: LevelKind = 'detail'): number {
    const id = ++this.seq;
    this.levels.push({ id, close, kind });
    this.h.pushState({ apexBack: id }, '');
    this.emit();
    return id;
  }

  /** The screen closed itself (its own Back or Close button, or it was left). */
  remove(id: number) {
    const i = this.levels.findIndex(l => l.id === id);
    if (i < 0) return;
    this.levels.splice(i, 1);
    const onTop = i === this.levels.length;
    const st = this.h.state as { apexBack?: number } | null;
    if (onTop && st?.apexBack === id) { this.skip++; this.h.back(); }     // take its history entry away too
    this.emit();
  }

  /** The browser (or phone) went back one step. Returns true when it was ours. */
  onPop(): boolean {
    if (this.skip > 0) { this.skip--; return true; }
    const top = this.levels.pop();
    if (!top) return false;
    this.emit();
    top.close();
    return true;
  }

  /** The on-screen Back button. Returns false when there is nothing to go back to (the caller then goes home). */
  back(): boolean {
    if (this.levels.length === 0) return false;
    this.h.back();                      // the popstate that follows closes the newest level
    return true;
  }

  /** Forget everything without touching the history (the portal was left, for example by signing out). */
  clear() { this.levels = []; this.emit(); }
}
