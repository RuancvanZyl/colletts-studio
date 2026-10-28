/**
 * The condition report done when an animal arrives. The only thing that must be chosen is Fresh or Salted.
 * Everything else is optional: if it is not ticked it is simply not recorded.
 * It is part of the animal's receiving record so it can be printed, shown to the hunter and looked at again if there is a query.
 */

/** The one required choice. */
export const VISUAL_CHECKS: { value: string; label: string }[] = [
  { value: 'fresh',  label: 'Fresh' },
  { value: 'salted', label: 'Salted' },
];
/** Older check-ins used other words; they still display correctly. */
const LEGACY_STATES: Record<string, string> = { frozen: 'Frozen', dry_salted: 'Dry salted', wet_salted: 'Wet salted', dry: 'Dry', other: 'Other' };

export const SALT_QUALITY: { value: string; label: string }[] = [
  { value: 'clean', label: 'Clean salt' },
  { value: 'dirty', label: 'Dirty salt' },
];

/** Tick if seen. Nothing ticked means nothing is recorded. */
export const CONDITION_ISSUES: { value: string; label: string }[] = [
  { value: 'bullet_damage', label: 'Bullet damage' },
  { value: 'ears_not_turned', label: 'Ears not turned' },
  { value: 'hair_slip',     label: 'Hair slip' },
  { value: 'bug_damage',    label: 'Bug damage' },
];

export const SKULL_CONDITION: { value: string; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair (minimal damage)' },
  { value: 'bad',  label: 'Bad' },
];

export interface ConditionReport {
  state: string;            // fresh | salted
  salt?: string;            // clean | dirty (only when salted)
  issues: string[];
  skull?: string;           // good | fair | bad
  notes: string;
  recorded_by: string;
  recorded_at: string;
}

const label = (list: { value: string; label: string }[], v: string) => list.find(x => x.value === v)?.label ?? v;
export const visualCheckLabel = (v: string | null | undefined) => v ? (label(VISUAL_CHECKS, v) === v ? (LEGACY_STATES[v] ?? v) : label(VISUAL_CHECKS, v)) : '';
export const issueLabel = (v: string) => label(CONDITION_ISSUES, v);

/** A report is complete as soon as Fresh or Salted is chosen. */
export const conditionOk = (c: { condition: string }) => !!c.condition;

/** One line for a printout or a hunter's screen: "Salted (dirty salt) · hair slip · skull fair". */
export function conditionSummary(report: Partial<ConditionReport> | null | undefined, fallbackState?: string | null): string {
  const state = visualCheckLabel(report?.state ?? fallbackState);
  const parts = [state && report?.salt ? `${state} (${label(SALT_QUALITY, report.salt).toLowerCase()})` : state];
  if ((report?.issues ?? []).length) parts.push((report!.issues ?? []).map(issueLabel).join(', ').toLowerCase());
  if (report?.skull) parts.push(`skull ${label(SKULL_CONDITION, report.skull).replace(/ \(.*\)/, '').toLowerCase()}`);
  return parts.filter(Boolean).join(' · ');
}
