// Trophy parts system
// Each trophy (animal) is made up of physical parts that must be tracked individually.
// Parts are determined by species + mount type.

export interface TrophyPart {
  code: string;          // short code for tag: CAPE, BSKIN, SKULL, HORNS, TUSKS, FSKIN, FLATSKIN, HOOVES, HIDE
  label: string;         // human-readable name
  required: boolean;     // false = optional (client can add/remove)
  leatherOption: boolean;// true = can be sent to leather work instead of used in mount
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

export function getPartsForTrophy(species: string, mountType: string): TrophyPart[] {
  const mt = mountType.toLowerCase();

  if (mt.includes('flat skin')) {
    // Flat skin — different cut to a full skin, from tannery
    return [
      { code: 'FLATSKIN', label: 'Flat Skin', required: true, leatherOption: false, description: 'Flat-cut full skin for tanning' },
      ...(hasHorns(species) ? [{ code: hornCode(species), label: hornLabel(species), required: false, leatherOption: false, description: `${hornLabel(species)} — optional to include` }] : []),
    ];
  }

  if (mt.includes('full mount') || mt.includes('full body')) {
    const parts: TrophyPart[] = [
      { code: 'FSKIN', label: 'Full Skin', required: true, leatherOption: false, description: 'Full skin with all four legs' },
    ];
    if (hasHorns(species)) {
      parts.push({ code: hornCode(species), label: hornLabel(species), required: true, leatherOption: false, description: `${hornLabel(species)} for mount` });
    }
    // Skull only for species that use it in a full mount
    if (!NO_HORN_SPECIES.has(species)) {
      parts.push({ code: 'SKULL', label: 'Skull', required: false, leatherOption: false, description: 'Skull — required for some full mounts' });
    }
    parts.push({ code: 'HOOVES', label: 'Hooves', required: false, leatherOption: false, description: 'Hooves — include if client wants them on mount' });
    return parts;
  }

  if (mt.includes('euro skull') || mt.includes('bleach') || mt.includes('clean')) {
    const parts: TrophyPart[] = [
      { code: 'SKULL', label: 'Skull', required: true, leatherOption: false, description: 'Skull cap for Euro / bleach mount' },
    ];
    if (hasHorns(species)) {
      parts.push({ code: hornCode(species), label: hornLabel(species), required: true, leatherOption: false, description: `${hornLabel(species)} attached to skull` });
    }
    return parts;
  }

  if (mt.includes('rug') || mt.includes('rug mount')) {
    return [
      { code: 'FSKIN', label: 'Full Skin', required: true, leatherOption: false, description: 'Full skin for rug mount' },
      { code: 'SKULL', label: 'Skull', required: false, leatherOption: false, description: 'Skull with open mouth' },
      ...(hasHorns(species) ? [{ code: hornCode(species), label: hornLabel(species), required: false, leatherOption: false, description: hornLabel(species) }] : []),
    ];
  }

  if (mt.includes('tan only') || mt.includes('dip') || mt.includes('pack')) {
    return [
      { code: 'FSKIN', label: 'Full Skin', required: true, leatherOption: true, description: 'Full skin for tanning / dip & pack' },
    ];
  }

  // Shoulder, Offset Shoulder, Pedestal, Half Mount — all cape-based
  const parts: TrophyPart[] = [
    { code: 'CAPE', label: 'Cape', required: true, leatherOption: false, description: 'Shoulder cape for mount' },
    { code: 'BSKIN', label: 'Back Skin', required: false, leatherOption: true, description: 'Back skin — can be used for leather work' },
  ];
  if (hasHorns(species)) {
    parts.push({ code: hornCode(species), label: hornLabel(species), required: true, leatherOption: false, description: `${hornLabel(species)} for mount` });
  }
  if (TUSK_SPECIES.has(species) && species === 'Warthog') {
    // Warthog also has skull needed for the face
    parts.push({ code: 'SKULL', label: 'Skull', required: true, leatherOption: false, description: 'Skull with warthog face structure' });
  }
  return parts;
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
