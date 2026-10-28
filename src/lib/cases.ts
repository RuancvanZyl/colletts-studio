/** Rejected-skin cases: the rules that are applied in the app. */

/** After the outcome is "the client decides", the outfitter has this many days to tell the client before the workshop must. */
export const CLIENT_INFORM_DAYS = 21;

const DAY = 86_400_000;
export const informDeadline = (outcomeAt: string | null | undefined): Date | null => outcomeAt ? new Date(new Date(outcomeAt).getTime() + CLIENT_INFORM_DAYS * DAY) : null;

/** Days left for the outfitter to tell the client (negative = the workshop must now tell the client). */
export function informDaysLeft(c: { outcome?: string | null; outcome_at?: string | null; client_informed_at?: string | null }, now: Date = new Date()): number | null {
  if (c.outcome !== 'client_decision' || c.client_informed_at || !c.outcome_at) return null;
  const n = Math.ceil((informDeadline(c.outcome_at)!.getTime() - now.getTime()) / DAY);
  return n === 0 ? 0 : n;   // never -0
}
