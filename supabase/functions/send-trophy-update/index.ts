// Supabase Edge Function: send-trophy-update
// Deploy: supabase functions deploy send-trophy-update
// Called from the frontend when a trophy advances to a checkpoint stage.
// Body: { clientEmail, clientName, species, mountType, stage, huntYear, operator }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = 'onboarding@resend.dev';
const FROM_NAME      = 'Apex Trophy Solutions';

// Stages that trigger a client email
const CHECKPOINT_STAGES: Record<string, { subject: string; headline: string; detail: string; emoji: string }> = {
  receiving: {
    emoji:    '📦',
    subject:  'Your trophies have arrived at our workshop',
    headline: 'Trophies Received',
    detail:   'Your trophies have been received, inspected, and checked into our workshop. They are now in the production queue.',
  },
  tannery: {
    emoji:    '🧪',
    subject:  'Your trophies have entered the tannery',
    headline: 'Tannery Stage',
    detail:   'Your skins and capes are now being professionally tanned. This stage typically takes 2–3 weeks.',
  },
  mounting: {
    emoji:    '🦁',
    subject:  'Mounting has begun on your trophies',
    headline: 'Mounting Underway',
    detail:   'Our taxidermists have begun mounting your trophies. This is where the artistry happens.',
  },
  quality_check: {
    emoji:    '✅',
    subject:  'Your trophies have passed quality inspection',
    headline: 'Quality Check Passed',
    detail:   'Your trophies have been thoroughly inspected and have passed our quality control. They are now in the final stages.',
  },
  packing: {
    emoji:    '📫',
    subject:  'Your trophies are being packed for shipping',
    headline: 'Packing & Crating',
    detail:   'Your trophies are being carefully packed and crated for international shipment. We will be in touch with shipping details shortly.',
  },
  administration: {
    emoji:    '🎉',
    subject:  'Your trophies are ready — final paperwork in progress',
    headline: 'Ready for Dispatch',
    detail:   'All your trophies are complete. Our admin team is finalising the CITES permits and shipping documentation. We will contact you shortly to arrange delivery.',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const { clientEmail, clientName, species, mountType, stage, huntYear, operator } = await req.json();

    const checkpoint = CHECKPOINT_STAGES[stage];
    if (!checkpoint) {
      return new Response(JSON.stringify({ skipped: true, reason: 'stage not a checkpoint' }), { status: 200 });
    }
    if (!clientEmail || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing email or API key' }), { status: 400 });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #080C0C; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #3AAECC; margin: 0; font-size: 24px; letter-spacing: 4px;">APEX</h1>
          <p style="color: #7AADB8; margin: 4px 0 0; font-size: 11px; letter-spacing: 3px;">TROPHY SOLUTIONS</p>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 40px; text-align: center; margin-bottom: 16px;">${checkpoint.emoji}</div>
          <h2 style="color: #1a202c; margin: 0 0 8px; text-align: center;">${checkpoint.headline}</h2>
          <p style="color: #4a5568; line-height: 1.6; text-align: center; margin: 0 0 24px;">
            ${checkpoint.detail}
          </p>

          <div style="background: #EDF6F9; border-left: 4px solid #3AAECC; padding: 16px; margin: 0 0 24px; border-radius: 4px;">
            <p style="margin: 0; color: #2d5a6a; font-size: 14px; line-height: 1.8;">
              <strong>Client:</strong> ${clientName}<br/>
              ${species ? `<strong>Trophy:</strong> ${species}${mountType ? ` — ${mountType}` : ''}<br/>` : ''}
              ${huntYear ? `<strong>Hunt Year:</strong> ${huntYear}<br/>` : ''}
              ${operator ? `<strong>Operator/PH:</strong> ${operator}` : ''}
            </p>
          </div>

          <p style="color: #718096; font-size: 13px; text-align: center;">
            Questions? Contact us at <a href="mailto:info@apextrophysolutions.co.za" style="color: #3AAECC;">info@apextrophysolutions.co.za</a>
          </p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to:      [clientEmail],
        subject: `${checkpoint.emoji} ${checkpoint.subject}`,
        html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
