/**
 * The hunter's collection — the "life list" idea (as in Firefinch): every species they have hunted is ticked off,
 * progress fills up per group, and milestones unlock badges. Everything is worked out from their own animals.
 */
import { SPECIES, SPECIES_GROUPS, findSpecies, splitVariant, type SpeciesGroup } from './species';

export interface CollectionStats {
  hunted: Set<string>;                       // base species names
  counts: Record<string, number>;            // base name → animals
  colours: Set<string>;                      // distinct colour variants hunted
  total: number;                             // animals in all
  speciesCount: number;
  catalogueTotal: number;
  byGroup: { group: SpeciesGroup; have: number; of: number }[];
}

const catalogue = SPECIES.filter(s => s.name !== 'Other');

export function collectionOf(speciesNames: string[]): CollectionStats {
  const hunted = new Set<string>(); const counts: Record<string, number> = {}; const colours = new Set<string>();
  for (const stored of speciesNames) {
    const { base, variant } = splitVariant(stored);
    const sp = findSpecies(base); if (!sp || sp.name === 'Other') continue;
    hunted.add(sp.name); counts[sp.name] = (counts[sp.name] ?? 0) + 1;
    if (variant !== 'Normal') colours.add(`${sp.name}, ${variant}`);
  }
  return {
    hunted, counts, colours, total: Object.values(counts).reduce((a, b) => a + b, 0), speciesCount: hunted.size,
    catalogueTotal: catalogue.length,
    byGroup: SPECIES_GROUPS.map(g => ({ group: g, have: catalogue.filter(s => s.group === g && hunted.has(s.name)).length, of: catalogue.filter(s => s.group === g).length })).filter(g => g.of > 0),
  };
}

export interface Badge { id: string; icon: string; title: string; how: string; earned: (c: CollectionStats) => boolean; progress: (c: CollectionStats) => [number, number] }

const need = (names: string[]) => (c: CollectionStats): [number, number] => [names.filter(n => c.hunted.has(n)).length, names.length];
const set = (id: string, icon: string, title: string, how: string, names: string[]): Badge => ({ id, icon, title, how, earned: c => need(names)(c)[0] === names.length, progress: need(names) });
const count = (id: string, icon: string, title: string, n: number): Badge => ({ id, icon, title, how: `Hunt ${n} different species`, earned: c => c.speciesCount >= n, progress: c => [Math.min(c.speciesCount, n), n] });

export const BADGES: Badge[] = [
  { id: 'first', icon: '🎯', title: 'First trophy', how: 'Add your first animal', earned: c => c.total >= 1, progress: c => [Math.min(c.total, 1), 1] },
  count('five', '🌿', 'Five species', 5),
  count('ten', '⭐', 'Ten species', 10),
  count('twentyfive', '🏆', 'Twenty-five species', 25),
  count('fifty', '👑', 'Fifty species', 50),
  {
    id: 'big5', icon: '🦁', title: 'The Big Five', how: 'Lion, leopard, Cape buffalo, elephant and a rhino',
    earned: c => ['Lion', 'Leopard', 'Buffalo (Cape)', 'Elephant'].every(n => c.hunted.has(n)) && (c.hunted.has('Rhinoceros (White)') || c.hunted.has('Rhinoceros (Black)')),
    progress: c => [['Lion', 'Leopard', 'Buffalo (Cape)', 'Elephant'].filter(n => c.hunted.has(n)).length + (c.hunted.has('Rhinoceros (White)') || c.hunted.has('Rhinoceros (Black)') ? 1 : 0), 5],
  },
  set('spiral', '🌀', 'Spiral-horn slam', 'Kudu, nyala, bushbuck and eland', ['Kudu', 'Nyala', 'Bushbuck', 'Eland']),
  set('cats', '🐆', 'Cats of Africa', 'Lion, leopard, cheetah, caracal and serval', ['Lion', 'Leopard', 'Cheetah', 'Caracal', 'Serval']),
  set('horses', '🐎', 'Horse-antelope slam', 'Sable, roan and gemsbok', ['Sable', 'Roan', 'Gemsbok']),
  set('gnus', '🦬', 'Wildebeest double', 'Blue and black wildebeest', ['Wildebeest (Blue)', 'Wildebeest (Black)']),
  set('pigs', '🐗', 'Pig family', 'Warthog and bushpig', ['Warthog', 'Bushpig']),
  { id: 'colours', icon: '🎨', title: 'Colour collector', how: 'Hunt 3 colour variants', earned: c => c.colours.size >= 3, progress: c => [Math.min(c.colours.size, 3), 3] },
];

export const earnedBadges = (c: CollectionStats) => BADGES.filter(b => b.earned(c));
/** Badges that were not earned before and are now. */
export const newBadges = (before: CollectionStats, after: CollectionStats) => BADGES.filter(b => !b.earned(before) && b.earned(after));

/** A rank, from how many species have been collected. */
export function rankOf(speciesCount: number): { title: string; next: number | null } {
  const steps: [number, string][] = [[0, 'Newcomer'], [1, 'Tracker'], [5, 'Bushwalker'], [10, 'Hunter'], [25, 'Master hunter'], [50, 'Legend of the bush']];
  let cur = steps[0]; for (const s of steps) if (speciesCount >= s[0]) cur = s;
  const next = steps.find(s => s[0] > speciesCount);
  return { title: cur[1], next: next ? next[0] : null };
}

export const GROUP_STYLE: Record<string, { bg: string; fg: string; emoji: string }> = {
  'Antelope':             { bg: '#f3e8d0', fg: '#7a5a1e', emoji: '🦌' },
  'Buffalo and big game': { bg: '#e0e4d4', fg: '#44502a', emoji: '🐃' },
  'Pigs and warthogs':    { bg: '#efddd5', fg: '#7a4330', emoji: '🐗' },
  'Predators':            { bg: '#f1d9c4', fg: '#8a4a14', emoji: '🐆' },
  'Small carnivores':     { bg: '#e6dbea', fg: '#5b3a6b', emoji: '🦡' },
  'Primates':             { bg: '#e4dcc8', fg: '#5c4a26', emoji: '🐒' },
  'Small game':           { bg: '#dde8d6', fg: '#3b5a2b', emoji: '🐇' },
  'Birds':                { bg: '#d6e6ee', fg: '#2d5a70', emoji: '🐦' },
  'Reptiles':             { bg: '#d3e6d8', fg: '#2d6a45', emoji: '🐊' },
  'Introduced game':      { bg: '#e6e0d0', fg: '#59502e', emoji: '🦌' },
};
