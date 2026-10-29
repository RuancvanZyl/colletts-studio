/**
 * useGlobalSearch — the search box at the top of the staff screens. Finds hunters (name, e-mail, phone, hunter number)
 * and animals (species or tag number), and says which hunter an animal belongs to and where it is now.
 */
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { DEPT_LABELS } from '../pipeline';

export interface SearchResult {
  result_type: 'client' | 'animal';
  result_id: string;
  label: string;
  sub_label: string;
  /** the screen to open and the hunter to open it on */
  nav_hint: string;
  nav_id?: string;
}

export function useGlobalSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // characters that have a meaning inside a search filter are replaced by spaces
    const q = query.trim().replace(/[,()%*\\]/g, ' ').trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const db = supabase as any;
      const [clientRes, animalRes] = await Promise.all([
        db.from('clients')
          .select('id, full_name, email, phone, client_number, country')
          .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,client_number.ilike.%${q}%`)
          .limit(6),
        db.from('hunt_documents')
          .select('id, hunt_id, current_department, status, form_data, client_hunts(client_id, clients(full_name, client_number))')
          .eq('doc_type', 'job_card')
          .or(`form_data->>species.ilike.%${q}%,form_data->>tag_number.ilike.%${q}%`)
          .limit(8),
      ]);

      const out: SearchResult[] = [];
      for (const c of (clientRes.data ?? []) as any[]) {
        out.push({
          result_type: 'client',
          result_id: c.id,
          label: c.full_name,
          sub_label: [c.client_number, c.email, c.phone].filter(Boolean).join(' · '),
          nav_hint: 'clients',
          nav_id: c.id,
        });
      }
      for (const d of (animalRes.data ?? []) as any[]) {
        const fd = d.form_data ?? {};
        const owner = d.client_hunts?.clients;
        const where = d.status === 'completed' ? 'Finished' : d.status === 'awaiting_arrival' ? 'On its way' : (DEPT_LABELS[d.current_department] ?? d.current_department ?? '');
        out.push({
          result_type: 'animal',
          result_id: d.id,
          label: `${fd.species ?? 'Animal'}${fd.tag_number ? ` · tag ${fd.tag_number}` : ''}`,
          sub_label: [owner?.full_name, where].filter(Boolean).join(' · '),
          nav_hint: 'clients',
          nav_id: d.client_hunts?.client_id,
        });
      }

      setResults(out);
      setLoading(false);
    }, debounceMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  return { results, loading };
}
