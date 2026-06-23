import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Droplet, ArrowRight, RefreshCw, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { PhaseAdvanceDialog, PHASE_LABELS } from '../shared/PhaseAdvanceDialog';
import type { JobWithRelations } from '../../../../lib/hooks/useJobs';

function daysInPhase(job: JobWithRelations): number {
  // We'd read from phase_history; approximate from updated_at for now
  const updated = new Date(job.updated_at);
  return Math.floor((Date.now() - updated.getTime()) / 86400000);
}

export function SkinProcessing() {
  const { jobs, loading, refresh, advancePhase } = useJobs('skin_processing');
  const [advanceTarget, setAdvanceTarget] = useState<JobWithRelations | null>(null);

  const skinJobs = jobs.filter(j =>
    j.parts.some(p => p.part_type === 'cape_skin' || p.part_type === 'full_skin')
    || j.parts.length === 0 // show all skin_processing jobs even without parts listed
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Skin Cleaning & Salting</h1>
          <p className="text-slate-600 dark:text-slate-400">Process skins for tannery preparation</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Process steps reference */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4 text-sm text-blue-900 dark:text-blue-100">
            {['1. Flesh removal & cleaning', '2. Salt skin side liberally', '3. Fold & drain', '4. Mark complete when cured'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <span>{step.slice(3)}</span>
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
            <Droplet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No skins currently in processing</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Droplet className="w-5 h-5 text-blue-600" />Active Skins</span>
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
                    <TableHead>Parts</TableHead>
                    <TableHead>Days in Phase</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map(job => {
                    const days = daysInPhase(job);
                    const overdue = job.due_date && new Date(job.due_date) < new Date();
                    return (
                      <TableRow key={job.id} className={overdue ? 'bg-red-50 dark:bg-red-950/30' : ''}>
                        <TableCell className="font-mono text-sm">
                          {job.specimens?.tag_number ?? '—'}
                          {job.rush && <Badge className="ml-2 bg-red-600 text-xs">RUSH</Badge>}
                        </TableCell>
                        <TableCell className="font-medium">{job.specimens?.clients?.full_name ?? '—'}</TableCell>
                        <TableCell>{job.specimens?.species?.common_name ?? job.specimens?.species_name ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {job.parts.length > 0
                              ? job.parts.map(p => <Badge key={p.id} variant="outline" className="text-xs">{p.part_type.replace('_', ' ')}</Badge>)
                              : <span className="text-slate-400 text-sm">—</span>
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className={days > 3 ? 'text-amber-600 font-medium' : ''}>{days}d</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {job.due_date ? (
                            <div className="flex items-center gap-1">
                              {overdue && <AlertTriangle className="w-3 h-3 text-red-600" />}
                              <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                {new Date(job.due_date).toLocaleDateString()}
                              </span>
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setAdvanceTarget(job)}>
                            <ArrowRight className="w-4 h-4 mr-1" />
                            {PHASE_LABELS['storage_pre']}
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
          currentPhase="skin_processing"
          nextPhase="storage_pre"
          jobLabel={`${advanceTarget.specimens?.species?.common_name ?? advanceTarget.specimens?.species_name ?? 'Trophy'} — ${advanceTarget.specimens?.clients?.full_name ?? ''}`}
          onConfirm={advancePhase}
        />
      )}
    </div>
  );
}
