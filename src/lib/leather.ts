/**
 * Leftover skin: what the client wants done with skin that is not used for their mount (a back skin after a shoulder mount,
 * a whole skin that came with a Euro skull). The answer is written on the animal's job card (form_data.leather).
 * The list of things that can be made is a starting list: the workshop's own list replaces it.
 */
export interface Leather { choice: '' | 'leather' | 'none' | 'later'; items: string[]; note?: string | null; by?: string; by_name?: string; at?: string; confirmed_at?: string; confirmed_by?: string }

export const LEATHER_GROUPS: { heading: string; items: string[] }[] = [
  { heading: 'From the hide', items: ['Tan & return as flat skin', 'Biltong / dry-wors bag', 'Leather knife sheath', 'Leather hat band', 'Hide cushion covers', 'Hide throw / blanket'] },
  { heading: 'Furniture & home', items: ['Hide-upholstered chair or stool', 'Curtain tie-backs', 'Bookends'] },
  { heading: 'Creative & unique', items: ['Handbag', 'Walking stick / cane', 'Something else (I will describe it)'] },
];

const norm = (m: string) => m.toLowerCase();

/** Mounts that use only part of the skin, so some is normally left over. The client is asked when they choose. */
export function mayLeaveSkin(mount: string | null | undefined): boolean {
  const m = norm(mount ?? '');
  return /shoulder|pedestal|half|euro|bleach/.test(m);
}

/** Skin parts that, once received, may be left over: the back skin always; a whole skin / cape when the mount is only the skull. */
export function leftoverSkin(mount: string | null | undefined, receivedCodes: string[]): boolean {
  const m = norm(mount ?? '');
  const codes = new Set(receivedCodes.map(c => c.toUpperCase()));
  if (/tan only|dip|rug|flat skin|full/.test(m)) return false;
  if (codes.has('BSKIN')) return true;
  if (/euro|bleach|skull/.test(m)) return ['CAPE', 'FSKIN', 'FLATSKIN', 'HIDE'].some(c => codes.has(c));
  return false;
}

/** One plain sentence for the card and the lists. */
export function leatherText(l: Leather | null | undefined): string {
  if (!l || !l.choice) return '';
  if (l.choice === 'leather') return `Leather work: ${l.items.join(', ')}`;
  if (l.choice === 'none') return 'The client does not want anything made from the leftover skin' + (l.note ? ` (${l.note})` : '');
  return 'The client has not decided about the leftover skin yet';
}
