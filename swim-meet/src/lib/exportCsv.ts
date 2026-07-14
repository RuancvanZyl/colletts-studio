import type { MedalResultRow } from './database.types';
import { formatElapsed } from './utils';

/**
 * Plain CSV, one row per finisher. Columns match what Meet Mobile and most
 * results-import tools expect (bib, name, gender, age, category, time,
 * placements). Hy-Tek's native .hy3/.cl2 interchange formats are proprietary
 * binary/fixed-width formats outside Meet Manager itself — this CSV is the
 * portable interchange point for re-importing or handing to a meet host.
 */
export function exportResultsCsv(results: MedalResultRow[]) {
  const headers = [
    'race_number',
    'full_name',
    'gender',
    'age',
    'category',
    'age_group',
    'time',
    'overall_rank',
    'age_group_rank',
  ];
  const rows = results.map((r) => [
    r.race_number,
    r.full_name,
    r.gender,
    r.age_at_event,
    r.category_name,
    r.age_group_label ?? '',
    formatElapsed(r.elapsed),
    r.overall_rank ?? '',
    r.age_group_rank ?? '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `results-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
