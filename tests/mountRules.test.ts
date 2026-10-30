import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountChange, isMounted } from '../src/lib/mountRules.ts';

const kind = (a: string, b: string) => mountChange(a, b).kind;

test('a shoulder mount cannot become a full or half-body mount', () => {
  assert.equal(kind('Shoulder Mount', 'Full Mount'), 'blocked');
  assert.equal(kind('Shoulder Mount', 'Half Mount'), 'blocked');
  assert.equal(kind('Offset Shoulder Mount', 'Full Mount'), 'blocked');
  assert.equal(mountChange('Shoulder Mount', 'Full Mount').canBuySkin, true);
});

test('a flat skin cannot become a full, half-body or shoulder mount', () => {
  for (const to of ['Full Mount', 'Half Mount', 'Shoulder Mount', 'Pedestal Mount']) assert.equal(kind('Flat Skin', to), 'blocked');
  assert.equal(kind('Tan Only', 'Shoulder Mount'), 'blocked');
  assert.equal(kind('Rug Mount on Felt', 'Full Mount'), 'blocked');
});

test('a full mount can become a half body or a shoulder mount, and a half body a shoulder mount', () => {
  assert.equal(kind('Full Mount', 'Half Mount'), 'allowed');
  assert.equal(kind('Full Mount', 'Shoulder Mount'), 'allowed');
  assert.equal(kind('Full Mount', 'Pedestal Mount'), 'allowed');
  assert.equal(kind('Half Mount', 'Shoulder Mount'), 'allowed');
  assert.equal(kind('Half Mount', 'Full Mount'), 'blocked');
});

test('a full mount can become a flat skin; half body and shoulder only a tan or a dip and pack', () => {
  for (const to of ['Flat Skin', 'Tan Only', 'Rug Mount on Felt', 'Dip & Pack']) assert.equal(kind('Full Mount', to), 'allowed');
  assert.equal(kind('Half Mount', 'Tan Only'), 'allowed');
  assert.equal(kind('Shoulder Mount', 'Dip & Pack'), 'allowed');
  assert.equal(kind('Half Mount', 'Rug Mount on Felt'), 'blocked');
  assert.equal(kind('Shoulder Mount', 'Flat Skin'), 'blocked');
});

test('once the trophy is being mounted it can no longer be changed', () => {
  assert.equal(isMounted('tannery'), false);
  assert.equal(isMounted('cleaning_bleach'), false);
  for (const d of ['mounting', 'finishing', 'quality_check', 'packing']) assert.equal(isMounted(d), true);
  assert.equal(isMounted('skinning', 'completed'), true);
});

test('shoulder variants swap freely, skull-only and tan-only are always possible from a skin cut for a mount', () => {
  assert.equal(kind('Shoulder Mount', 'Offset Shoulder Mount'), 'allowed');
  assert.equal(kind('Full Mount', 'Euro Skull'), 'allowed');
  assert.equal(kind('Shoulder Mount', 'Tan Only'), 'allowed');
  assert.equal(kind('Shoulder Mount', 'Rug Mount on Felt'), 'blocked');
  assert.equal(kind('Flat Skin', 'Euro Skull'), 'allowed');
  assert.equal(kind('Euro Skull', 'Shoulder Mount'), 'blocked');
});

test('the same mount, and odd mounts, are not changed by the rules', () => {
  assert.equal(kind('Full Mount', 'Full Mount'), 'same');
  assert.equal(kind('Custom mount', 'Full Mount'), 'unknown');
  assert.equal(kind('Pending Instructions', 'Full Mount'), 'unknown');
});

