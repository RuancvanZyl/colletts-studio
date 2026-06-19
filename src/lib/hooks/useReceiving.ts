import { useState } from 'react';
import { supabase } from '../supabase';
import type { Database } from '../database.types';

type ReceivingBatchInsert = Database['public']['Tables']['receiving_batches']['Insert'];
type SpecimenInsert = Database['public']['Tables']['specimens']['Insert'];
type PartInsert = Database['public']['Tables']['parts']['Insert'];

export interface ReceivingItem {
  clientId: string;
  speciesId?: string;
  speciesName?: string;
  tagNumber: string;
  destination: 'local' | 'export';
  intakeCondition: string;
  mountTypeId?: string;
  instructions?: string;
  partTypes: string[];
  notes?: string;
  photoPath?: string;
}

export function useReceiving() {
  const [saving, setSaving] = useState(false);

  async function startBatch(input: ReceivingBatchInsert) {
    const { data, error } = await supabase.from('receiving_batches').insert(input).select().single();
    return { data, error: error?.message ?? null };
  }

  async function receiveItem(batchId: string, item: ReceivingItem, staffId: string) {
    setSaving(true);

    // Check for matching expected specimen (same client + species)
    const { data: existing } = await supabase
      .from('specimens')
      .select('id, jobs(id, current_phase)')
      .eq('client_id', item.clientId)
      .eq('status', 'expected')
      .eq(item.speciesId ? 'species_id' : 'species_name', item.speciesId ?? item.speciesName ?? '')
      .limit(5);

    let specimenId: string;

    if (existing && existing.length === 1) {
      // Auto-match single expected specimen
      const { error } = await supabase.from('specimens').update({
        tag_number: item.tagNumber,
        destination: item.destination,
        receiving_batch_id: batchId,
        intake_condition: item.intakeCondition,
        status: 'received',
        notes: item.notes ?? null,
      }).eq('id', existing[0].id);
      if (error) { setSaving(false); return { error: error.message }; }
      specimenId = existing[0].id;
    } else {
      // Create new specimen (either no match or multiple — caller handles disambiguation)
      const { data: specimen, error } = await supabase.from('specimens').insert({
        client_id: item.clientId,
        species_id: item.speciesId ?? null,
        species_name: item.speciesName ?? null,
        tag_number: item.tagNumber,
        destination: item.destination,
        receiving_batch_id: batchId,
        intake_condition: item.intakeCondition,
        status: 'received',
        notes: item.notes ?? null,
      } as SpecimenInsert).select().single();
      if (error) { setSaving(false); return { error: error.message }; }
      specimenId = specimen.id;
    }

    // Create job if mount type or instructions provided
    if (item.mountTypeId || item.instructions) {
      const { data: job, error: jobErr } = await supabase.from('jobs').insert({
        specimen_id: specimenId,
        mount_type_id: item.mountTypeId ?? null,
        instructions: item.instructions ?? null,
        instructions_received_at: item.instructions ? new Date().toISOString() : null,
        current_phase: 'intake',
      }).select().single();

      if (!jobErr && job) {
        // Open initial phase history row
        await supabase.from('job_phase_history').insert({
          job_id: job.id,
          phase: 'intake',
          staff_id: staffId,
        });

        // Create parts
        if (item.partTypes.length > 0) {
          const partRows: PartInsert[] = item.partTypes.map(pt => ({
            job_id: job.id,
            part_type: pt as any,
            current_phase: 'intake',
          }));
          await supabase.from('parts').insert(partRows);
        }
      }
    }

    // Attach photo if present
    if (item.photoPath) {
      await supabase.from('attachments').insert({
        entity_type: 'specimen',
        entity_id: specimenId,
        storage_path: item.photoPath,
        caption: 'Intake photo',
        uploaded_by: staffId,
      });
    }

    setSaving(false);
    return { error: null, specimenId };
  }

  async function uploadPhoto(file: File, specimenId: string): Promise<{ path: string | null; error: string | null }> {
    const ext = file.name.split('.').pop();
    const path = `specimens/${specimenId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('attachments').upload(path, file);
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  }

  return { startBatch, receiveItem, uploadPhoto, saving };
}
