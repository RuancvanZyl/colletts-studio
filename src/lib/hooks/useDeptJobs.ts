import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { getNextDepartment } from '../pipeline';
import { useAuth } from '../auth';
import { toast } from 'sonner';

export interface DeptJob {
  docId: string;
  huntId: string;
  clientName: string;
  clientNumber: string;
  species: string;
  mountType: string;
  tagNumber: string;
  condition: string;
  conditionNotes: string;
  instructions: string;
  currentDept: string;
  status: string;
  receivedAt: string;
  stageHistory: { dept: string; completedBy: string; completedAt: string }[];
}

export function useDeptJobs(dept: string | string[]) {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<DeptJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const depts = Array.isArray(dept) ? dept : [dept];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: docs, error } = await (supabase as any)
        .from('hunt_documents')
        .select('id, hunt_id, current_department, status, form_data')
        .eq('doc_type', 'job_card')
        .in('current_department', depts)
        .neq('status', 'complete');

      if (error) throw error;

      const result: DeptJob[] = [];
      for (const doc of docs ?? []) {
        const { data: hunt } = await (supabase as any)
          .from('client_hunts').select('client_id').eq('id', doc.hunt_id).single();
        const { data: client } = hunt
          ? await (supabase as any).from('clients').select('full_name, client_number').eq('id', hunt.client_id).single()
          : { data: null };

        const fd = doc.form_data ?? {};
        result.push({
          docId:          doc.id,
          huntId:         doc.hunt_id,
          clientName:     client?.full_name ?? 'Unknown',
          clientNumber:   client?.client_number ?? '',
          species:        fd.species ?? '',
          mountType:      fd.mount_type ?? '',
          tagNumber:      fd.tag_number ?? '',
          condition:      fd.condition ?? '',
          conditionNotes: fd.condition_notes ?? '',
          instructions:   fd.instructions ?? '',
          currentDept:    doc.current_department,
          status:         doc.status,
          receivedAt:     fd.received_at ?? '',
          stageHistory:   fd.stage_history ?? [],
        });
      }
      setJobs(result);
    } catch (err: any) {
      toast.error('Failed to load: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [depts.join(',')]);

  useEffect(() => { load(); }, [load]);

  async function advance(job: DeptJob, overrideNext?: string) {
    setCompleting(job.docId);
    try {
      const next = overrideNext ?? getNextDepartment(job.mountType, job.currentDept);
      const newHistory = [
        ...job.stageHistory,
        { dept: job.currentDept, completedBy: profile?.full_name ?? 'Staff', completedAt: new Date().toISOString() },
      ];

      const { data: doc } = await (supabase as any)
        .from('hunt_documents').select('form_data').eq('id', job.docId).single();

      const { error } = await (supabase as any).from('hunt_documents').update({
        current_department: next ?? 'done',
        status: next ? 'in_progress' : 'complete',
        form_data: { ...(doc?.form_data ?? {}), stage_history: newHistory },
      }).eq('id', job.docId);

      if (error) throw error;

      setJobs(prev => prev.filter(j => j.docId !== job.docId));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    } finally {
      setCompleting(null);
    }
  }

  return { jobs, loading, completing, load, advance };
}
