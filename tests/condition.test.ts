import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conditionOk, conditionSummary } from '../src/lib/condition.ts';

const c = (over: Partial<{ condition: string; noIssues: boolean; issues: string[]; photos: unknown[] }> = {}) => ({ condition: 'salted', noIssues: false, issues: [] as string[], photos: [] as unknown[], ...over });

test('a report needs the visual check and either "no problems" or what was seen', () => {
  assert.equal(conditionOk(c()), false);
  assert.equal(conditionOk(c({ condition: '', noIssues: true })), false);
  assert.equal(conditionOk(c({ noIssues: true })), true);
});

test('anything wrong needs a photo as evidence', () => {
  assert.equal(conditionOk(c({ issues: ['hair_slip'] })), false);
  assert.equal(conditionOk(c({ issues: ['hair_slip'], photos: [new Blob()] })), true);
});

test('the one-line summary is readable', () => {
  assert.equal(conditionSummary({ state: 'dry_salted', none: true, issues: [] }), 'Dry salted · no problems seen');
  assert.equal(conditionSummary({ state: 'fresh', none: false, issues: ['hair_slip', 'smell'] }), 'Fresh · hair slip, smell (starting to rot)');
  assert.equal(conditionSummary(null, 'frozen'), 'Frozen');
});
