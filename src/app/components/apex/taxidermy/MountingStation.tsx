import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';

export function MountingStation() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('mounting');

  return (
    <DeptJobList
      title="Mounting Station"
      subtitle="Active mounting jobs"
      dept="mounting"
      jobs={jobs}
      loading={loading}
      completing={completing}
      onRefresh={load}
      onAdvance={advance}
      steps={['1. Select correct form / mannequin', '2. Fit and adjust skin on form', '3. Set eyes — check expression', '4. Sew and blend all seams', '5. Position and secure on habitat / base']}
      stepsColor="green"
      emptyIcon="scissors"
      emptyText="No jobs currently at mounting"
    />
  );
}
