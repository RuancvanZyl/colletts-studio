// recommend-outcome: reads a rejected-skin case and its conversation and recommends one of three outcomes.
// A suggestion only: the tannery lead or management chooses. Staff only. Secrets: ANTHROPIC_API_KEY (and optionally DOC_AI_MODEL).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const tool = {
  name: 'recommend_outcome',
  description: 'Recommend what should happen to a rejected skin, based on the conversation between the outfitter and the workshop.',
  input_schema: {
    type: 'object',
    properties: {
      recommended_outcome: { type: ['string', 'null'], enum: ['outfitter_replacement', 'stock_replacement', 'client_decision', null] },
      reasoning: { type: 'string' },
      what_was_said: { type: 'array', items: { type: 'string' } },
      unclear: { type: 'array', items: { type: 'string' } },
      next_step: { type: 'string' },
    },
    required: ['recommended_outcome', 'reasoning', 'what_was_said', 'unclear', 'next_step'],
  },
};

const prompt = (c: string) => `A skin was rejected at the soak in a taxidermy workshop. Below are the case and everything the outfitter and the workshop said about it (messages in the app, plus conversations logged from WhatsApp or the phone).

There are exactly three possible outcomes:
1. outfitter_replacement: the outfitter supplies another skin.
2. stock_replacement: the workshop supplies a skin from its own stock.
3. client_decision: if neither of those can be done, the outfitter must tell the client, and the client then decides to change the order or scrap it. If the outfitter does not tell the client within 3 weeks, the workshop tells the client.

Recommend ONE outcome and explain why, using only what is in the case and the conversation. Rules:
- Do not invent facts, promises, stock or dates. If the conversation does not settle it, set recommended_outcome to null and say what is missing.
- "what_was_said": the key points of what each side said or agreed, in short plain sentences that say who said it.
- "unclear": anything that still needs to be settled before an outcome can be chosen.
- "next_step": one short practical sentence for the workshop.
- Prefer outfitter_replacement or stock_replacement when one of them was clearly offered or agreed. Use client_decision when both were ruled out, or the outfitter cannot or will not replace it and the workshop has no suitable stock.

THE CASE
${c}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Please sign in again' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: allowed } = await user.rpc('_can_accept', { p_dept: 'tannery' });
    if (!allowed) return json({ error: 'Only the tannery lead or management can use the AI recommendation' }, 403);

    const { case_id } = await req.json();
    const { data: c, error } = await user.from('quality_cases').select('*, doc:hunt_documents(form_data), hunt:client_hunts(clients(full_name)), outfitter:outfitters(name), soak:soak_reports(findings, holes, tannery_type, tannery_name, notes)').eq('id', case_id).single();
    if (error || !c) return json({ error: 'That case was not found' }, 404);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: msgs } = await admin.from('outfitter_messages').select('sender, sender_name, body, channel, created_at').eq('case_id', case_id).order('created_at');
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'The AI has no key yet. Add ANTHROPIC_API_KEY under Edge Functions, Secrets.' }, 500);

    const thread = (msgs ?? []).map((m: any) => `[${new Date(m.created_at).toISOString().slice(0, 16).replace('T', ' ')}] ${m.sender_name ?? m.sender}${m.channel === 'whatsapp' ? ' (WhatsApp)' : ''}: ${m.body}`).join('\n');
    const text = [
      `Animal: ${c.doc?.form_data?.species ?? 'unknown'} (${c.doc?.form_data?.mount_type ?? 'mount not chosen'})`,
      `Client: ${c.hunt?.clients?.full_name ?? 'unknown'}`, `Outfitter: ${c.outfitter?.name ?? 'none'}`,
      `Rejected for: ${(c.reasons ?? []).join(', ')}${c.note ? `. Note: ${c.note}` : ''}`,
      c.soak ? `Soak report (${c.soak.tannery_type === 'third_party' ? `third party: ${c.soak.tannery_name}` : 'in-house'}): ${JSON.stringify(c.soak.findings)}, holes: ${c.soak.holes ?? 'n/a'}${c.soak.notes ? `, notes: ${c.soak.notes}` : ''}` : '',
      `Outfitter acknowledged: ${c.outfitter_ack_at ? 'yes' : 'not yet'}`,
      '', 'CONVERSATION:', thread || '(nothing has been said yet)',
    ].filter(Boolean).join('\n');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('DOC_AI_MODEL') ?? 'claude-sonnet-5-5', max_tokens: 2000,
        tools: [tool], tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content: prompt(text) }],
      }),
    });
    const out = await res.json();
    if (!res.ok) return json({ error: 'The AI service said: ' + (out?.error?.message ?? res.status) }, 502);
    const call = (out.content ?? []).find((x: { type: string }) => x.type === 'tool_use');
    if (!call) return json({ error: 'The AI did not return a recommendation' }, 502);
    return json({ data: call.input });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
