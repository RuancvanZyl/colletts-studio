import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';

/** Does this export client have a photo of their passport on file? (Local clients never need one.) */
export function useHunterPassport(clientId: string | undefined, needed: boolean) {
  const [has, setHas] = useState(true);          // assume yes until we know, so nobody sees a flash of "please add it"
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!clientId || !needed) { setHas(true); setLoading(false); return; }
    const { data, error } = await (supabase as any).from('client_documents').select('id').eq('client_id', clientId).eq('doc_type', 'passport').limit(1);
    setHas(error ? true : (data ?? []).length > 0);   // if the document list cannot be read yet, do not block anybody
    setLoading(false);
  }, [clientId, needed]);
  useEffect(() => { load(); }, [load]);
  return { has, loading, refresh: load };
}
