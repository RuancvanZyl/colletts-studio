/**
 * ClientPortalAccess — on a hunter's profile: have they created their portal profile, and send the link.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { InvitePanel } from './InvitePanel';
import { printDropOffPapers } from '../../../../lib/print';
import { WORKSHOP } from '../../../../lib/workshop';
import { CONDITIONS } from '../../../../lib/received';

export function ClientPortalAccess({ client }: { client: { id: string; full_name: string; email: string | null; phone: string | null; client_number?: string | null; auth_user_id?: string | null } }) {
  const [animals, setAnimals] = useState<{ species: string; tag: string; condition: string; parts: string[]; other: string }[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: hunts } = await (supabase as any).from('client_hunts').select('id').eq('client_id', client.id);
      const ids = (hunts ?? []).map((h: any) => h.id);
      if (!ids.length) { setAnimals([]); return; }
      const { data } = await (supabase as any).from('hunt_documents').select('form_data, status, current_department')
        .in('hunt_id', ids).eq('doc_type', 'job_card').in('status', ['in_progress', 'pending']).eq('current_department', 'receiving').limit(40);
      setAnimals((data ?? []).map((d: any) => ({
        species: d.form_data?.species ?? 'Animal', tag: d.form_data?.tag_number ?? '', condition: d.form_data?.condition ?? '',
        parts: (d.form_data?.received_parts ?? []).map((p: any) => p.code), other: d.form_data?.received_other ?? '',
      })));
    })();
  }, [client.id]);

  if (!animals) return null;
  return (
    <InvitePanel
      target={{ clientId: client.id, name: client.full_name, email: client.email, phone: client.phone, registered: !!client.auth_user_id, animals }}
      onPrintLetter={url => printDropOffPapers({
        clientName: client.full_name, clientNumber: client.client_number ?? null, workshop: WORKSHOP, inviteLink: client.auth_user_id ? null : url,
        animals: animals.map(a => ({ ...a, condition: CONDITIONS.find(c => c.value === a.condition)?.label ?? a.condition, notes: '' })),
      }, { sheet: false, letter: true })}
    />
  );
}
