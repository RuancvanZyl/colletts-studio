import { useState } from 'react';
import { supabase } from '../supabase';
import type { JobPhase } from '../database.types';

export interface FoundJob {
  jobId: string;
  jobPhase: JobPhase;
  specimenTag: string | null;
  speciesName: string | null;
  clientName: string;
  mountType: string | null;
  dueDate: string | null;
  rush: boolean;
  parts: { id: string; partType: string; tagNumber: string | null; phase: string | null }[];
}

export function useJobLookup() {
  const [loading, setLoading] = useState(false);

  async function lookupByTag(tagNumber: string): Promise<{ data: FoundJob | null; error: string | null }> {
    if (!tagNumber.trim()) return { data: null, error: 'Enter a tag number' };
    setLoading(true);

    // Try specimen tag first
    const { data: specimen } = await supabase
      .from('specimens')
      .select(`
        id, tag_number, species_name,
        clients(full_name),
        species(common_name),
        jobs(
          id, current_phase, due_date, rush,
          mount_types(name),
          parts(id, part_type, tag_number, current_phase)
        )
      `)
      .eq('tag_number', tagNumber)
      .maybeSingle();

    if (specimen && specimen.jobs && specimen.jobs.length > 0) {
      const job = specimen.jobs[0] as any;
      setLoading(false);
      return {
        data: {
          jobId: job.id,
          jobPhase: job.current_phase,
          specimenTag: specimen.tag_number,
          speciesName: (specimen as any).species?.common_name ?? specimen.species_name,
          clientName: (specimen as any).clients?.full_name ?? 'Unknown',
          mountType: job.mount_types?.name ?? null,
          dueDate: job.due_date,
          rush: job.rush,
          parts: ((job.parts as any[]) ?? []).map((p: any) => ({
            id: p.id,
            partType: p.part_type,
            tagNumber: p.tag_number,
            phase: p.current_phase,
          })),
        },
        error: null,
      };
    }

    // Try part tag
    const { data: part } = await supabase
      .from('parts')
      .select(`
        id, part_type, tag_number, current_phase,
        jobs(
          id, current_phase, due_date, rush,
          mount_types(name),
          specimens(
            tag_number, species_name,
            clients(full_name),
            species(common_name)
          ),
          parts(id, part_type, tag_number, current_phase)
        )
      `)
      .eq('tag_number', tagNumber)
      .maybeSingle();

    if (part && (part as any).jobs) {
      const job = (part as any).jobs as any;
      const spec = job.specimens as any;
      setLoading(false);
      return {
        data: {
          jobId: job.id,
          jobPhase: job.current_phase,
          specimenTag: spec?.tag_number ?? null,
          speciesName: spec?.species?.common_name ?? spec?.species_name ?? null,
          clientName: spec?.clients?.full_name ?? 'Unknown',
          mountType: job.mount_types?.name ?? null,
          dueDate: job.due_date,
          rush: job.rush,
          parts: ((job.parts as any[]) ?? []).map((p: any) => ({
            id: p.id,
            partType: p.part_type,
            tagNumber: p.tag_number,
            phase: p.current_phase,
          })),
        },
        error: null,
      };
    }

    setLoading(false);
    return { data: null, error: `No job found for tag: ${tagNumber}` };
  }

  return { lookupByTag, loading };
}
