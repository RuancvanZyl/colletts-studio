import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Skull, ArrowRight, RefreshCw, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { PhaseAdvanceDialog, PHASE_LABELS } from '../shared/PhaseAdvanceDialog';
import type { JobWithRelations } from '../../../../lib/hooks/useJobs';

export function SkullProcessing() {
  const { jobs, loading, refresh, advancePhase } = useJobs('skull_processing');
  const [advanceTarget, setAdvanceTarget] = useState<JobWithRelations | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Skull Processing</h1>
          <p className="text-slate-600 dark:text-slate-400">Boiling, cleaning and bleaching skulls</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Steps reference */}
      <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4 text-sm text-amber-900 dark:text-amber-100">
            {['Pressure wash', 'Boil cycle (maceration)', 'Degrease', 'Whiten / bleach', 'Final inspection'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
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
            <Skull className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No skulls currently in processing</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Skull className="w-5 h-5 text-amber-600" />Skulls in Processing</span>
              <Badge variant="secondary">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</Badge>
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
                    <TableHead>Due Date</TableHead>
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
                            To Mounting
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
          currentPhase="skull_processing"
          nextPhase="mounting"
          jobLabel={`${advanceTarget.specimens?.species?.common_name ?? advanceTarget.specimens?.species_name ?? 'Trophy'} — ${advanceTarget.specimens?.clients?.full_name ?? ''}`}
          onConfirm={advancePhase}
        />
      )}
    </div>
  );
}
