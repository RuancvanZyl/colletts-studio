// Trophy parts system
// Each trophy (animal) is made up of physical parts that must be tracked individually.
// Parts are determined by species + mount type, plus optional species-specific extras
// (feet, tail, scrotum, floating bones etc.) that clients can add regardless of mount type.

export interface TrophyPart {
  code: string;          // short code for tag: CAPE, BSKIN, SKULL, HORNS, TUSKS, FSKIN, FLATSKIN, HOOVES, HIDE
  label: string;         // human-readable name
  required: boolean;     // false = optional (client can add/remove)
  leatherOption: boolean;// true = can be sent to leather work instead of used in mount
  accessory: boolean;    // true = a made/bought item (plaque, base), not a physical animal part
  description: string;
}

// Species that have tusks instead of horns
const TUSK_SPECIES = new Set(['Warthog', 'Elephant', 'Hippo', 'Bushpig', 'Baboon']);
// Species with antlers (no bone horns, just for naming clarity)
const ANTLER_SPECIES = new Set(['Fallow Deer']);
// Species with no horns at all
const NO_HORN_SPECIES = new Set([
  'Lion', 'Leopard', 'Cheetah', 'Caracal', 'Serval', 'Wild Cat', 'Genet Cat',
  'Hyena', 'Jackal', 'Baboon', 'Vervet Monkey', 'Crocodile', 'Ostrich',
]);
// Big cats — have a floating (penis) bone, prized for jewellery/curios
const BIG_CAT_SPECIES = new Set(['Lion', 'Leopard', 'Cheetah', 'Caracal', 'Serval', 'Wild Cat']);
// Dangerous/plains game big enough that feet, tail and scrotum are commonly requested as extra products
const BIG_GAME_SPECIES = new Set([
  'Buffalo', 'Elephant', 'Hippo', 'Giraffe', 'Eland', 'Kudu', 'Gemsbok',
  'Sable', 'Roan Antelope', 'Wildebeest (Black)', 'Wildebeest (Blue)',
  'Zebra', 'Hartebeest', 'Waterbuck', 'Nyala', 'Lion', 'Leopard',
]);
// Elephant tusks and feet are treated as valuable trophy products in their own right
const ELEPHANT = 'Elephant';

function hornLabel(species: string): string {
  if (TUSK_SPECIES.has(species)) return 'Tusks';
  if (ANTLER_SPECIES.has(species)) return 'Antlers';
  return 'Horns';
}
function hornCode(species: string): string {
  if (TUSK_SPECIES.has(species)) return 'TUSKS';
  if (ANTLER_SPECIES.has(species)) return 'ANTLERS';
  return 'HORNS';
}
function hasHorns(species: string): boolean {
  return !NO_HORN_SPECIES.has(species);
}

function part(code: string, label: string, opts: Partial<TrophyPart> = {}): TrophyPart {
  return {
    code, label,
    required: false,
    leatherOption: false,
    accessory: false,
    description: label,
    ...opts,
  };
}

