import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Specimen = Database['public']['Tables']['specimens']['Row'];
type SpecimenInsert = Database['public']['Tables']['specimens']['Insert'];

export type SpecimenWithRelations = Specimen & {
  clients: { full_name: string } | null;
  species: { common_name: string } | null;
  outfitters: { name: string } | null;
  jobs: { id: string; current_phase: string; mount_type_id: string | null }[];
};

export function useSpecimens(clientId?: string) {
  const [specimens, setSpecimens] = useState<SpecimenWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let query = supabase
      .from('specimens')
      .select(`
        *,
        clients(full_name),
        species(common_name),
        outfitters(name),
        jobs(id, current_phase, mount_type_id)
      `)
      .order('created_at', { ascending: false });

    if (clientId) query = query.eq('client_id', clientId);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setSpecimens((data ?? []) as SpecimenWithRelations[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [clientId]);

  async function createSpecimen(input: SpecimenInsert) {
    const { data, error } = await supabase.from('specimens').insert(input).select().single();
    if (error) return { error: error.message, data: null };
    await load();
    return { data, error: null };
  }

  async function receiveSpecimen(id: string, updates: Partial<SpecimenInsert>) {
    const { data, error } = await supabase
      .from('specimens')
      .update({ ...updates, status: 'received' })
      .eq('id', id)
      .select()
      .single();
    if (error) return { error: error.message, data: null };
    await load();
    return { data, error: null };
  }

  return { specimens, loading, error, createSpecimen, receiveSpecimen, refresh: load };
}
