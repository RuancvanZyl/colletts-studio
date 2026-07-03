import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';

export function TanneryStation() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('tannery');
  return (
    <DeptJobList
      jobs={jobs} loading={loading} completing={completing}
      onRefresh={load} onAdvance={advance}
      dept="tannery"
      title="Tannery"
      subtitle="Skins currently in the tanning process"
      steps={[
        '1. Check skins are properly salted and drained before processing',
        '2. Mix tanning solution to correct concentration',
        '3. Submerge skins — ensure full coverage',
        '4. Monitor for required soak duration (species-dependent)',
        '5. Remove, rinse, and hang to dry before advancing',
      ]}
      stepsColor="amber"
      emptyIcon="warehouse"
      emptyText="No skins currently in tannery"
    />
  );
}
