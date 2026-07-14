import { useState } from 'react';
import { supabase, HAS_SUPABASE } from '../supabase';
import type { Gender, RegistrationSummary } from '../database.types';

export interface RegisterInput {
  eventId: string;
  categoryId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  club: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalNotes: string;
  waiverSigned: boolean;
}

export function useRegisterSwimmer() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register(input: RegisterInput) {
    setSubmitting(true);
    setError(null);
    if (!HAS_SUPABASE) {
      setSubmitting(false);
      setError('Backend not configured — registration cannot be saved yet.');
      return null;
    }
    const { data, error: rpcError } = await supabase.rpc('register_swimmer', {
      p_event_id: input.eventId,
      p_category_id: input.categoryId,
      p_full_name: input.fullName.trim(),
      p_email: input.email.trim().toLowerCase(),
      p_phone: input.phone.trim(),
      p_date_of_birth: input.dateOfBirth,
      p_gender: input.gender,
      p_club: input.club.trim() || null,
      p_emergency_contact_name: input.emergencyContactName.trim(),
      p_emergency_contact_phone: input.emergencyContactPhone.trim(),
      p_medical_notes: input.medicalNotes.trim() || null,
      p_waiver_signed: input.waiverSigned,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return null;
    }
    return data?.[0] ?? null;
  }

  return { register, submitting, error };
}

export async function fetchRegistrationSummary(registrationId: string): Promise<RegistrationSummary | null> {
  if (!HAS_SUPABASE) return null;
  const { data } = await supabase.rpc('get_registration_summary', { p_registration_id: registrationId });
  return data?.[0] ?? null;
}
