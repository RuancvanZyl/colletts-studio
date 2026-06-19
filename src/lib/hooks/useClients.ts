import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*, outfitters(name)')
      .order('full_name');
    if (error) setError(error.message);
    else setClients(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createClient(input: ClientInsert) {
    const { data, error } = await supabase.from('clients').insert(input).select().single();
    if (error) return { error: error.message, data: null };
    setClients(prev => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    return { data, error: null };
  }

  async function updateClient(id: string, input: Partial<ClientInsert>) {
    const { data, error } = await supabase.from('clients').update(input).eq('id', id).select().single();
    if (error) return { error: error.message, data: null };
    setClients(prev => prev.map(c => c.id === id ? data : c));
    return { data, error: null };
  }

  return { clients, loading, error, createClient, updateClient, refresh: load };
}
