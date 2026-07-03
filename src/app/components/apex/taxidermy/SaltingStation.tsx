import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';

export function SaltingStation() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('salting');
  return (
    <DeptJobList
      title="Salting Station"
      subtitle="Salt and cure skins — 24–48h minimum"
      dept="salting"
      jobs={jobs}
      loading={loading}
      completing={completing}
      onRefresh={load}
      onAdvance={(job, photos, notes) => advance(job, photos, notes)}
      requirePhoto={true}
      steps={[
        '1. Lay skin flesh-side up on draining rack',
        '2. Apply thick even layer of coarse salt',
        '3. Work salt into ears, lips and all folds',
        '4. Fold flesh-side in (salt inside)',
        '5. Allow 24–48h to drain — photograph when done',
      ]}
      stepsColor="pink"
      emptyIcon="droplet"
      emptyText="No skins currently at salting"
    />
  );
}
