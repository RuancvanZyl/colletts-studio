/**
 * orderTimeline — classifies a hunt's order size and computes its production
 * milestones. The clock starts when the deposit is confirmed (Xero webhook,
 * once connected) or when management manually starts it for a cash payment.
 */

export type OrderSize = 'small' | 'medium' | 'large';

// Mount-type tiers used to classify order size
const FULL_TIER     = new Set(['Full Mount', 'Pedestal Mount', 'Life Cast', 'Rug Mount on Felt']);
const SHOULDER_TIER = new Set(['Shoulder Mount', 'Offset Shoulder Mount', 'Half Mount']);
// Everything else (Euro Mount, Flat Skin, Tan Only, Bleach Only, Artistic Skull, Euro Skull) = light tier

export interface OrderClassification {
  size: OrderSize;
  fullTierCount: number;
  shoulderTierCount: number;
  lightTierCount: number;
  reason: string;
}

/**
 * Classify a hunt's order size from its trophies' mount types.
 * Rules (per-hunt, confirmed with management):
 *  - Small:  a single shoulder mount, or only light items (euro/flatskin/tan-only) — 6 months
 *  - Medium: 2–5 shoulder mounts, up to 3 full-tier mounts, or a euro/flatskin + shoulder combo — 9 months
 *  - Large:  6+ shoulder mounts (including lifesize), 4+ full-tier mounts, >5 animals with
 *            full/pedestal/shoulder in the mix, or any leather/furniture products — 12–14 months
 */
export function classifyOrderSize(mountTypes: string[], hasLeatherOrFurniture = false): OrderClassification {
  const fullTierCount     = mountTypes.filter(m => FULL_TIER.has(m)).length;
  const shoulderTierCount = mountTypes.filter(m => SHOULDER_TIER.has(m)).length;
  const lightTierCount    = mountTypes.length - fullTierCount - shoulderTierCount;
  const total = mountTypes.length;

  if (fullTierCount >= 4) return { size: 'large', fullTierCount, shoulderTierCount, lightTierCount, reason: '4 or more full-tier mounts' };
  if (shoulderTierCount >= 6) return { size: 'large', fullTierCount, shoulderTierCount, lightTierCount, reason: '6 or more shoulder mounts' };
  if (hasLeatherOrFurniture) return { size: 'large', fullTierCount, shoulderTierCount, lightTierCount, reason: 'includes leather products or furniture' };
  if (total > 5 && (fullTierCount > 0 || shoulderTierCount > 0)) {
    return { size: 'large', fullTierCount, shoulderTierCount, lightTierCount, reason: 'more than 5 animals with full/pedestal/shoulder mounts' };
  }

  if (fullTierCount >= 1 || shoulderTierCount >= 2) {
    return { size: 'medium', fullTierCount, shoulderTierCount, lightTierCount, reason: fullTierCount >= 1 ? 'includes a full-tier mount' : '2–5 shoulder mounts' };
  }

  return { size: 'small', fullTierCount, shoulderTierCount, lightTierCount, reason: 'single shoulder mount or light items only' };
}

export interface Milestone {
  key: string;
  label: string;
  description: string;
  dueDate: string;   // ISO date
  dueDays: number;   // days from timeline start
}

const DAY = 86_400_000;

function addDays(start: Date, days: number): string {
  return new Date(start.getTime() + days * DAY).toISOString().slice(0, 10);
}

/**
 * Build the milestone schedule for a hunt, from the day its production clock starts.
 * M1 and M2 are the same for every size — the early physical processing steps don't
 * change with order size. Only M3 (and, for large orders, M4) scale with volume.
 */
export function buildMilestones(size: OrderSize, timelineStartedAt: string): Milestone[] {
  const start = new Date(timelineStartedAt);

  const m1: Milestone = {
    key: 'm1', label: 'Milestone 1 — Skin & Skull Prep',
    description: 'Hide soaking & salting; skull cleaning & bleaching',
    dueDate: addDays(start, 90), dueDays: 90,
  };
  const m2: Milestone = {
    key: 'm2', label: 'Milestone 2 — Tannery',
    description: 'Skins dispatched to tannery (60-day tannery process)',
    dueDate: addDays(start, 150), dueDays: 150,
  };

  if (size === 'small') {
    return [m1, m2, {
      key: 'm3', label: 'Milestone 3 — Completion',
      description: 'Skull fitting, packaging and quality check',
      dueDate: addDays(start, 180), dueDays: 180,
    }];
  }

  if (size === 'medium') {
    return [m1, m2, {
      key: 'm3', label: 'Milestone 3 — Completion',
      description: 'Mounting, finishing, quality check and packaging',
      dueDate: addDays(start, 270), dueDays: 270,
    }];
  }

  // Large — tannery runs in parallel with other production streams, so
  // Milestone 3 is counted from the end of Milestone 1, not after tannery.
  return [m1, m2, {
    key: 'm3', label: 'Milestone 3 — Production Complete',
    description: 'Mounting, finishing and quality check across all trophies',
    dueDate: addDays(start, 365), dueDays: 365,
  }, {
    key: 'm4', label: 'Milestone 4 — Dispatch & Clearing',
    description: 'Export documentation, crating, dispatch and customs clearing',
    dueDate: addDays(start, 425), dueDays: 425,
  }];
}

export const ORDER_SIZE_LABELS: Record<OrderSize, string> = {
  small: 'Small (6 months)',
  medium: 'Medium (9 months)',
  large: 'Large (12–14 months)',
};

export function milestoneStatus(dueDate: string, completed: boolean): 'done' | 'overdue' | 'due-soon' | 'upcoming' {
  if (completed) return 'done';
  const daysLeft = (new Date(dueDate).getTime() - Date.now()) / DAY;
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 14) return 'due-soon';
  return 'upcoming';
}
