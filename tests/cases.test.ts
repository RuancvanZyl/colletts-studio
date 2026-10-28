import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_INFORM_DAYS, informDaysLeft } from '../src/lib/cases.ts';

const set = '2026-10-01T08:00:00Z';
test('the outfitter has three weeks to tell the client', () => {
  assert.equal(CLIENT_INFORM_DAYS, 21);
  assert.equal(informDaysLeft({ outcome: 'client_decision', outcome_at: set }, new Date('2026-10-02T08:00:00Z')), 20);
  assert.equal(informDaysLeft({ outcome: 'client_decision', outcome_at: set }, new Date('2026-10-22T09:00:00Z')), 0);
});
test('after three weeks the workshop must tell the client', () => {
  assert.ok((informDaysLeft({ outcome: 'client_decision', outcome_at: set }, new Date('2026-10-25T08:00:00Z')) ?? 0) < 0);
});
test('nothing is counted once the client has been told, or for the other outcomes', () => {
  assert.equal(informDaysLeft({ outcome: 'client_decision', outcome_at: set, client_informed_at: '2026-10-03T00:00:00Z' }), null);
  assert.equal(informDaysLeft({ outcome: 'outfitter_replacement', outcome_at: set }), null);
});
