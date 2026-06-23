import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Paintbrush, ArrowRight, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { PhaseAdvanceDialog } from '../shared/PhaseAdvanceDialog';
import type { JobWithRelations } from '../../../../lib/hooks/useJobs';

export function FinishingStation() {
  const { jobs, loading, refresh, advancePhase } = useJobs('finishing');
  const [advanceTarget, setAdvanceTarget] = useState<JobWithRelations | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Finishing Station</h1>
          <p className="text-slate-600 dark:text-slate-400">Painting, detailing, and final touches</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">{jobs.length} active</Badge>
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Finishing checklist reference */}
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4 text-sm text-green-900 dark:text-green-100">
            {['Eye set & expression', 'Nose & lip detail paint', 'Ear lining', 'Habitat base / plaque', 'Client nameplate'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
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
            <Paintbrush className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No jobs currently in finishing</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-green-600" />Finishing Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Mount Type</TableHead>
                    <TableHead>Instructions</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map(job => {
                    const overdue = job.due_date && new Date(job.due_date) < new Date();
                    return (
                      <TableRow key={job.id} className={overdue ? 'bg-red-50 dark:bg-red-950/30' : ''}>
                        <TableCell className="font-mono text-sm">
                          {job.specimens?.tag_number ?? '—'}
                          {job.rush && <Badge className="ml-2 bg-red-600 text-xs">RUSH</Badge>}
                        </TableCell>
                        <TableCell className="font-medium">{job.specimens?.clients?.full_name ?? '—'}</TableCell>
                        <TableCell>{job.specimens?.species?.common_name ?? job.specimens?.species_name ?? '—'}</TableCell>
                        <TableCell>{job.mount_types?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400 max-w-40 truncate">
                          {job.instructions ?? '—'}
                        </TableCell>
                        <TableCell>
                          {job.due_date ? (
                            <div className="flex items-center gap-1">
                              {overdue && <AlertTriangle className="w-3 h-3 text-red-600" />}
                              <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                {new Date(job.due_date).toLocaleDateString()}
                              </span>
                            </div>
                          ) : <span className="text-slate-400 text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setAdvanceTarget(job)}>
                            <ArrowRight className="w-4 h-4 mr-1" />
                            QC
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {advanceTarget && (
        <PhaseAdvanceDialog
          open={true}
          onClose={() => setAdvanceTarget(null)}
          jobId={advanceTarget.id}
          currentPhase="finishing"
          nextPhase="quality_check"
          jobLabel={`${advanceTarget.specimens?.species?.common_name ?? advanceTarget.specimens?.species_name ?? 'Trophy'} — ${advanceTarget.specimens?.clients?.full_name ?? ''}`}
          onConfirm={advancePhase}
        />
      )}
    </div>
  );
}
