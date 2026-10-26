// read-document: the AI reader. Reads the scan or photo of a hunt document and returns what is written on it.
// Staff only. The app compares what comes back with everything else and the workshop confirms every field.
// Secrets needed: ANTHROPIC_API_KEY (set under Edge Functions > Secrets). Optional: DOC_AI_MODEL.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const str = { type: ['string', 'null'] };
const PROVINCES = ['Limpopo', 'Mpumalanga', 'Free State', 'North West', 'KwaZulu-Natal', 'Northern Cape', 'Eastern Cape', 'Western Cape', 'Gauteng'];
const PARTS = ['SKULL', 'CAPE', 'BSKIN', 'FLATSKIN', 'FSKIN', 'FEET', 'LEGBONES', 'SCROTUM', 'TAIL', 'TUSKS', 'PANEL', 'OTHER'];

const registerTool = {
  name: 'record_register',
  description: 'Record what is written on a South African Professional Hunting Register and Trophy Export Application.',
  input_schema: {
    type: 'object',
    properties: {
      header: {
        type: 'object',
        properties: {
          register_no: str, province: { type: ['string', 'null'], enum: [...PROVINCES, null] },
          commenced: str, terminated: str,
          ph_name: str, ph_permit_no: str, ph_signed: { type: 'boolean' },
          client_name: str, client_passport_no: str, client_signed: { type: 'boolean' },
          ho_name: str, ho_permit_no: str, ho_signed: { type: 'boolean' },
        },
        required: ['register_no', 'province', 'commenced', 'terminated', 'ph_name', 'ph_permit_no', 'ph_signed', 'client_name', 'client_passport_no', 'client_signed', 'ho_name', 'ho_permit_no', 'ho_signed'],
      },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            farm_name: str, farm_reg_no: str, district: str, landowner: str, permit_no: str, date_killed: str, species: str,
            quantity: { type: ['integer', 'null'] }, sex: { type: ['string', 'null'], enum: ['M', 'F', null] },
            parts: { type: 'array', items: { type: 'string', enum: PARTS } },
          },
          required: ['farm_name', 'farm_reg_no', 'district', 'landowner', 'permit_no', 'date_killed', 'species', 'quantity', 'sex', 'parts'],
        },
      },
      unsure: { type: 'array', items: { type: 'string' } },
      flags: { type: 'array', items: { type: 'string' } },
    },
    required: ['header', 'lines', 'unsure', 'flags'],
  },
};

const otherTool = {
  name: 'record_document',
  description: 'Record the key facts written on a hunting permit, licence, certificate or similar document.',
  input_schema: {
    type: 'object',
    properties: {
      document_title: str, ph_name: str, ph_permit_no: str, ho_name: str, ho_permit_no: str, hunter_name: str,
      permit_numbers: { type: 'array', items: { type: 'string' } },
      dates: { type: 'array', items: { type: 'string' } },
      species: { type: 'array', items: { type: 'string' } },
      has_signature: { type: 'boolean' }, has_stamp: { type: 'boolean' },
      unsure: { type: 'array', items: { type: 'string' } },
      flags: { type: 'array', items: { type: 'string' } },
    },
    required: ['document_title', 'ph_name', 'ph_permit_no', 'ho_name', 'ho_permit_no', 'hunter_name', 'permit_numbers', 'dates', 'species', 'has_signature', 'has_stamp', 'unsure', 'flags'],
  },
};

