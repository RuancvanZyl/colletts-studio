import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Outbox, MemoryStore, type Executor } from '../src/lib/offline/outboxCore.ts';

let n = 0;
const mk = (executors: Record<string, Executor>, clock = { t: 0 }) =>
  new Outbox(new MemoryStore(), executors, () => new Date(Date.UTC(2026, 9, 20, 8, 0, clock.t++)), () => `id-${++n}`);

test('actions are saved with their real time and replayed in order', async () => {
  const seen: string[] = [];
  const ob = mk({ tick: async a => { seen.push(`${a.args.item}@${a.doneAt}`); return { ok: true }; } });
  await ob.enqueue('tick', { item: 'A' }, 'u1');
  await ob.enqueue('tick', { item: 'B' }, 'u1');
  const r = await ob.flush();
  assert.equal(r.sent, 2);
  assert.deepEqual(seen, ['A@2026-10-20T08:00:00.000Z', 'B@2026-10-20T08:00:01.000Z']);
  assert.equal((await ob.state()).pending, 0);
});

test('a network failure keeps everything and stops, then a later flush sends it', async () => {
  let online = false; const sent: string[] = [];
  const ob = mk({ tick: async a => online ? (sent.push(a.args.item as string), { ok: true as const }) : { ok: false as const, retry: true, error: 'Failed to fetch' } });
  await ob.enqueue('tick', { item: 'A' }, 'u1');
  await ob.enqueue('tick', { item: 'B' }, 'u1');
  const r1 = await ob.flush();
  assert.equal(r1.stoppedOffline, true); assert.equal(r1.sent, 0);
  assert.equal((await ob.state()).pending, 2);
  online = true;
  const r2 = await ob.flush();
  assert.equal(r2.sent, 2); assert.deepEqual(sent, ['A', 'B']);
});

test('a server rejection becomes a conflict and does not block the rest', async () => {
  const ob = mk({ tick: async a => a.args.item === 'bad' ? { ok: false as const, retry: false, error: 'Checklist incomplete' } : { ok: true as const } });
  await ob.enqueue('tick', { item: 'bad' }, 'u1');
  await ob.enqueue('tick', { item: 'good' }, 'u1');
  const r = await ob.flush();
  assert.equal(r.sent, 1); assert.equal(r.conflicts, 1);
  const c = await ob.listConflicts();
  assert.equal(c.length, 1); assert.equal(c[0].error, 'Checklist incomplete');
  assert.equal((await ob.state()).pending, 0);
});

test('an executor that throws is treated as offline (retried later)', async () => {
  const ob = mk({ tick: async () => { throw new Error('TypeError: Load failed'); } });
  await ob.enqueue('tick', {}, null);
  const r = await ob.flush();
  assert.equal(r.stoppedOffline, true); assert.equal((await ob.state()).pending, 1);
});

test('overlapping flushes do not send twice', async () => {
  let calls = 0; let release!: () => void; const gate = new Promise<void>(r => (release = r));
  const ob = mk({ tick: async () => { calls++; await gate; return { ok: true as const }; } });
  await ob.enqueue('tick', {}, null);
  const f1 = ob.flush(); const f2 = ob.flush();
  release(); await Promise.all([f1, f2]);
  assert.equal(calls, 1);
});

test('conflicts can be retried or dismissed', async () => {
  let fail = true;
  const ob = mk({ tick: async () => fail ? { ok: false as const, retry: false, error: 'nope' } : { ok: true as const } });
  const a = await ob.enqueue('tick', {}, null);
  await ob.flush(); assert.equal((await ob.state()).conflicts, 1);
  fail = false; await ob.retryConflict(a.id); await ob.flush();
  assert.equal((await ob.state()).conflicts, 0);
  const b = await ob.enqueue('tick', {}, null); fail = true; await ob.flush();
  await ob.dismiss(b.id); assert.equal((await ob.state()).conflicts, 0);
});

test('unknown action types are flagged, not lost silently', async () => {
  const ob = mk({});
  await ob.enqueue('mystery', {}, null); await ob.flush();
  assert.equal((await ob.listConflicts())[0].error?.includes('Unknown'), true);
});
