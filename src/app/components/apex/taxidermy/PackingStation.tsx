import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';

export function PackingStation() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('packing');
  return (
    <DeptJobList
      title="Packing & Crating"
      subtitle="Pack finished mounts for delivery or export"
      dept="packing"
      jobs={jobs}
      loading={loading}
      completing={completing}
      onRefresh={load}
      onAdvance={(job, photos, notes) => advance(job, photos, notes)}
      requirePhoto={true}
      steps={[
        '1. Wrap mount in acid-free tissue then bubble wrap',
        '2. Build / fit custom crate — no movement allowed',
        '3. Attach client label with delivery address',
        '4. Photograph sealed crate before collection',
        '5. Mark complete — trophy moves to Photos & Dispatch',
      ]}
      stepsColor="green"
      emptyIcon="warehouse"
      emptyText="No mounts currently awaiting packing"
    />
  );
}
