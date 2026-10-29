import test from 'node:test';
import assert from 'node:assert/strict';
import { plainError } from '../src/lib/plainError.ts';

test('technical database text becomes plain words', () => {
  assert.match(plainError('invalid input syntax for type uuid: "x"'), /not fully set up/);
  assert.match(plainError('new row violates row-level security policy for table "x"'), /permission/);
  assert.match(plainError('Failed to fetch'), /internet/);
  assert.match(plainError('Could not find the table public.x in the schema cache'), /our side/);
});

test('our own plain messages pass through unchanged', () => {
  const ours = 'Every item on the checklist must be ticked before this card can move on.';
  assert.equal(plainError(ours), ours);
  assert.equal(plainError(''), 'Something went wrong. Please try again.');
});
