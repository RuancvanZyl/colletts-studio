/**
 * mountRules — what a trophy may be changed to once the skin has been cut for a mount.
 * (The same rules are enforced in the database: migration 063, `_mount_change_problem`.)
 *
 *   Full body  →  Half body or Shoulder          allowed (a smaller mount from the same skin)
 *   Half body  →  Shoulder                       allowed
 *   Shoulder   →  Half body or Full              NOT allowed: the skin was cut for a shoulder mount
 *   Flat skin  →  Shoulder, Half body or Full    NOT allowed: a flat skin cannot be made into those
 *   Full body  →  a flat skin (Flat Skin, Tan Only, Rug on Felt, Dip & Pack)    allowed
 *   Half body or Shoulder  →  Tan Only or Dip & Pack                          allowed (a rug or flat skin needs a skin that was cut for it)
 *   Any skin   →  skull only (Euro, bleach)                                  allowed (less work on the same animal)
 *   Once the trophy is being mounted (Mounting stage or later) the mount can no longer be changed.
 *   Before that the client still pays for any tanning already done, and the card carries on with the stages of its new mount.
 *   Shoulder, Offset shoulder and Pedestal are the same cut: they can be swapped for one another.
 *
 * When a change is not allowed the hunter can instead BUY a skin from the workshop's stock (a hide purchase, like a rejected skin):
 * the first mount is credited, the invoice is amended and a new job card starts for the stock skin. It is not their own skin.
 */

export type MountGroup = 'full' | 'half' | 'shoulder' | 'flat' | 'skull';

const GROUP: Record<string, MountGroup> = {
  'Full Mount': 'full',
  'Half Mount': 'half',
  'Shoulder Mount': 'shoulder', 'Offset Shoulder Mount': 'shoulder', 'Pedestal Mount': 'shoulder',
  'Flat Skin': 'flat', 'Tan Only': 'flat', 'Rug Mount on Felt': 'flat', 'Dip & Pack': 'flat',
  'Euro Skull': 'skull', 'Euro Mount': 'skull', 'Bleach Only': 'skull', 'Artistic Skull': 'skull',
};
const RANK: Record<MountGroup, number> = { full: 4, half: 3, shoulder: 2, flat: 1, skull: 0 };
/** What a trophy may be changed to from the options that are not about the shape of the skin */
const ALWAYS_OK_FROM_BIGGER = new Set(['Tan Only', 'Dip & Pack']);

/** From the Mounting stage onwards the trophy is being mounted: its mount can no longer be changed. */
export const MOUNTED_STAGES = ['mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'];
export const isMounted = (dept: string | null | undefined, status?: string | null) => MOUNTED_STAGES.includes(dept ?? '') || status === 'completed';
export const TOO_LATE = 'Once a trophy is being mounted its mount can no longer be changed.';

export const groupOf = (mount: string | null | undefined): MountGroup | null => GROUP[(mount ?? '').trim()] ?? null;

/** Every mount name the rules know about, for the "change to" list. */
export const CHANGEABLE_MOUNTS = Object.keys(GROUP);

export const NICE: Record<MountGroup, string> = { full: 'a full mount', half: 'a half-body mount', shoulder: 'a shoulder mount', flat: 'a flat skin', skull: 'a skull' };

export interface MountChange {
  kind: 'same' | 'allowed' | 'blocked' | 'unknown';
  /** plain words for the person at the screen */
  message: string;
  /** when blocked: the client may buy a skin from stock instead */
  canBuySkin: boolean;
}

export function mountChange(from: string | null | undefined, to: string | null | undefined): MountChange {
  const f = (from ?? '').trim(), t = (to ?? '').trim();
  const gf = groupOf(f), gt = groupOf(t);
  if (!f || !t || !gf || !gt) {
    return { kind: 'unknown', canBuySkin: false, message: 'A custom mount, replica or something that is not a normal mount is changed through "Credit and amend" on the invoice, not here.' };
  }
  if (f === t) return { kind: 'same', canBuySkin: false, message: 'That is the mount it already has.' };
  if (gt === 'skull') return { kind: 'allowed', canBuySkin: false, message: 'Allowed: only the skull is kept and prepared.' };
  if (gf === gt) return { kind: 'allowed', canBuySkin: false, message: 'Allowed: it is the same cut of skin.' };
  if (gf === 'skull') return { kind: 'blocked', canBuySkin: true, message: `Only the skull was kept for this one, so it cannot become ${NICE[gt]}. The client can buy a skin from our stock for ${NICE[gt]}. It will not be their own animal's skin.` };
  if (gf === 'flat') {
    return { kind: 'blocked', canBuySkin: true, message: `A flat skin cannot be made into ${NICE[gt]}. The client can buy a skin from our stock for ${NICE[gt]}. It will not be their own animal's skin.` };
  }
  // from full, half or shoulder
  if (gt === 'flat') {
    if (gf === 'full') return { kind: 'allowed', canBuySkin: false, message: 'Allowed: a full-mount skin can be made into a flat skin.' };
    if (ALWAYS_OK_FROM_BIGGER.has(t)) return { kind: 'allowed', canBuySkin: false, message: 'Allowed: the skin is only tanned or prepared for their own taxidermist.' };
    return { kind: 'blocked', canBuySkin: false, message: `${t} needs a skin that was cut flat. This skin was cut for ${NICE[gf]}.` };
  }
  if (RANK[gt] < RANK[gf]) return { kind: 'allowed', canBuySkin: false, message: `Allowed: a smaller mount can be made from skin that was cut for ${NICE[gf]}.` };
  return { kind: 'blocked', canBuySkin: true, message: `This skin was cut for ${NICE[gf]}, so it cannot become ${NICE[gt]}. If they want ${NICE[gt]}, the client can buy a skin from our stock. It will not be their own animal's skin.` };
}
