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
  lastMovedAt: string | null;
  stageHistory: { dept: string; completedBy: string; completedAt: string; photoPaths?: string[]; notes?: string }[];
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
        .select('id, hunt_id, current_department, status, form_data, last_moved_at')
        .eq('doc_type', 'job_card')
        .in('current_department', depts)
        .eq('status', 'in_progress')
        .order('last_moved_at', { ascending: true }); // oldest first = most urgent first

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
          receivedAt:     fd.received_at ?? doc.last_moved_at ?? '',
          lastMovedAt:    doc.last_moved_at ?? null,
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

  // advance now accepts completion photos and notes
  async function advance(job: DeptJob, photos: string[] = [], notes: string = '') {
    setCompleting(job.docId);
    try {
      const next = getNextDepartment(job.mountType, job.currentDept);
      const historyEntry = {
        dept:         job.currentDept,
        completedBy:  profile?.full_name ?? 'Staff',
        completedAt:  new Date().toISOString(),
        photoPaths:   photos,
        notes,
      };
      const newHistory = [...job.stageHistory, historyEntry];

      const { data: doc } = await (supabase as any)
        .from('hunt_documents').select('form_data').eq('id', job.docId).single();

      const { error } = await (supabase as any).from('hunt_documents').update({
        current_department:       next ?? 'done',
        status:                   next ? 'in_progress' : 'completed',
        completion_photo_paths:   photos,
        completion_notes:         notes || null,
        completed_by_name:        profile?.full_name ?? null,
        form_data: { ...(doc?.form_data ?? {}), stage_history: newHistory },
      }).eq('id', job.docId);

      if (error) throw error;

      // Also write to trophy_stage_history table
      await (supabase as any).from('trophy_stage_history').insert({
        hunt_doc_id:      job.docId,
        department:       job.currentDept,
        completed_by:     profile?.id ?? null,
        completed_by_name: profile?.full_name ?? null,
        photo_paths:      photos,
        notes:            notes || null,
      });

      // Write in-app notification for checkpoint stages (non-blocking)
      const CHECKPOINT_STAGES = new Set(['receiving','tannery','mounting','quality_check','packing','administration']);
      if (next && CHECKPOINT_STAGES.has(next)) {
        fireNotification(job, next).catch(() => {/* non-fatal */});
      }

      setJobs(prev => prev.filter(j => j.docId !== job.docId));
      return { error: null };
    } catch (err: any) {
      return { error: (err as Error).message };
    } finally {
      setCompleting(null);
    }
  }

  async function fireNotification(job: DeptJob, stage: string) {
    const { data: hunt } = await (supabase as any)
      .from('client_hunts').select('client_id').eq('id', job.huntId).single();
    if (!hunt?.client_id) return;

    const STAGE_COPY: Record<string, { title: string; body: string; type: string }> = {
      receiving:     { type: 'update',    title: 'Trophies received at workshop',        body: 'Your trophies have been checked in and are in the production queue.' },
      tannery:       { type: 'update',    title: 'Tannery stage started',               body: 'Your skins and capes have entered the tannery. This typically takes 2–3 weeks.' },
      mounting:      { type: 'milestone', title: 'Mounting has begun',                  body: 'Our taxidermists have started mounting your trophy. The artistry is underway.' },
      quality_check: { type: 'milestone', title: 'Passed quality inspection ✓',         body: 'Your trophy has been thoroughly inspected and passed our quality control.' },
      packing:       { type: 'milestone', title: 'Being packed for shipment',           body: 'Your trophy is being carefully packed and crated for transport.' },
      administration:{ type: 'ready',     title: '🎉 Your trophy is complete!',         body: 'All done — admin is finalising your paperwork. We will be in touch shortly to arrange delivery.' },
    };

    const copy = STAGE_COPY[stage];
    if (!copy) return;

    const label = job.species ? `${job.species}${job.mountType ? ` — ${job.mountType}` : ''}` : undefined;

    await (supabase as any).from('client_notifications').insert({
      client_id:   hunt.client_id,
      hunt_doc_id: job.docId,
      hunt_id:     job.huntId,
      type:        copy.type,
      stage,
      title:       label ? `${copy.title} · ${label}` : copy.title,
      body:        copy.body,
      species:     job.species || null,
      mount_type:  job.mountType || null,
    });
  }

  return { jobs, loading, completing, load, advance };
}
