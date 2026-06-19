import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Database, JobPhase } from '../database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];

export type JobWithRelations = Job & {
  specimens: {
    id: string;
    tag_number: string | null;
    species_name: string | null;
    status: string;
    clients: { full_name: string } | null;
    species: { common_name: string } | null;
  } | null;
  mount_types: { name: string } | null;
  departments: { name: string } | null;
  parts: { id: string; part_type: string; tag_number: string | null; current_phase: string | null }[];
};

export function useJobs(phase?: JobPhase) {
  const [jobs, setJobs] = useState<JobWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select(`
        *,
        specimens(
          id, tag_number, species_name, status,
          clients(full_name),
          species(common_name)
        ),
        mount_types(name),
        departments(name),
        parts(id, part_type, tag_number, current_phase)
      `)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (phase) query = query.eq('current_phase', phase);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setJobs((data ?? []) as JobWithRelations[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [phase]);

  async function createJob(input: JobInsert) {
    const { data, error } = await supabase.from('jobs').insert(input).select().single();
    if (error) return { error: error.message, data: null };
    await load();
    return { data, error: null };
  }

  async function advancePhase(jobId: string, nextPhase: JobPhase, staffId: string, proof: { comment?: string; attachment_id?: string }) {
    // Require either a comment or attachment
    if (!proof.comment && !proof.attachment_id) {
      return { error: 'A photo or comment is required before advancing.' };
    }

    // Get current job to record phase exit
    const { data: job } = await supabase.from('jobs').select('current_phase').eq('id', jobId).single();
    if (!job) return { error: 'Job not found' };

    // Write checkpoint
    const { error: cpError } = await supabase.from('phase_checkpoints').insert({
      job_id: jobId,
      phase: job.current_phase as JobPhase,
      staff_id: staffId,
      comment: proof.comment ?? null,
      attachment_id: proof.attachment_id ?? null,
    });
    if (cpError) return { error: cpError.message };

    // Close phase history row
    await supabase
      .from('job_phase_history')
      .update({ exited_at: new Date().toISOString() })
      .eq('job_id', jobId)
      .eq('phase', job.current_phase)
      .is('exited_at', null);

    // Open new phase history row
    await supabase.from('job_phase_history').insert({
      job_id: jobId,
      phase: nextPhase,
      staff_id: staffId,
    });

    // Advance the job
    const { error: jobError } = await supabase
      .from('jobs')
      .update({ current_phase: nextPhase })
      .eq('id', jobId);
    if (jobError) return { error: jobError.message };

    // End any active work session for this job
    await supabase
      .from('work_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('job_id', jobId)
      .is('ended_at', null);

    await load();
    return { error: null };
  }

  async function startWork(jobId: string, staffId: string, departmentId: string) {
    // End any other active session for this staff member first
    await supabase
      .from('work_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('staff_id', staffId)
      .is('ended_at', null);

    const { error } = await supabase.from('work_sessions').insert({
      job_id: jobId,
      staff_id: staffId,
      department_id: departmentId,
    });
    return { error: error?.message ?? null };
  }

  return { jobs, loading, error, createJob, advancePhase, startWork, refresh: load };
}
