import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ChevronLeft, Trophy, Download } from 'lucide-react';
import { useEventCategories } from '@/lib/hooks/useEvents';
import { useResults } from '@/lib/hooks/useResults';
import { formatElapsed, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { exportResultsCsv } from '@/lib/exportCsv';

export function ResultsBoard() {
  const { eventId } = useParams();
  const { categories } = useEventCategories(eventId);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const { results, loading } = useResults(eventId, categoryId);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/90 mb-6">
          <ChevronLeft className="size-4" /> Back to events
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="size-6 text-[var(--color-gold)]" /> Live Results
          </h1>
          <Button variant="secondary" size="sm" onClick={() => exportResultsCsv(results)}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setCategoryId(undefined)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm border transition-colors',
              !categoryId ? 'bg-ocean-500/20 border-ocean-400/40 text-ocean-200' : 'border-white/10 text-white/50 hover:text-white/80',
            )}
          >
            All races
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                categoryId === cat.id ? 'bg-ocean-500/20 border-ocean-400/40 text-ocean-200' : 'border-white/10 text-white/50 hover:text-white/80',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading && <p className="text-white/40 text-center py-12">Loading results…</p>}

        {!loading && (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Bib</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Race</th>
                  <th className="px-4 py-3 font-medium">Age group</th>
                  <th className="px-4 py-3 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.registration_id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.overall_rank && r.overall_rank <= 3 ? (
                        <Badge tone={r.overall_rank === 1 ? 'gold' : r.overall_rank === 2 ? 'silver' : 'bronze'}>
                          {r.overall_rank}
                        </Badge>
                      ) : (
                        <span className="text-white/50">{r.overall_rank ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-white/70 tabular-nums">{r.race_number}</td>
                    <td className="px-4 py-2.5 text-white font-medium">{r.full_name}</td>
                    <td className="px-4 py-2.5 text-white/50">{r.category_name}</td>
                    <td className="px-4 py-2.5 text-white/50">
                      {r.age_group_label ?? '—'}
                      {r.age_group_rank === 1 && <Badge tone="gold" className="ml-1.5">AG 1st</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-teal-glow">
                      {formatElapsed(r.elapsed)}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-white/35">
                      No finishers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