/** Core parts driven by the mount type the client chose. */
function coreParts(species: string, mountType: string): TrophyPart[] {
  const mt = mountType.toLowerCase();

  if (mt.includes('flat skin')) {
    return [
      part('FLATSKIN', 'Flat Skin', { required: true, description: 'Flat-cut full skin for tanning' }),
      ...(hasHorns(species) ? [part(hornCode(species), hornLabel(species), { description: `${hornLabel(species)} — optional to include` })] : []),
    ];
  }

  if (mt.includes('full mount') || mt.includes('full body')) {
    const parts: TrophyPart[] = [
      part('FSKIN', 'Full Skin', { required: true, description: 'Full skin with all four legs' }),
    ];
    if (hasHorns(species)) {
      parts.push(part(hornCode(species), hornLabel(species), { required: true, description: `${hornLabel(species)} for mount` }));
    }
    if (!NO_HORN_SPECIES.has(species)) {
      parts.push(part('SKULL', 'Skull', { description: 'Skull — required for some full mounts' }));
    }
    parts.push(part('HOOVES', 'Hooves', { description: 'Hooves — include if client wants them on mount' }));
    return parts;
  }

  if (mt.includes('euro mount')) {
    // European mount = cleaned skull with horns/antlers attached, on a wooden shield.
    // The skin itself isn't part of the mount, but if it arrives with the head it
    // can be kept and used for stock/leather rather than discarded.
    return [
      part('SKULL', 'Skull (with ' + hornLabel(species).toLowerCase() + ')', { required: true, description: `Cleaned skull with ${hornLabel(species).toLowerCase()} attached` }),
      part('SHIELD', 'Wooden Shield', { required: true, accessory: true, description: 'Wooden display shield for the Euro mount' }),
      part('CAPE', 'Cape / Skin', { leatherOption: true, description: 'Skin arrived with the head — not needed for the mount, can be kept for stock or leather work' }),
    ];
  }

  if (mt.includes('euro skull') || mt.includes('bleach') || mt.includes('clean')) {
    const parts: TrophyPart[] = [
      part('SKULL', 'Skull', { required: true, description: 'Skull cap for Euro / bleach mount' }),
    ];
    if (hasHorns(species)) {
      parts.push(part(hornCode(species), hornLabel(species), { required: true, description: `${hornLabel(species)} attached to skull` }));
    }
    return parts;
  }

  if (mt.includes('rug')) {
    return [
      part('FSKIN', 'Full Skin', { required: true, description: 'Full skin for rug mount' }),
      part('SKULL', 'Skull', { description: 'Skull with open mouth' }),
      ...(hasHorns(species) ? [part(hornCode(species), hornLabel(species))] : []),
    ];
  }

  if (mt.includes('tan only') || mt.includes('dip') || mt.includes('pack')) {
    return [
      part('FSKIN', 'Full Skin', { required: true, leatherOption: true, description: 'Full skin for tanning / dip & pack' }),
    ];
  }

  // Shoulder, Offset Shoulder, Pedestal, Half Mount — all cape-based
  const parts: TrophyPart[] = [
    part('CAPE', 'Cape', { required: true, description: 'Shoulder cape for mount' }),
    part('BSKIN', 'Back Skin', { leatherOption: true, description: 'Back skin — can be used for leather work instead of discarded' }),
  ];
  if (hasHorns(species)) {
    parts.push(part(hornCode(species), hornLabel(species), { required: true, description: `${hornLabel(species)} for mount` }));
  }
  if (species === 'Warthog') {
    parts.push(part('SKULL', 'Skull', { required: true, description: 'Skull with warthog face structure' }));
  }
  if (mt.includes('pedestal')) {
    parts.push(part('BASE', 'Wooden Base', { required: true, accessory: true, description: 'Wooden pedestal base' }));
  }
  return parts;
}

/**
 * Species-specific extras — additional products a client can request from the
 * same animal regardless of the main mount, e.g. a buffalo shoulder mount plus
 * taxidermy on the feet for a gun cabinet or lamp base.
 */
function extraParts(species: string): TrophyPart[] {
  const extras: TrophyPart[] = [];

  if (BIG_GAME_SPECIES.has(species) || TUSK_SPECIES.has(species)) {
    extras.push(part('FEET', 'Feet', { leatherOption: true, description: 'Feet for gun rack, lamp base, or stools' }));
    extras.push(part('TAIL', 'Tail', { description: 'Tail — e.g. for a fly whisk or display piece' }));
  }

  if (BIG_GAME_SPECIES.has(species) && !BIG_CAT_SPECIES.has(species)) {
    extras.push(part('SCROTUM', 'Scrotum', { description: 'Scrotum — novelty item, some clients request this be preserved' }));
  }

  if (BIG_CAT_SPECIES.has(species)) {
    extras.push(part('FLOATBONE', 'Floating Bone', { description: 'Floating (baculum) bone — kept for jewellery or curios' }));
    extras.push(part('CLAWS', 'Claws', { description: 'Claws — for jewellery or a claw necklace' }));
  }

  if (species === ELEPHANT) {
    extras.push(part('TUSKPROD', 'Tusks (as product)', { description: 'Tusks kept separately as a standalone carved/polished product rather than mounted' }));
    extras.push(part('EARS', 'Ears', { leatherOption: true, description: 'Ears — leather work or wall display' }));
    extras.push(part('TAILHAIR', 'Tail Hair', { description: 'Tail hair — for bracelets/jewellery' }));
  }

  return extras;
}

export function getPartsForTrophy(species: string, mountType: string): TrophyPart[] {
  const core = coreParts(species, mountType);
  const extras = extraParts(species);
  // Don't duplicate a code that core parts already cover (e.g. feet vs hooves)
  const coreCodes = new Set(core.map(p => p.code));
  return [...core, ...extras.filter(e => !coreCodes.has(e.code))];
}

// Generate a part tag code
// Format: {clientNumber}-{SPECIES3}-T{trophyIndex}-{PARTCODE}
// e.g. E042-ZEB-T1-CAPE
export function makePartTag(clientNumber: string, species: string, trophyIndex: number, partCode: string): string {
  const sp = species.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3);
  return `${clientNumber}-${sp}-T${trophyIndex}-${partCode}`;
}

// Species 3-letter abbreviation for display
export function speciesAbbr(species: string): string {
  return species.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3);
}
