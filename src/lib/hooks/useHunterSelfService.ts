/**
 * useHunterSelfService — write-path for hunter self-registration.
 * Creates clients, client_hunts, and hunt_documents (job cards).
 */

import { supabase } from '../supabase';

export interface HuntDetails {
  clientType: 'local' | 'export';
  year: number;
  operator: string;      // PH / outfitter name
  farm: string;
  country: string;
  notes: string;
}

export interface TrophyEntry {
  species: string;
  mountType: string;
  quantity: number;
  instructions: string;
  extras: string[];      // e.g. ['leather cushion', 'European skull mount']
}

export async function createClientRecord(
  authUserId: string,
  fullName: string,
  email: string,
  phone: string,
  clientType: 'local' | 'export',
) {
  // Check if client already exists
  const { data: existing } = await (supabase as any)
    .from('clients')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (existing) return { data: existing, error: null };

  const { data, error } = await (supabase as any)
    .from('clients')
    .insert({
      auth_user_id:   authUserId,
      full_name:      fullName,
      email,
      phone:          phone || null,
      client_type:    clientType,
      onboarding_status: 'in_progress',
    })
    .select('id, full_name, client_type')
    .single();

  return { data, error };
}

export async function createHunt(clientId: string, details: HuntDetails) {
  const refNumber = `SELF-${details.year}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data, error } = await (supabase as any)
    .from('client_hunts')
    .insert({
      client_id:    clientId,
      year:         details.year.toString(),
      ref_number:   refNumber,
      operator:     details.operator || null,
      farm:         details.farm || null,
      country:      details.country || null,
      notes:        details.notes || null,
      client_type:  details.clientType,
      process_type: details.clientType === 'local' ? 'local' : 'export',
    })
    .select('id, ref_number')
    .single();

  return { data, error };
}

export async function addTrophyToHunt(huntId: string, trophy: TrophyEntry) {
  const extrasNote = trophy.extras.length > 0
    ? `\nExtras: ${trophy.extras.join(', ')}`
    : '';

  const { data, error } = await (supabase as any)
    .from('hunt_documents')
    .insert({
      hunt_id:  huntId,
      doc_type: 'job_card',
      title:    `${trophy.species} — ${trophy.mountType}`,
      status:   'pending_payment',
      form_data: {
        species:     trophy.species,
        mount_type:  trophy.mountType,
        quantity:    trophy.quantity,
        instructions: trophy.instructions + extrasNote,
        extras:      trophy.extras,
        submitted_by_hunter: true,
      },
    })
    .select('id')
    .single();

  return { data, error };
}

export async function notifyAdminOfNewHunt(
  supabaseUrl: string,
  anonKey: string,
  payload: {
    clientName: string;
    clientEmail: string;
    huntYear: number;
    operator: string;
    trophyCount: number;
    clientType: string;
  },
) {
  fetch(`${supabaseUrl}/functions/v1/notify-admin-new-hunt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
