import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { priceRows } from '../scripts/genPricesSql.ts';
import { leftoverSkin, mayLeaveSkin } from '../src/lib/leather.ts';

test('the price list in migration 075 matches the one the screens use', () => {
  const sql = readFileSync(new URL('../supabase/migrations/075_proforma_cart.sql', import.meta.url), 'utf8');
  const inFile = new Set(sql.split('\n').filter(l => /^\('.*',\s*\d+(\.\d+)?\),?$/.test(l.trim()) || /^\('.*',\s*\d+(\.\d+)?\)$/.test(l.trim())).map(l => l.trim().replace(/,$/, '')));
  const wanted = priceRows();
  assert.ok(wanted.length > 800);
  const missing = wanted.filter(r => !inFile.has(r));
  assert.deepEqual(missing.slice(0, 5), [], `prices changed in pricing.ts: regenerate the list with "node scripts/genPricesSql.ts" (${missing.length} rows differ)`);
  assert.equal(inFile.size, wanted.length, 'the migration has price rows that the screens no longer have');
});

test('leftover skin: when the client is asked', () => {
  assert.equal(mayLeaveSkin('Shoulder Mount'), true);
  assert.equal(mayLeaveSkin('Euro Skull'), true);
  assert.equal(mayLeaveSkin('Full Mount'), false);
  assert.equal(mayLeaveSkin('Tan Only'), false);
  assert.equal(leftoverSkin('Shoulder Mount', ['SKULL', 'CAPE', 'BSKIN']), true);       // a back skin is left over
  assert.equal(leftoverSkin('Shoulder Mount', ['SKULL', 'CAPE']), false);               // the cape is used
  assert.equal(leftoverSkin('Euro Skull', ['SKULL', 'FSKIN']), true);                   // a whole skin came with a skull-only mount
  assert.equal(leftoverSkin('Euro Skull', ['SKULL']), false);
  assert.equal(leftoverSkin('Full Mount', ['FSKIN', 'BSKIN']), false);
});
