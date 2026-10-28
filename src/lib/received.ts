/**
 * What can arrive at the workshop for one animal — ticked off at the door, shown to the hunter afterwards.
 * (The hunter then decides which mount they want; see lib/pricing.ts.)
 */
import { makePartTag } from './trophyParts';

export interface ReceivedPart { code: string; label: string; hint: string }

export const RECEIVED_PARTS: ReceivedPart[] = [
  { code: 'SKULL',    label: 'Skull',     hint: 'skull (with horns if it has them)' },
  { code: 'CAPE',     label: 'Cape',      hint: 'head and neck skin' },
  { code: 'BSKIN',    label: 'Back skin', hint: 'back skin' },
  { code: 'FLATSKIN', label: 'Flat skin', hint: 'whole skin laid flat (F/Skin)' },
  { code: 'FSKIN',    label: 'Full skin', hint: 'whole skin with legs for a full mount (FMT/Skin)' },
  { code: 'FEET',     label: 'Feet',      hint: 'feet / hooves' },
  { code: 'LEGBONES', label: 'Leg bones', hint: 'leg bones' },
  { code: 'SCROTUM',  label: 'Scrotum',   hint: 'scrotum' },
  { code: 'TAIL',     label: 'Tail',      hint: 'tail' },
  { code: 'TUSKS',    label: 'Tusks',     hint: 'tusks' },
  { code: 'PANEL',    label: 'Panel',     hint: 'panel' },
  { code: 'OTHER',    label: 'Other',     hint: 'anything else — describe it' },
];

export const PART_LABEL: Record<string, string> = Object.fromEntries(RECEIVED_PARTS.map(p => [p.code, p.label]));

/** Quick sets so a worker ticks one button instead of four. */
export const PART_PRESETS: { label: string; codes: string[] }[] = [
  { label: 'Skull + Cape + Back skin', codes: ['SKULL', 'CAPE', 'BSKIN'] },
  { label: 'Skull + Flat skin',        codes: ['SKULL', 'FLATSKIN'] },
  { label: 'Skull + Full skin',        codes: ['SKULL', 'FSKIN'] },
];

export const CONDITIONS: { value: string; label: string }[] = [
  { value: 'fresh',      label: 'Fresh' },
  { value: 'frozen',     label: 'Frozen' },
  { value: 'salted',     label: 'Salted' },
  { value: 'dry_salted', label: 'Dry salted' },
  { value: 'wet_salted', label: 'Wet salted' },
  { value: 'dry',        label: 'Dry' },
  { value: 'other',      label: 'Other' },
];

/** The per-part tag records the rest of the app (labels, scanning) already understands. */
export function partRecords(clientNumber: string, species: string, animalIndex: number, codes: string[]) {
  return codes.map(code => ({
    code, label: PART_LABEL[code] ?? code, required: false, leather_option: false,
    tag: makePartTag(clientNumber, species, animalIndex, code),
  }));
}

/** "Skull, Cape and Back skin" */
export function listParts(codes: string[], other?: string): string {
  const names = codes.map(c => (c === 'OTHER' && other ? `Other (${other})` : PART_LABEL[c] ?? c));
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}
