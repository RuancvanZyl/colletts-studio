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
      const { data } = await (supabase.rpc as any)('global_search', { query: q });
      setResults((data ?? []) as SearchResult[]);
      setLoading(false);
    }, debounceMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  return { results, loading };
}
