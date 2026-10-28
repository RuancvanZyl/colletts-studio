/**
 * The condition report done when an animal arrives: the visual check (fresh, salted...) and anything wrong that was seen.
 * It is part of the animal's receiving record so it can be printed, shown to the hunter and looked at again if there is a query.
 */

/** The visual check of the preservation state (the "Visual check" column on the receiving sheet). */
export const VISUAL_CHECKS: { value: string; label: string }[] = [
  { value: 'fresh',      label: 'Fresh' },
  { value: 'frozen',     label: 'Frozen' },
  { value: 'salted',     label: 'Salted' },
  { value: 'dry_salted', label: 'Dry salted' },
  { value: 'wet_salted', label: 'Wet salted' },
  { value: 'dry',        label: 'Dry' },
  { value: 'other',      label: 'Other' },
];

/** Things to look for and tick if seen. If any is ticked, a photo is required as evidence. */
export const CONDITION_ISSUES: { value: string; label: string }[] = [
  { value: 'hair_slip',     label: 'Hair slip' },
  { value: 'holes_cuts',    label: 'Holes or cuts in the skin' },
  { value: 'bullet_damage', label: 'Bullet damage' },
  { value: 'maggots',       label: 'Flies or maggots' },
  { value: 'smell',         label: 'Smell (starting to rot)' },
  { value: 'freezer_burn',  label: 'Freezer burn' },
  { value: 'poorly_salted', label: 'Not properly salted' },
  { value: 'cape_short',    label: 'Cape cut too short' },
  { value: 'horn_damage',   label: 'Horns damaged or loose' },
  { value: 'skull_damage',  label: 'Skull damaged' },
  { value: 'missing_parts', label: 'Parts missing' },
];

export interface ConditionReport {
  state: string;            // one of VISUAL_CHECKS
  none: boolean;            // "no problems seen"
  issues: string[];         // ticked from CONDITION_ISSUES
  notes: string;
  recorded_by: string;
  recorded_at: string;
}

const label = (list: { value: string; label: string }[], v: string) => list.find(x => x.value === v)?.label ?? v;
export const visualCheckLabel = (v: string | null | undefined) => v ? label(VISUAL_CHECKS, v) : '';
export const issueLabel = (v: string) => label(CONDITION_ISSUES, v);

/** A report is complete when the visual check is chosen and the person said either "no problems" or what they saw. */
export const conditionOk = (c: { condition: string; noIssues: boolean; issues: string[]; photos: unknown[] }) =>
  !!c.condition && (c.noIssues || c.issues.length > 0) && (c.issues.length === 0 || c.photos.length > 0);

/** One line for a printout or a hunter's screen: "Salted · no problems seen" / "Fresh · hair slip, smell". */
export function conditionSummary(report: Partial<ConditionReport> | null | undefined, fallbackState?: string | null): string {
  const state = visualCheckLabel(report?.state ?? fallbackState);
  if (!report || (!report.none && !(report.issues ?? []).length)) return state;
  const seen = report.none ? 'no problems seen' : (report.issues ?? []).map(issueLabel).join(', ').toLowerCase();
  return [state, seen].filter(Boolean).join(' · ');
}
