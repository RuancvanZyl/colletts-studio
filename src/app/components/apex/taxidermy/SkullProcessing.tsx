import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';

export function SkullProcessing() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('cleaning_bleach');

  // Filter to only jobs where the mount type involves skull work
  const skullJobs = jobs.filter(j =>
    ['Euro Mount', 'Bleach Mount', 'Shoulder Mount', 'Offset Shoulder Mount', 'Pedestal Mount', 'Full Mount'].includes(j.mountType)
  );

  return (
    <DeptJobList
      title="Skull Processing"
      subtitle="Boiling, degreasing and bleaching skulls"
      dept="cleaning_bleach"
      jobs={skullJobs}
      loading={loading}
      completing={completing}
      onRefresh={load}
      onAdvance={advance}
      steps={['1. Pressure wash skull', '2. Maceration or boil cycle', '3. Degrease with degreaser', '4. Whiten with peroxide / bleach', '5. Final inspection — mark complete']}
      stepsColor="amber"
      emptyIcon="skull"
      emptyText="No skulls currently in processing"
    />
  );
}
