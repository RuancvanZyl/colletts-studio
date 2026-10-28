/**
 * progress — where each client's trophies should be, measured against the production milestones.
 * The clock starts the day the invoice is paid (client_hunts.timeline_started_at) and the milestones are the ones
 * already set for that order (see orderTimeline.ts): M1 skin & skull prep, M2 tannery, M3 completion, M4 dispatch & clearing.
 * Pure functions: no database, no imports, so they can be tested on their own.
 */

export interface Milestone { key: string; label: string; due_date: string; completed?: boolean }
/** One trophy: the stages of its pipeline, the stage it is in now, and whether it is finished. */
export interface AnimalPos { pipeline: string[]; dept: string; done: boolean }

const DAY = 86_400_000;
/** Everything that counts as "skin & skull preparation" in a pipeline. */
export const PREP_STAGES = ['receiving', 'skinning', 'salting', 'cleaning_bleach', 'storage'];

/** The pipeline position an animal must have reached for a milestone to be met. Infinity = it must be finished. */
export function requiredIndex(key: string, size: string | null, pipeline: string[]): number {
  const firstWhere = (pred: (s: string) => boolean) => { const i = pipeline.findIndex(pred); return i < 0 ? Infinity : i; };
  const afterPrep = firstWhere(s => !PREP_STAGES.includes(s));
  if (key === 'm1') return afterPrep;
  if (key === 'm2') { const t = pipeline.indexOf('tannery'); return t < 0 ? afterPrep : t + 1; }
  if (key === 'm3') {
    if (size === 'large') return firstWhere(s => s === 'photos' || s === 'packing' || s === 'administration'); // production complete
    const a = pipeline.indexOf('administration');                                                             // mounted, finished, checked, packed
    return a < 0 ? Infinity : a;
  }
  return Infinity;                                                                                             // m4: dispatched and cleared
}

export function milestoneMet(key: string, size: string | null, a: AnimalPos): boolean {
  if (a.done) return true;
  const need = requiredIndex(key, size, a.pipeline);
  if (!Number.isFinite(need)) return false;
  const here = a.pipeline.indexOf(a.dept);
  return here >= 0 && here >= need;
}

/** In plain words: what should be true by the milestone date. */
export function expectation(key: string, size: string | null): string {
  if (key === 'm1') return 'Skin and skull preparation finished: hides salted, skulls cleaned';
  if (key === 'm2') return 'Skins back from the tannery';
  if (key === 'm3') return size === 'large' ? 'Production complete: mounted, finished and quality checked' : 'Finished, quality checked and packed';
  if (key === 'm4') return 'Dispatched and cleared';
  return '';
}

export type AutoStatus = 'no_clock' | 'behind' | 'due_soon' | 'on_track' | 'finished';

export interface MilestoneState { key: string; label: string; due: string; daysLeft: number; met: boolean; metCount: number; total: number; manual: boolean }
export interface Assessment {
  auto: AutoStatus;
  milestones: MilestoneState[];
  next: MilestoneState | null;      // the first milestone not yet met
  overdue: MilestoneState[];
  day: number | null;               // days since the invoice was paid
  totalDays: number | null;         // days from payment to the last milestone
  animalBehind: (a: AnimalPos) => boolean;
}

export function assess(h: { size: string | null; clockStart: string | null; milestones: Milestone[] | null; deadline?: string | null }, animals: AnimalPos[], now: Date = new Date()): Assessment {
  const ms = h.milestones ?? [];
  if (!h.clockStart || ms.length === 0) {
    return { auto: 'no_clock', milestones: [], next: null, overdue: [], day: null, totalDays: null, animalBehind: () => false };
  }
  const day = Math.floor((now.getTime() - new Date(h.clockStart).getTime()) / DAY);
  const states: MilestoneState[] = ms.map(m => {
    const metCount = animals.filter(a => milestoneMet(m.key, h.size, a)).length;
    const met = !!m.completed || animals.length === 0 || metCount === animals.length;
    const daysLeft = Math.ceil((new Date(m.due_date).getTime() - now.getTime()) / DAY);
    return { key: m.key, label: m.label, due: m.due_date, daysLeft, met, metCount, total: animals.length, manual: !!m.completed };
  });
  const overdue = states.filter(s => !s.met && s.daysLeft < 0);
  const next = states.find(s => !s.met) ?? null;
  const lastDue = ms[ms.length - 1].due_date;
  const totalDays = Math.round((new Date(lastDue).getTime() - new Date(h.clockStart).getTime()) / DAY);
  let auto: AutoStatus;
  if (!next) auto = 'finished';
  else if (overdue.length > 0 || (h.deadline && new Date(h.deadline).getTime() < now.getTime())) auto = 'behind';
  else if (next.daysLeft <= 14) auto = 'due_soon';
  else auto = 'on_track';
  const overdueKeys = overdue.map(o => o.key);
  return { auto, milestones: states, next, overdue, day, totalDays, animalBehind: a => overdueKeys.some(k => !milestoneMet(k, h.size, a)) };
}
