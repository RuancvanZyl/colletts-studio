import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

export type HuntDocument = {
  id: string;
  hunt_id: string;
  doc_type: 'permit' | 'cites' | 'import_permit' | 'job_card' | 'receiving_sheet' | 'packing_list' | 'invoice' | 'other';
  title: string;
  dropbox_path: string | null;
  storage_path: string | null;
  form_data: Record<string, any> | null;
  status: 'pending' | 'complete' | 'missing';
  created_by: string | null;
  created_at: string;
};

export type ClientHunt = {
  id: string;
  client_id: string;
  year: string;
  ref_number: string;
  operator: string | null;
  ph: string | null;
  country: string | null;
  hunt_area: string | null;
  dropbox_path: string | null;
  status: 'active' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  documents: HuntDocument[];
};

const DOC_TYPES: HuntDocument['doc_type'][] = [
  'permit', 'cites', 'import_permit',
  'job_card', 'receiving_sheet', 'packing_list', 'invoice',
];

export function useClientHunts(clientId: string | null) {
  const [hunts, setHunts] = useState<ClientHunt[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  const load = useCallback(async () => {
    if (!clientId) { setHunts([]); return; }
    setLoading(true);

    const { data: huntRows, error } = await (supabase as any)
      .from('client_hunts')
      .select(`*, documents:hunt_documents(*)`)
      .eq('client_id', clientId)
      .order('year', { ascending: false });

    if (!error && huntRows) {
      setHunts(huntRows.map((h: any) => ({
        ...h,
        documents: h.documents ?? [],
      })));
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function addHunt(payload: Partial<ClientHunt>) {
    const { error } = await (supabase as any)
      .from('client_hunts')
      .insert({ ...payload, client_id: clientId });
    if (!error) load();
    return { error: error?.message ?? null };
  }

  async function addDocument(huntId: string, doc: Partial<HuntDocument>) {
    const { error } = await (supabase as any)
      .from('hunt_documents')
      .insert({ ...doc, hunt_id: huntId, created_by: profile?.id ?? null });
    if (!error) load();
    return { error: error?.message ?? null };
  }

  async function updateDocument(docId: string, patch: Partial<HuntDocument>) {
    const { error } = await (supabase as any)
      .from('hunt_documents')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', docId);
    if (!error) load();
    return { error: error?.message ?? null };
  }

  async function deleteDocument(docId: string) {
    await (supabase as any).from('hunt_documents').delete().eq('id', docId);
    load();
  }

  async function uploadDocFile(huntId: string, docType: HuntDocument['doc_type'], file: File) {
    const ext = file.name.split('.').pop();
    const path = `hunts/${huntId}/${docType}-${Date.now()}.${ext}`;
    const { error: upErr } = await (supabase as any).storage
      .from('client-photos')
      .upload(path, file, { upsert: false });
    if (upErr) return { error: upErr.message };

    return addDocument(huntId, {
      doc_type: docType,
      title: file.name,
      storage_path: path,
      status: 'complete',
    });
  }

  return { hunts, loading, refresh: load, addHunt, addDocument, updateDocument, deleteDocument, uploadDocFile };
}

export { DOC_TYPES };
