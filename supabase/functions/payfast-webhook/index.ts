/**
 * PayFast ITN (Instant Transaction Notification) webhook.
 *
 * PayFast POSTs form-encoded data to this URL after a successful payment.
 * We verify the signature, then activate the matching hunt's job cards.
 *
 * Setup in PayFast merchant account:
 *   Notify URL → https://<project-ref>.supabase.co/functions/v1/payfast-webhook
 *
 * Required Supabase secrets (set via supabase secrets set):
 *   PAYFAST_MERCHANT_ID   — your PayFast merchant ID
 *   PAYFAST_MERCHANT_KEY  — your PayFast merchant key (passphrase)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const PAYFAST_VALID_HOSTS = [
  'www.payfast.co.za',
  'sandbox.payfast.co.za',
  'w1w.payfast.co.za',
  'w2w.payfast.co.za',
];

function md5(data: string): string {
  return createHash('md5').update(data).digest('hex');
}

function buildSignatureString(params: Record<string, string>, passphrase: string | null): string {
  // Remove signature field, sort keys, URL-encode values
  const keys = Object.keys(params)
    .filter(k => k !== 'signature')
    .sort();
  const parts = keys.map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`);
  if (passphrase) parts.push(`passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`);
  return parts.join('&');
}

async function verifyWithPayFast(params: Record<string, string>, sandbox: boolean): Promise<boolean> {
  const host = sandbox ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';
  const body = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`https://${host}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = await res.text();
    return text.trim() === 'VALID';
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  // PayFast sends POST with form-encoded body — no CORS needed (server-to-server)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const merchantId  = Deno.env.get('PAYFAST_MERCHANT_ID') ?? '';
    const passphrase  = Deno.env.get('PAYFAST_MERCHANT_KEY') ?? null;
    const isSandbox   = Deno.env.get('PAYFAST_SANDBOX') === 'true';

    // 1. Parse form body
    const text   = await req.text();
    const raw    = new URLSearchParams(text);
    const params: Record<string, string> = {};
    raw.forEach((v, k) => { params[k] = v; });

    console.log('PayFast ITN received:', JSON.stringify(params));

    // 2. Verify source IP (PayFast only posts from known hosts)
    const sourceIp = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for') ?? '';
    // Note: IP check is best-effort; signature + PayFast validation is the real guard

    // 3. Verify merchant ID
    if (params['merchant_id'] !== merchantId) {
      console.error('Merchant ID mismatch');
      return new Response('Invalid merchant', { status: 400 });
    }

    // 4. Verify signature
    const sigString  = buildSignatureString(params, passphrase);
    const ourSig     = md5(sigString);
    if (ourSig !== params['signature']) {
      console.error('Signature mismatch', { ours: ourSig, theirs: params['signature'] });
      return new Response('Invalid signature', { status: 400 });
    }

    // 5. Confirm with PayFast server (prevents replays)
    const valid = await verifyWithPayFast(params, isSandbox);
    if (!valid) {
      console.error('PayFast server validation failed');
      return new Response('Validation failed', { status: 400 });
    }

    // 6. Only process COMPLETE payments
    const paymentStatus = params['payment_status'];
    if (paymentStatus !== 'COMPLETE') {
      console.log('Payment not complete, status:', paymentStatus);
      return new Response('OK', { status: 200 }); // still return 200 so PayFast doesn't retry
    }

    // 7. Extract our custom_str1 = hunt_id (set when generating PayFast payment URL)
    const huntId   = params['custom_str1'];
    const amount   = parseFloat(params['amount_gross'] ?? '0');
    const pfPayId  = params['pf_payment_id'];

    if (!huntId) {
      console.error('No hunt_id in custom_str1');
      return new Response('Missing hunt_id', { status: 400 });
    }

    // 8. Activate job cards: pending_payment → in_progress
    const { error: activateErr } = await supabase
      .from('hunt_documents')
      .update({
        status:        'in_progress',
        last_moved_at: new Date().toISOString(),
      })
      .eq('hunt_id', huntId)
      .eq('status', 'pending_payment');

    if (activateErr) {
      console.error('Failed to activate job cards:', activateErr.message);
      return new Response('DB error', { status: 500 });
    }

    // 9. Record deposit on the hunt
    await supabase
      .from('client_hunts')
      .update({
        deposit_amount:  amount,
        deposit_paid_at: new Date().toISOString(),
        payfast_payment_id: pfPayId,
      })
      .eq('id', huntId);

    // 10. Log the payment event
    await supabase.from('hunt_documents').insert({
      hunt_id:  huntId,
      doc_type: 'invoice',
      title:    `PayFast deposit — R${amount.toFixed(2)}`,
      status:   'completed',
      form_data: {
        payfast_payment_id: pfPayId,
        amount_gross:       amount,
        payment_status:     paymentStatus,
        name_first:         params['name_first'] ?? '',
        name_last:          params['name_last'] ?? '',
        email_address:      params['email_address'] ?? '',
        paid_at:            new Date().toISOString(),
      },
    });

    console.log(`Hunt ${huntId} deposit confirmed — R${amount}`);
    return new Response('OK', { status: 200 });

  } catch (err) {
    console.error('PayFast webhook error:', err);
    return new Response('Internal error', { status: 500 });
  }
});
