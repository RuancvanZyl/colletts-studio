/** The AI reader: asks the read-document function to read a scan. The workshop always confirms what it returns. */
import { supabase } from './supabase';

export interface AiRegister {
  header: Record<string, string | boolean | null>;
  lines: { farm_name: string | null; farm_reg_no: string | null; district: string | null; landowner: string | null; permit_no: string | null; date_killed: string | null; species: string | null; quantity: number | null; sex: string | null; parts: string[] }[];
  unsure: string[]; flags: string[];
}
export interface AiDocument {
  document_title: string | null; ph_name: string | null; ph_permit_no: string | null; ho_name: string | null; ho_permit_no: string | null; hunter_name: string | null;
  permit_numbers: string[]; dates: string[]; species: string[]; has_signature: boolean; has_stamp: boolean; unsure: string[]; flags: string[];
}

export async function readDocument(huntId: string, requirementId: string, kind: 'register' | 'other'): Promise<{ kind: 'register'; data: AiRegister } | { kind: 'other'; data: AiDocument }> {
  const { data, error } = await supabase.functions.invoke('read-document', { body: { hunt_id: huntId, requirement_id: requirementId, kind } });
  if (error) {
    let msg = error.message;
    try { const body = await (error as any).context?.json?.(); if (body?.error) msg = body.error; } catch { /* keep the generic message */ }
    if ((error as any).context?.status === 404 && !/document/i.test(msg)) msg = 'The AI reader is not set up yet. Ask for the setup steps.';
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
