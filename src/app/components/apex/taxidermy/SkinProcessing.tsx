import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';

export function SkinProcessing() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('cleaning_bleach');

  return (
    <DeptJobList
      title="Skin Processing"
      subtitle="Cleaning, fleshing, salting and bleaching"
      dept="cleaning_bleach"
      jobs={jobs}
      loading={loading}
      completing={completing}
      onRefresh={load}
      onAdvance={advance}
      steps={['1. Flesh & clean skin thoroughly', '2. Salt skin side liberally', '3. Fold flesh-side in, drain 24h', '4. Bleach horns / skull if applicable', '5. Mark complete when cured']}
      stepsColor="blue"
      emptyIcon="droplet"
      emptyText="No skins currently in processing"
    />
  );
}
