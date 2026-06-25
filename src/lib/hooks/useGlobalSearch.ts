import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

export interface SearchResult {
  result_type: 'client' | 'specimen' | 'job';
  result_id: string;
  label: string;
  sub_label: string;
  nav_hint: string;
}

export function useGlobalSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      // Search clients, specimens, and jobs in parallel using direct queries
      const [clientRes, specimenRes, jobRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, full_name, email, phone, country')
          .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,country.ilike.%${q}%`)
          .limit(5),

        supabase
          .from('specimens')
          .select('id, tag_number, species_name, clients(full_name)')
          .or(`tag_number.ilike.%${q}%,species_name.ilike.%${q}%`)
          .limit(5),

        supabase
          .from('specimens')
          .select('id, tag_number, species_name, jobs(id, current_phase)')
          .ilike('clients.full_name', `%${q}%`)
          .not('jobs', 'is', null)
          .limit(5),
      ]);

      const out: SearchResult[] = [];

      for (const c of (clientRes.data ?? [])) {
        out.push({
          result_type: 'client',
          result_id: c.id,
          label: c.full_name,
          sub_label: [c.email, c.country].filter(Boolean).join(' · '),
          nav_hint: 'clients',
        });
      }

      for (const s of (specimenRes.data ?? [])) {
        const client = (s as any).clients;
        out.push({
          result_type: 'specimen',
          result_id: s.id,
          label: s.tag_number ?? s.species_name ?? 'Specimen',
          sub_label: [s.species_name, client?.full_name].filter(Boolean).join(' · '),
          nav_hint: 'arrival',
        });
      }

      setResults(out);
      setLoading(false);
    }, debounceMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  return { results, loading };
}
