/** The tannery soak report: what is recorded and how it reads. */

export interface SoakFindings {
  bullet_damage?: boolean; ears?: 'turned' | 'not_turned' | 'damaged'; eyes?: 'good' | 'cut'; lips?: 'good' | 'cut'; nose?: 'good' | 'cut';
  hair_slip?: boolean; bug_damage?: boolean; rubbery?: boolean;
}

export const EARS: { value: string; label: string }[] = [{ value: 'turned', label: 'Turned' }, { value: 'not_turned', label: 'Not turned' }, { value: 'damaged', label: 'Damaged' }];
export const GOOD_CUT: { value: string; label: string }[] = [{ value: 'good', label: 'Good' }, { value: 'cut', label: 'Cut' }];

/** The yes / no checks, in the order they are asked. */
export const YES_NO: { key: keyof SoakFindings; label: string }[] = [
  { key: 'bullet_damage', label: 'Bullet damage' },
  { key: 'hair_slip', label: 'Hair slip' },
  { key: 'bug_damage', label: 'Bug damage' },
  { key: 'rubbery', label: 'Rubbery' },
];

/** More than this many holes is recorded as an actual number. */
export const HOLES_BUTTONS = 10;

/** Everything about a soak report that is a problem, in words. Offered as the reasons when a report is rejected. */
export function soakProblems(f: SoakFindings, holes: number | null | undefined): string[] {
  const out: string[] = [];
  if (f.bullet_damage) out.push('Bullet damage');
  if (f.ears === 'damaged') out.push('Ears damaged');
  if (f.eyes === 'cut') out.push('Eyes cut');
  if (f.lips === 'cut') out.push('Lips cut');
  if (f.nose === 'cut') out.push('Nose cut');
  if (f.hair_slip) out.push('Hair slip');
  if (f.bug_damage) out.push('Bug damage');
  if (f.rubbery) out.push('Rubbery');
  if ((holes ?? 0) > HOLES_BUTTONS) out.push(`More than ${HOLES_BUTTONS} holes (${holes})`);
  return out;
}

/** A readable summary line. */
export function soakSummary(f: SoakFindings, holes: number | null | undefined): string {
  const ears = f.ears === 'turned' ? 'ears turned' : f.ears === 'not_turned' ? 'ears not turned' : f.ears === 'damaged' ? 'ears damaged' : '';
  const bits = [ears, f.eyes ? `eyes ${f.eyes}` : '', f.lips ? `lips ${f.lips}` : '', f.nose ? `nose ${f.nose}` : '', holes != null ? `${holes} hole${holes === 1 ? '' : 's'}` : ''].filter(Boolean);
  const bad = [f.bullet_damage && 'bullet damage', f.hair_slip && 'hair slip', f.bug_damage && 'bug damage', f.rubbery && 'rubbery'].filter(Boolean);
  return [...bits, bad.length ? `seen: ${bad.join(', ')}` : 'no bullet damage, hair slip, bug damage or rubbery skin'].join(' · ');
}
