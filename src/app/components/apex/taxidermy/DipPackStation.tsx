import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';

export function DipPackStation() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('dip_pack');
  return (
    <DeptJobList
      title="Dip & Pack"
      subtitle="Treat skins for overseas shipment"
      dept="dip_pack"
      jobs={jobs}
      loading={loading}
      completing={completing}
      onRefresh={load}
      onAdvance={(job, photos, notes) => advance(job, photos, notes)}
      requirePhoto={true}
      steps={[
        '1. Rehydrate salted skin — 30–60 min in clean water',
        '2. Mix dip solution to correct concentration',
        '3. Submerge fully — minimum 20 minutes',
        '4. Drain, air dry on mesh rack',
        '5. Label with tag number and species — photograph',
        '6. Pack in export containers with moisture packs',
      ]}
      stepsColor="teal"
      emptyIcon="droplet"
      emptyText="No Dip & Pack jobs currently"
    />
  );
}
