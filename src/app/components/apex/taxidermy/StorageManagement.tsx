import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';

export function StorageManagement() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('storage');

  return (
    <DeptJobList
      title="Storage"
      subtitle="Flat skins and items awaiting collection"
      dept="storage"
      jobs={jobs}
      loading={loading}
      completing={completing}
      onRefresh={load}
      onAdvance={advance}
      steps={['1. Confirm skin is dry and clean', '2. Label with client number and tag', '3. Store in designated rack / shelf', '4. Mark complete when ready for collection']}
      stepsColor="slate"
      emptyIcon="warehouse"
      emptyText="No items currently in storage"
    />
  );
}