const registerPrompt = `This is a photo or scan of a South African Professional Hunting Register and Trophy Export Application. The photo may be rotated sideways or upside down; read it in the correct orientation.
Read it exactly as written and call record_register.
Rules:
- Never guess. If something is blank, crossed out or you cannot read it with confidence, return null (or an empty list) and add its name to "unsure". Names for "unsure": header fields use their own name (for example ph_permit_no); fields on an animal line use "line:N:field" with N the line number counted from 1 at the top of the table (for example line:3:permit_no).
- Dates are day/month/year as written in South Africa. Return them as YYYY-MM-DD. A two digit year such as 24 means 2024.
- province: the province whose box is ticked or crossed with an X ("Tick appropriate Province block where hunt took place").
- ph_signed, client_signed, ho_signed: true only if a signature or initials is actually visible in that block's signature space.
- Numbers (permit numbers, ID or passport, register No.) must be copied digit for digit. If two digits could be confused, put the field in "unsure".
- One entry in "lines" per filled-in row of the table, top to bottom. Skip empty rows. quantity is the number killed or wounded. sex is M or F from the sex columns.
- parts: map the words in "Parts of trophy to be exported" to these codes: SKULL (skull, horns), CAPE (cape, full cape), BSKIN (back skin, backskin, b/skin), FLATSKIN (flat skin, flatskin, f/skin), FSKIN (full skin, full mount skin, full mount, FMT), FEET (feet, hooves), LEGBONES, SCROTUM, TAIL, TUSKS, PANEL, OTHER.
- "flags": short plain sentences about anything that looks wrong or odd for a person checking this form: missing signatures, a field left blank, crossed-out or overwritten entries, handwritten notes added by someone, a permit number that differs between rows, dates that fall outside the hunt dates, anything illegible. Do not repeat what is already in "unsure".`;

const otherPrompt = `This is a photo or scan of a document that belongs to a hunt in South Africa (a hunting permit, licence, certificate, letter of permission or similar). It may be rotated; read it in the correct orientation.
Read it exactly as written and call record_document.
Rules:
- Never guess. If a value is missing or not clearly readable return null (or an empty list) and add its name to "unsure".
- ph_permit_no is the professional hunter's permit number if the document shows one; ho_permit_no is the hunting outfitter's permit number if it shows one. permit_numbers lists every permit, certificate or licence number printed or written on the document, copied digit for digit.
- dates: every date on the document as YYYY-MM-DD (day/month/year as written; a two digit year such as 24 means 2024).
- has_signature / has_stamp: true only if a signature (or initials) / an official stamp or seal is actually visible.
- "flags": short plain sentences about anything that looks wrong or odd for a person checking it: an expired date, a faint or missing stamp, missing signature, overwritten or crossed-out entries, anything illegible.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Please sign in again' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: isStaff } = await user.rpc('_doc_is_staff');
    if (!isStaff) return json({ error: 'Only managers can use the AI reader' }, 403);

    const { hunt_id, requirement_id, kind } = await req.json();
    const { data: reqRow, error: reqErr } = await user.from('hunt_requirements').select('id, hunt_id, name, file_paths').eq('id', requirement_id).eq('hunt_id', hunt_id).single();
    if (reqErr || !reqRow) return json({ error: 'That document was not found' }, 404);
    const paths: string[] = (reqRow.file_paths ?? []).filter((p: string) => p.startsWith(hunt_id + '/')).slice(0, 6);
    if (paths.length === 0) return json({ error: 'There is no scan on this document yet' }, 400);

    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'The AI reader has no key yet. Add ANTHROPIC_API_KEY under Edge Functions, Secrets.' }, 500);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const blocks: unknown[] = [];
    for (const p of paths) {
      const { data: blob, error } = await admin.storage.from('hunt-documents').download(p);
      if (error || !blob) return json({ error: 'Could not open a file: ' + (error?.message ?? p) }, 500);
      const b64 = encodeBase64(new Uint8Array(await blob.arrayBuffer()));
      blocks.push(p.toLowerCase().endsWith('.pdf')
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
        : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
    }

    const isRegister = kind === 'register';
    const tool = isRegister ? registerTool : otherTool;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('DOC_AI_MODEL') ?? 'claude-sonnet-5-5',
        max_tokens: 8000,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content: [...blocks, { type: 'text', text: isRegister ? registerPrompt : otherPrompt }] }],
      }),
    });
    const out = await res.json();
    if (!res.ok) return json({ error: 'The AI service said: ' + (out?.error?.message ?? res.status) }, 502);
    const call = (out.content ?? []).find((c: { type: string }) => c.type === 'tool_use');
    if (!call) return json({ error: 'The AI reader did not return anything' }, 502);
    return json({ kind: isRegister ? 'register' : 'other', data: call.input });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
