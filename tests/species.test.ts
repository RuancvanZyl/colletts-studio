import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, findSpecies, sciName, variantsOf, animalKind, splitVariant, familyOf, typesOfFamily, groupFamilies } from '../src/lib/species.ts';

test('every animal has a scientific name and a unique name', () => {
  const names = new Set<string>();
  for (const s of SPECIES) {
    assert.ok(!names.has(s.name.toLowerCase()), `duplicate name: ${s.name}`);
    names.add(s.name.toLowerCase());
    if (s.name !== 'Other') assert.ok(s.sci.trim().length > 5, `no scientific name for ${s.name}`);
  }
});

test('two types never share the same scientific name', () => {
  const seen = new Map<string, string>();
  for (const s of SPECIES) {
    if (!s.sci) continue;
    const other = seen.get(s.sci);
    assert.ok(!other || other === s.name, `${s.name} and ${other} have the same scientific name (${s.sci})`);
    seen.set(s.sci, s.name);
  }
});

test('no old spelling points at the wrong animal', () => {
  const names = new Set(SPECIES.map(s => s.name.toLowerCase()));
  for (const s of SPECIES) for (const a of s.aliases ?? []) {
    const hit = findSpecies(a);
    assert.equal(hit?.name, s.name, `alias "${a}" of ${s.name} resolves to ${hit?.name}`);
    assert.ok(!names.has(a.toLowerCase()) || a.toLowerCase() === s.name.toLowerCase(), `alias "${a}" is also an animal's own name`);
  }
});

test('zebra: plains = Burchell\'s, and two mountain zebras', () => {
  assert.equal(findSpecies('Plains Zebra')?.name, "Zebra (Burchell's)");
  assert.equal(findSpecies('Zebra')?.name, "Zebra (Burchell's)");
  assert.equal(sciName("Zebra (Burchell's)"), 'Equus quagga burchellii');
  assert.equal(sciName('Zebra (Cape Mountain)'), 'Equus zebra zebra');
  assert.equal(sciName("Zebra (Hartmann's Mountain)"), 'Equus zebra hartmannae');
});

test('blue wildebeest has golden, king and royal colours; the other wildebeest are their own animals', () => {
  assert.deepEqual(variantsOf('Wildebeest (Blue)'), ['Normal', 'Golden', 'King', 'Royal']);
  assert.deepEqual(splitVariant('Wildebeest (Blue), King'), { base: 'Wildebeest (Blue)', variant: 'King' });
  assert.equal(sciName('Wildebeest (Black)'), 'Connochaetes gnou');
  assert.equal(sciName('Wildebeest (Blue)'), 'Connochaetes taurinus taurinus');
});

test('older names on existing job cards still find their animal', () => {
  for (const [old, now] of [['Zebra (Cape)', "Zebra (Burchell's)"], ['Roan Antelope', 'Roan'], ['Buffalo', 'Buffalo (Cape)'], ['Hyena', 'Hyena (Spotted)'], ['Jackal', 'Jackal (Black-backed)']]) {
    assert.equal(findSpecies(old)?.name, now, old);
  }
});

test('the trophy parts follow the animal family, not the exact name', () => {
  assert.equal(animalKind('Hyena (Spotted)').horns, 'none');
  assert.equal(animalKind('Jackal (Black-backed)').horns, 'none');
  assert.equal(animalKind('Crocodile (Nile)').horns, 'none');
  assert.equal(animalKind('Guineafowl (Helmeted)').horns, 'none');
  assert.equal(animalKind('Baboon (Chacma)').horns, 'tusks');
  assert.equal(animalKind('Warthog (Desert)').horns, 'tusks');
  assert.equal(animalKind('Fallow Deer').horns, 'antlers');
  assert.equal(animalKind('Sika Deer').horns, 'antlers');
  assert.equal(animalKind('Kudu').horns, 'horns');
  assert.equal(animalKind('Zebra (Cape Mountain)').bigGame, true);
  assert.equal(animalKind('Buffalo (Cape)').bigGame, true);
  assert.equal(animalKind('Duiker (Maxwell\'s)').bigGame, false);
  assert.equal(animalKind('Kudu (Lesser)').bigGame, false);
  assert.equal(animalKind('Cheetah').bigCat, true);
  assert.equal(animalKind('Elephant (Forest)').elephant, true);
  assert.equal(animalKind('Other').horns, 'horns');
});

test('the African wild cat is easy to find', () => {
  assert.equal(findSpecies('African Wild Cat')?.name, 'Wild Cat');
  assert.equal(sciName('Wild Cat'), 'Felis lybica');
  assert.equal(findSpecies('Wild Cat')?.note, 'African wild cat');
});

test('colour variants are the ones the trade sells, and keep the animal\'s own scientific name', () => {
  assert.deepEqual(variantsOf('Springbok'), ['Normal', 'Black', 'White', 'Copper', 'King']);
  assert.deepEqual(variantsOf('Impala'), ['Normal', 'Black', 'White', 'White-flanked', 'Saddleback']);
  assert.deepEqual(variantsOf('Blesbok'), ['Normal', 'White', 'Yellow', 'Copper', 'Saddleback']);
  assert.deepEqual(variantsOf('Gemsbok'), ['Normal', 'Golden', 'King', 'Black', 'Red', 'White']);
  assert.deepEqual(variantsOf('Wildebeest (Blue)'), ['Normal', 'Golden', 'King', 'Royal']);
  assert.equal(findSpecies('Springbok, Copper')?.name, 'Springbok');
  assert.equal(sciName('Springbok, Copper'), 'Antidorcas marsupialis');
  assert.equal(sciName('Impala, Saddleback'), 'Aepyceros melampus melampus');
});

test('every type of an animal is listed together, each with its own scientific name', () => {
  assert.equal(familyOf("Zebra (Cape Mountain)"), 'Zebra');
  const zebra = typesOfFamily('Zebra');
  assert.ok(zebra.length >= 7);
  assert.deepEqual(zebra.filter(z => z.note === 'Mountain zebra').map(z => z.sci).sort(), ['Equus zebra hartmannae', 'Equus zebra zebra']);
  assert.ok(zebra.some(z => z.sci === 'Equus quagga burchellii' && z.note === 'Plains zebra'));
  const wild = typesOfFamily('Wildebeest').map(w => w.sci);
  assert.ok(wild.includes('Connochaetes gnou') && wild.includes('Connochaetes taurinus taurinus') && wild.includes('Connochaetes taurinus mearnsi'));
  for (const f of ['Kudu', 'Eland', 'Bushbuck', 'Sable', 'Roan', 'Hartebeest', 'Waterbuck', 'Giraffe', 'Duiker']) assert.ok(typesOfFamily(f).length >= 2, f);
  const g = groupFamilies(SPECIES.filter(s => s.name.startsWith('Zebra') || s.name === 'Kudu'));
  assert.equal(g.filter(x => x.family === 'Zebra').length, 1);
});
