import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { useAuth } from '../auth';

type Client = Database['public']['Tables']['clients']['Row'];
type Specimen = Database['public']['Tables']['specimens']['Row'] & {
  species: { common_name: string } | null;
  jobs: {
    id: string;
    current_phase: string;
    mount_type_id: string | null;
    mount_types: { name: string } | null;
    rush: boolean;
    due_date: string | null;
  }[];
};

export function useHunterClient() {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadClient() {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    // Find client record by auth_user_id
    const { data, error: err } = await (supabase
      .from('clients')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle() as any) as { data: Client | null; error: any };

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    if (data) {
      setClient(data);
      await loadSpecimens(data.id);
      setLoading(false);
      return;
    }

    // No client linked by auth_user_id — try to find one by email and auto-link
    if (user.email) {
      const { data: byEmail } = await (supabase as any)
        .from('clients')
        .select('*')
        .ilike('email', user.email)
        .is('auth_user_id', null)
        .maybeSingle();

      if (byEmail) {
        await (supabase as any)
          .from('clients')
          .update({ auth_user_id: user.id })
          .eq('id', byEmail.id);
        setClient({ ...byEmail, auth_user_id: user.id });
        await loadSpecimens(byEmail.id);
        setLoading(false);
        return;
      }
    }

    // Auto-create client record using SECURITY DEFINER function (bypasses RLS)
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hunter';
    const { data: newId } = await (supabase.rpc as any)('get_or_create_hunter_client', {
      p_full_name: fullName,
      p_email: user.email ?? null,
      p_phone: user.user_metadata?.phone ?? null,
    });

    if (newId) {
      const { data: created } = await (supabase as any)
        .from('clients')
        .select('*')
        .eq('id', newId)
        .maybeSingle();
      setClient(created ?? null);
    } else {
      setClient(null);
    }
    setLoading(false);
  }

  async function loadSpecimens(clientId: string) {
    const { data } = await supabase
      .from('specimens')
      .select(`
        *,
        species(common_name),
        jobs(
          id, current_phase, mount_type_id, rush, due_date,
          mount_types(name)
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setSpecimens((data ?? []) as Specimen[]);
  }

  async function ensureClient() {
    if (!user) return null;
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hunter';
    const { data } = await (supabase.rpc as any)('get_or_create_hunter_client', {
      p_full_name: fullName,
      p_email: user.email ?? null,
      p_phone: user.user_metadata?.phone ?? null,
    });
    // data is the client uuid
    await loadClient();
    return data as string | null;
  }

  async function addTrophy(input: {
    species_name: string;
    species_id?: string;
    hunt_date?: string;
    hunt_location?: string;
    destination?: 'local' | 'export';
    notes?: string;
    outfitter_id?: string;
  }) {
    if (!client) return { error: 'No client record found', data: null };
    const { data, error } = await supabase
      .from('specimens')
      .insert({
        client_id: client.id,
        species_name: input.species_name ?? null,
        species_id: input.species_id ?? null,
        hunt_date: input.hunt_date ?? null,
        hunt_location: input.hunt_location ?? null,
        destination: input.destination ?? 'export',
        notes: input.notes ?? null,
        outfitter_id: input.outfitter_id ?? null,
        status: 'expected' as const,
      } as any)
      .select()
      .single();
    if (error) return { error: error.message, data: null };
    await loadSpecimens(client.id);
    return { data, error: null };
  }

  async function updateProfile(updates: Partial<Pick<Client, 'full_name' | 'phone' | 'address' | 'country' | 'nationality' | 'passport_number' | 'passport_expiry'>>) {
    if (!client) return { error: 'No client record' };
    const { error } = await (supabase.from as any)('clients').update(updates).eq('id', client.id);
    if (!error) setClient(prev => prev ? { ...prev, ...updates } : prev);
    return { error: error?.message ?? null };
  }

  useEffect(() => { loadClient(); }, [user?.id]);

  const displayName = client?.full_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Hunter';

  return { client, specimens, loading, error, displayName, ensureClient, addTrophy, updateProfile, refresh: loadClient };
}
