import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatElapsed(interval: string | null): string {
  if (!interval) return '—';
  // Postgres interval textual output, e.g. "00:12:34.567891" or "1 day 00:03:00"
  const match = interval.match(/(\d+):(\d+):(\d+)(?:\.(\d+))?/);
  if (!match) return interval;
  const [, h, m, s, ms] = match;
  const hh = h.padStart(2, '0');
  const mm = m.padStart(2, '0');
  const ss = s.padStart(2, '0');
  const centis = ms ? ms.slice(0, 2).padEnd(2, '0') : '00';
  return hh === '00' ? `${mm}:${ss}.${centis}` : `${hh}:${mm}:${ss}`;
}

export function calcAge(dob: string, onDate: string): number {
  const birth = new Date(dob);
  const at = new Date(onDate);
  let age = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) age--;
  return age;
}
