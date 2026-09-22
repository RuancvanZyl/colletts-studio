// Supabase Edge Function: send-instruction-reminders
//
// Finds every hunt awaiting client instruction that hasn't been chased in
// 14+ days, emails the client a polite check-in, logs it to client_messages,
// and stamps last_instruction_reminder_at so it won't fire again for 2 weeks.
//
// Can be called two ways:
//  - Manually, from the app (a staff member clicks "Send Reminders Now")
//  - On a schedule, via Vercel Cron hitting this endpoint daily (fully automated)
//
// Deploy: supabase functions deploy send-instruction-reminders
// Requires env vars: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL      = 'onboarding@resend.dev';
const FROM_NAME       = 'Apex Trophy Solutions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function reminderHtml(firstName: string, refNumber: string) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#080C0C;padding:28px;text-align:center;">
          <p style="color:#3AAECC;font-size:20px;font-weight:bold;letter-spacing:2px;margin:0;">APEX TROPHY SOLUTIONS</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;color:#111;">Hi ${firstName},</p>
          <p style="font-size:15px;color:#333;line-height:1.6;">
            Your trophies (ref <strong>${refNumber}</strong>) are ready and waiting at our workshop —
            we just need to hear from you on how you'd like each one mounted before we can begin.
          </p>
          <p style="font-size:15px;color:#333;line-height:1.6;">
            If you could let us know your mounting preferences (shoulder, pedestal, full mount, euro, etc.
            for each trophy) whenever you have a moment, we'll get started right away.
          </p>
          <p style="font-size:15px;color:#333;line-height:1.6;">
            Just reply to this email, or log into your hunter portal to let us know.
          </p>
          <p style="font-size:15px;color:#333;margin-top:24px;">Kind regards,<br/>${FROM_NAME}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify the caller is an active staff member before sending anything.
    // A cron job calls this with the service-role key directly (bypasses this
    // check entirely, same as every other service-role call) — this check only
    // guards the path a logged-in app user goes through.
    const authHeader = req.headers.get('Authorization') ?? '';
    const isServiceRoleCall = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '\0');

    if (!isServiceRoleCall) {
      const callerClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await callerClient.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

      const { data: profile } = await callerClient.from('staff_profiles').select('is_active').eq('id', user.id).single();
      if (!profile?.is_active) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Optional: restrict to one hunt (manual "send now" button) via body { hunt_id }
    let targetHuntId: string | null = null;
    try {
      const body = await req.json();
      targetHuntId = body?.hunt_id ?? null;
    } catch { /* no body — process all due reminders */ }

    let query = adminClient
      .from('v_awaiting_instruction')
      .select('*');

    if (targetHuntId) {
      query = query.eq('hunt_id', targetHuntId);
    } else {
      query = query.eq('reminder_due', true);
    }

    const { data: due, error } = await query;
    if (error) throw error;

    const results: { hunt_id: string; client: string; sent: boolean; reason?: string }[] = [];

    for (const hunt of due ?? []) {
      if (!hunt.client_email) {
        results.push({ hunt_id: hunt.hunt_id, client: hunt.client_name, sent: false, reason: 'no email on file' });
        continue;
      }

      const firstName = hunt.client_name?.split(' ')[0] ?? 'there';
      let sent = false;

      if (RESEND_API_KEY) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: hunt.client_email,
            subject: `Your trophies are ready — we need your mounting instructions (${hunt.ref_number})`,
            html: reminderHtml(firstName, hunt.ref_number),
          }),
        });
        sent = res.ok;
      }

      // Log to client_messages regardless, so the check-in history is visible in-app
      await adminClient.from('client_messages').insert({
        client_id: hunt.client_id,
        hunt_id:   hunt.hunt_id,
        direction: 'outbound',
        channel:   'email',
        subject:   `Mounting instructions needed — ${hunt.ref_number}`,
        body:      `Automated 2-week check-in: trophies are waiting on mounting instructions from the client.`,
        status:    sent ? 'sent' : 'failed',
      });

      await adminClient.from('client_hunts').update({
        last_instruction_reminder_at: new Date().toISOString(),
        instruction_reminder_count: (hunt.instruction_reminder_count ?? 0) + 1,
      }).eq('id', hunt.hunt_id);

      results.push({ hunt_id: hunt.hunt_id, client: hunt.client_name, sent });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
