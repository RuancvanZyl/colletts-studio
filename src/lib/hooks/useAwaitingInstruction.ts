/**
 * useAwaitingInstruction — hunts where trophies have arrived but the client
 * hasn't told the workshop how to mount them ("WI" ref prefix, historically).
 * Tracks the 2-week reminder cadence so nobody goes silent unnoticed.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export interface AwaitingInstructionHunt {
  huntId:               string;
  clientId:             string;
  clientName:           string;
  clientEmail:          string | null;
  clientNumber:         string | null;
  refNumber:            string;
  year:                 string;
  instructionRequestedAt: string | null;
  lastReminderAt:       string | null;
  reminderCount:        number;
  daysSinceLastContact: number;
  reminderDue:          boolean;
}

export function useAwaitingInstruction() {
  const [hunts, setHunts]     = useState<AwaitingInstructionHunt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('v_awaiting_instruction')
      .select('*')
      .order('client_name', { ascending: true });

    setHunts((data ?? []).map((h: any) => ({
      huntId:                 h.hunt_id,
      clientId:               h.client_id,
      clientName:             h.client_name,
      clientEmail:            h.client_email,
      clientNumber:           h.client_number,
      refNumber:              h.ref_number,
      year:                   h.year,
      instructionRequestedAt: h.instruction_requested_at,
      lastReminderAt:         h.last_instruction_reminder_at,
      reminderCount:          h.instruction_reminder_count ?? 0,
      daysSinceLastContact:   h.days_since_last_contact ?? 0,
      reminderDue:            h.reminder_due,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const due = hunts.filter(h => h.reminderDue);

  return { hunts, loading, due, refresh: load };
}
