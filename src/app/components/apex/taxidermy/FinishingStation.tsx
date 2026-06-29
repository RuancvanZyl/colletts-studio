import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';

export function FinishingStation() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('finishing');

  return (
    <DeptJobList
      title="Finishing Station"
      subtitle="Painting, detailing and final touches"
      dept="finishing"
      jobs={jobs}
      loading={loading}
      completing={completing}
      onRefresh={load}
      onAdvance={advance}
      steps={['1. Eye set & expression check', '2. Nose & lip detail paint', '3. Ear lining detail', '4. Habitat base / plaque finish', '5. Client nameplate attached']}
      stepsColor="orange"
      emptyIcon="paintbrush"
      emptyText="No jobs currently in finishing"
    />
  );
}
