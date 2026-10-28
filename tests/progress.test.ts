import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, milestoneMet, requiredIndex, type AnimalPos, type Milestone } from '../src/lib/progress.ts';

const SHOULDER = ['receiving', 'skinning', 'salting', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'];
const EURO = ['receiving', 'skinning', 'cleaning_bleach', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'];
const FLAT = ['receiving', 'skinning', 'salting', 'tannery', 'packing', 'administration'];
const at = (pipeline: string[], dept: string, done = false): AnimalPos => ({ pipeline, dept, done });

// Paid on 1 June 2026: the milestones fall 90, 150 and 270 days later (a medium order)
const start = '2026-06-01T08:00:00Z';
const ms: Milestone[] = [
  { key: 'm1', label: 'Milestone 1 — Skin & Skull Prep', due_date: '2026-08-30' },
  { key: 'm2', label: 'Milestone 2 — Tannery', due_date: '2026-10-29' },
  { key: 'm3', label: 'Milestone 3 — Completion', due_date: '2027-02-26' },
];
const on = (d: string) => new Date(d + 'T10:00:00Z');

test('M1 is met once a skin has left the preparation stages', () => {
  assert.equal(milestoneMet('m1', 'medium', at(SHOULDER, 'salting')), false);
  assert.equal(milestoneMet('m1', 'medium', at(SHOULDER, 'tannery')), true);
  assert.equal(milestoneMet('m1', 'medium', at(EURO, 'cleaning_bleach')), false);
  assert.equal(milestoneMet('m1', 'medium', at(EURO, 'mounting')), true);
});

test('M2 needs the skin back from the tannery; skull-only work has no tannery to wait for', () => {
  assert.equal(milestoneMet('m2', 'medium', at(SHOULDER, 'tannery')), false);
  assert.equal(milestoneMet('m2', 'medium', at(SHOULDER, 'mounting')), true);
  assert.equal(requiredIndex('m2', 'medium', EURO), requiredIndex('m1', 'medium', EURO));
});

test('M3 is "packed" for small and medium orders, "production complete" for large ones', () => {
  assert.equal(milestoneMet('m3', 'medium', at(SHOULDER, 'quality_check')), false);
  assert.equal(milestoneMet('m3', 'medium', at(SHOULDER, 'administration')), true);
  assert.equal(milestoneMet('m3', 'large', at(SHOULDER, 'photos')), true);
  assert.equal(milestoneMet('m3', 'large', at(SHOULDER, 'finishing')), false);
});

test('M4 needs the trophy dispatched, and a finished trophy meets everything', () => {
  assert.equal(milestoneMet('m4', 'large', at(SHOULDER, 'administration')), false);
  assert.equal(milestoneMet('m4', 'large', at(SHOULDER, 'done', true)), true);
  assert.equal(milestoneMet('m1', 'small', at(FLAT, 'done', true)), true);
});

test('no payment date means the clock has not started', () => {
  const a = assess({ size: 'medium', clockStart: null, milestones: null }, [at(SHOULDER, 'skinning')]);
  assert.equal(a.auto, 'no_clock');
});

test('on track early in the order', () => {
  const a = assess({ size: 'medium', clockStart: start, milestones: ms }, [at(SHOULDER, 'skinning'), at(SHOULDER, 'salting')], on('2026-07-01'));
  assert.equal(a.auto, 'on_track');
  assert.equal(a.day, 30);
  assert.equal(a.next?.key, 'm1');
  assert.equal(a.totalDays, 270);
});

test('due soon inside the last 14 days before a milestone', () => {
  const a = assess({ size: 'medium', clockStart: start, milestones: ms }, [at(SHOULDER, 'salting')], on('2026-08-20'));
  assert.equal(a.auto, 'due_soon');
});

test('behind once a milestone date passes with a trophy still in an earlier stage', () => {
  const animals = [at(SHOULDER, 'tannery'), at(SHOULDER, 'salting')];
  const a = assess({ size: 'medium', clockStart: start, milestones: ms }, animals, on('2026-09-15'));
  assert.equal(a.auto, 'behind');
  assert.deepEqual(a.overdue.map(o => o.key), ['m1']);
  assert.equal(a.animalBehind(animals[1]), true);
  assert.equal(a.animalBehind(animals[0]), false);
});

test('a milestone marked done by management counts even if the stages say otherwise', () => {
  const marked = ms.map(m => (m.key === 'm1' ? { ...m, completed: true } : m));
  const a = assess({ size: 'medium', clockStart: start, milestones: marked }, [at(SHOULDER, 'salting')], on('2026-09-15'));
  assert.equal(a.auto, 'on_track');
});

test('past the final deadline with work left is behind, and all milestones met is finished', () => {
  const late = assess({ size: 'medium', clockStart: start, milestones: ms, deadline: '2027-02-26' }, [at(SHOULDER, 'mounting')], on('2027-03-10'));
  assert.equal(late.auto, 'behind');
  const done = assess({ size: 'medium', clockStart: start, milestones: ms }, [at(SHOULDER, 'done', true)], on('2026-12-01'));
  assert.equal(done.auto, 'finished');
});
