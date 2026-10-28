import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conditionOk, conditionSummary } from '../src/lib/condition.ts';

test('only Fresh or Salted is required; everything else is optional', () => {
  assert.equal(conditionOk({ condition: '' }), false);
  assert.equal(conditionOk({ condition: 'fresh' }), true);
  assert.equal(conditionOk({ condition: 'salted' }), true);
});

test('the one-line summary only mentions what was recorded', () => {
  assert.equal(conditionSummary({ state: 'fresh', issues: [] }), 'Fresh');
  assert.equal(conditionSummary({ state: 'salted', salt: 'dirty', issues: ['hair_slip', 'bug_damage'], skull: 'fair' }), 'Salted (dirty salt) · hair slip, bug damage · skull fair');
  assert.equal(conditionSummary({ state: 'salted', salt: 'clean', issues: [] }), 'Salted (clean salt)');
  assert.equal(conditionSummary({ state: 'fresh', issues: ['ears_not_turned'], skull: 'bad' }), 'Fresh · ears not turned · skull bad');
});

test('older check-ins with the older wording still read correctly', () => {
  assert.equal(conditionSummary(null, 'dry_salted'), 'Dry salted');
  assert.equal(conditionSummary(null, 'frozen'), 'Frozen');
});
