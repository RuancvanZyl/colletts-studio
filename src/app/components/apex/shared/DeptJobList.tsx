import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  RefreshCw, Loader2, AlertTriangle, ChevronRight, Clock,
  CheckCircle2, Droplet, Skull, Warehouse, Scissors, Paintbrush,
} from 'lucide-react';
import { DEPT_LABELS, DEPT_COLORS, getPipeline } from '../../../../lib/pipeline';
import type { DeptJob } from '../../../../lib/hooks/useDeptJobs';

type StepColor = 'blue' | 'amber' | 'slate' | 'green' | 'orange';
type EmptyIcon = 'droplet' | 'skull' | 'warehouse' | 'scissors' | 'paintbrush';

interface DeptJobListProps {
  title: string;
  subtitle: string;
  dept: string;
  jobs: DeptJob[];
  loading: boolean;
  completing: string | null;
  onRefresh: () => void;
  onAdvance: (job: DeptJob) => Promise<{ error: string | null }>;
  steps: string[];
  stepsColor: StepColor;
  emptyIcon: EmptyIcon;
  emptyText: string;
}

const EMPTY_ICONS: Record<EmptyIcon, React.ComponentType<{ className?: string }>> = {
  droplet:    Droplet,
  skull:      Skull,
  warehouse:  Warehouse,
  scissors:   Scissors,
  paintbrush: Paintbrush,
};

const STEP_COLORS: Record<StepColor, { bg: string; text: string; dot: string }> = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',   text: 'text-blue-900 dark:text-blue-100',   dot: 'bg-blue-200 dark:bg-blue-800' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-100', dot: 'bg-amber-200 dark:bg-amber-800' },
  slate:  { bg: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300',   dot: 'bg-slate-200 dark:bg-slate-700' },
  green:  { bg: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800', text: 'text-green-900 dark:text-green-100', dot: 'bg-green-200 dark:bg-green-800' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800', text: 'text-orange-900 dark:text-orange-100', dot: 'bg-orange-200 dark:bg-orange-800' },
};

import { toast } from 'sonner';

export function DeptJobList({
  title, subtitle, dept, jobs, loading, completing, onRefresh, onAdvance, steps, stepsColor, emptyIcon, emptyText,
}: DeptJobListProps) {
  const EmptyIcon = EMPTY_ICONS[emptyIcon];
  const colors = STEP_COLORS[stepsColor];
  const deptColor = DEPT_COLORS[dept] ?? 'bg-slate-600';
  const deptLabel = DEPT_LABELS[dept] ?? dept;

  async function handleAdvance(job: DeptJob) {
    const result = await onAdvance(job);
    if (result.error) {
      toast.error('Failed: ' + result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">{jobs.length} active</Badge>
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Steps reference */}
      <Card className={`border ${colors.bg}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            {steps.map((step, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm ${colors.text}`}>
                <span className={`w-5 h-5 ${colors.dot} rounded-full flex items-center justify-center text-xs font-bold shrink-0`}>{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
      ) : jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <EmptyIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{emptyText}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => {
            const pipeline = getPipeline(job.mountType);
            const stageIdx = pipeline.indexOf(job.currentDept);
            const progress = stageIdx >= 0 ? Math.round((stageIdx / (pipeline.length - 1)) * 100) : 0;
            const isCompleting = completing === job.docId;

            return (
              <Card key={job.docId} className="overflow-hidden">
                {/* Coloured header bar */}
                <div className={`${deptColor} px-4 py-2 flex items-center justify-between`}>
                  <span className="text-white text-xs font-bold uppercase tracking-wide">{deptLabel}</span>
                  <span className="text-white/80 text-xs font-mono">{job.tagNumber}</span>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Trophy info */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-lg">{job.species}</span>
                        <span className="text-slate-500 text-sm">{job.mountType}</span>
                        {job.condition === 'damaged' && (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> Damaged
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">
                        {job.clientNumber && <span className="font-bold text-slate-700 dark:text-slate-300 mr-1">{job.clientNumber}</span>}
                        {job.clientName}
                      </p>
                    </div>
                    {job.receivedAt && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(job.receivedAt).toLocaleDateString('en-ZA')}
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  {job.instructions && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Instructions</p>
                      <p className="text-sm text-amber-800 dark:text-amber-300">{job.instructions}</p>
                    </div>
                  )}

                  {/* Condition notes */}
                  {job.conditionNotes && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">Condition Notes</p>
                      <p className="text-sm text-red-800 dark:text-red-300">{job.conditionNotes}</p>
                    </div>
                  )}

                  {/* Pipeline progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Pipeline progress</span>
                      <span>{stageIdx + 1} / {pipeline.length}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {pipeline.map((stage, i) => {
                        const done = i < stageIdx;
                        const current = i === stageIdx;
                        return (
                          <span key={stage} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            done    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                            current ? `${deptColor} text-white` :
                                      'bg-slate-100 text-slate-400 dark:bg-slate-700'
                          }`}>
                            {DEPT_LABELS[stage] ?? stage}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage history */}
                  {job.stageHistory.length > 0 && (
                    <div className="text-xs text-slate-400 space-y-0.5">
                      {job.stageHistory.map((h, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span>{DEPT_LABELS[h.dept] ?? h.dept} — {h.completedBy} — {new Date(h.completedAt).toLocaleDateString('en-ZA')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action */}
                  <div className="flex justify-end pt-1">
                    <Button
                      onClick={() => handleAdvance(job)}
                      disabled={isCompleting}
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    >
                      {isCompleting ? 'Completing…' : (
                        <>Mark Complete<ChevronRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
