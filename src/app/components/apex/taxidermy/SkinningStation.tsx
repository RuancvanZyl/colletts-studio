import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DeptJobList } from '../shared/DeptJobList';
import { Sparkles } from 'lucide-react';

export function SkinningStation() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('skinning');
  return (
    <div className="space-y-4">
      {/* Back skin reminder — shown whenever there are jobs at skinning */}
      {jobs.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl px-4 py-3 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Remind: Ask about back skin & leftover hide
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Before advancing — message the client via <strong>Client Messages</strong> to ask what they want done with the back skin and any leftover hide. Options: flat skin, rug mount, biltong bag, knife sheath, hat band.
            </p>
          </div>
        </div>
      )}
      <DeptJobList
      title="Skinning Station"
      subtitle="Skin and flesh trophies before salting"
      dept="skinning"
      jobs={jobs}
      loading={loading}
      completing={completing}
      onRefresh={load}
      onAdvance={(job, photos, notes) => advance(job, photos, notes)}
      requirePhoto={true}
      steps={[
        '1. Photograph trophy before skinning',
        '2. Make correct incision for mount type',
        '3. Skin carefully around face — eyes, ears, lips',
        '4. Remove all flesh and membrane',
        '5. Label skull and skin with tag number',
      ]}
      stepsColor="rose"
      emptyIcon="scissors"
      emptyText="No trophies currently at skinning"
    />
    </div>
  );
}
