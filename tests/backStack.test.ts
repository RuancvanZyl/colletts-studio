import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BackStack, type HistoryLike } from '../src/lib/backStack.ts';

/** A tiny browser history: entries, a position, and a popstate that fires after back() */
function fake() {
  const entries: unknown[] = [null];
  let pos = 0;
  const pops: (() => void)[] = [];
  const h: HistoryLike = {
    pushState(s) { entries.length = pos + 1; entries.push(s); pos++; },
    back() { if (pos > 0) { pos--; queue.push(true); } },
    get state() { return entries[pos]; },
  };
  const queue: boolean[] = [];
  const flush = (stack: BackStack) => { while (queue.length) { queue.shift(); stack.onPop(); } };
  return { h, flush, get pos() { return pos; }, pops };
}

test('Back closes the newest level first, then the one before it', () => {
  const f = fake(); const s = new BackStack(f.h); const closed: string[] = [];
  s.push(() => closed.push('client')); s.push(() => closed.push('quote'));
  assert.equal(s.depth, 2);
  assert.equal(s.back(), true); f.flush(s);
  assert.deepEqual(closed, ['quote']);
  assert.equal(s.back(), true); f.flush(s);
  assert.deepEqual(closed, ['quote', 'client']);
  assert.equal(s.depth, 0);
  assert.equal(s.back(), false);              // nothing left: the caller goes home
});

test('a screen that closes itself takes its history entry away, so the phone back button does not need an extra press', () => {
  const f = fake(); const s = new BackStack(f.h);
  const id = s.push(() => {});
  assert.equal(f.pos, 1);
  s.remove(id); f.flush(s);
  assert.equal(f.pos, 0);
  assert.equal(s.depth, 0);
});

test('closing a level by hand does not close another level when the history catches up', () => {
  const f = fake(); const s = new BackStack(f.h); const closed: string[] = [];
  s.push(() => closed.push('a')); const b = s.push(() => closed.push('b'));
  s.remove(b); f.flush(s);
  assert.deepEqual(closed, []);               // b closed itself; a is still open
  assert.equal(s.depth, 1);
});

test('the phone back button closes the newest level', () => {
  const f = fake(); const s = new BackStack(f.h); const closed: string[] = [];
  s.push(() => closed.push('a'));
  f.h.back(); f.flush(s);                      // a back gesture
  assert.deepEqual(closed, ['a']);
});

test('leaving the portal (sign out) forgets the levels without moving the history', () => {
  const f = fake(); const s = new BackStack(f.h);
  const a = s.push(() => {}); s.push(() => {});
  s.clear(); s.remove(a); f.flush(s);
  assert.equal(s.depth, 0);
  assert.equal(f.pos, 2);
});

test('removing a level that is not the newest leaves the history alone', () => {
  const f = fake(); const s = new BackStack(f.h);
  const a = s.push(() => {}); s.push(() => {});
  s.remove(a); f.flush(s);
  assert.equal(s.depth, 1);
  assert.equal(f.pos, 2);
});
