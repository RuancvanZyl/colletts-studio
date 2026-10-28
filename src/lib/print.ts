/**
 * Hard copies — job cards, receiving sheets and packing lists as clean A4 pages.
 *
 * Printing happens in a hidden frame (no pop-up for the browser to block, nothing else from the app
 * ends up on the paper) and uses only data already on screen or in the saved copy, so it also works
 * with the internet off.
 */
import { conditionSummary } from './condition';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from './supabase';
import { selectIn, fetchAllRows } from './supabaseHelpers';
import { DEPT_LABELS, getPipeline } from './pipeline';
import { listParts } from './received';
import { sciName } from './species';

// ── plumbing ────────────────────────────────────────────────────────────────

export const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const PRIORITY_TEXT: Record<number, string> = { 1: 'URGENT', 2: 'High', 3: 'Normal', 4: 'Low' };

const qr = (value: string, size = 64) =>
  renderToStaticMarkup(createElement(QRCodeSVG, { value, size, level: 'M' }));

const CSS = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
  .brand { font-size: 11px; font-weight: bold; letter-spacing: .12em; text-transform: uppercase; color: #444; }
  h1 { margin: 2px 0 0; font-size: 22px; letter-spacing: .02em; }
  .meta { text-align: right; font-size: 10px; color: #444; line-height: 1.5; }
  .urgent { display: inline-block; background: #111; color: #fff; font-weight: bold; padding: 1px 8px; border-radius: 3px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
  th, td { border: 1px solid #555; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #eee; font-size: 9.5px; text-transform: uppercase; letter-spacing: .05em; }
  td.k { background: #f4f4f4; font-weight: bold; width: 17%; font-size: 10px; }
  .box { border: 1px solid #555; padding: 6px 8px; min-height: 38px; margin: 4px 0 10px; white-space: pre-wrap; }
  h3 { margin: 10px 0 2px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
  .tick { display: inline-block; width: 11px; height: 11px; border: 1.5px solid #111; vertical-align: -2px; margin-right: 5px; }
  .tick.on { background: #111; }
  .step { margin: 2px 0; }
  .sub { color: #555; font-size: 10px; }
  .sig { display: flex; gap: 24px; margin-top: 22px; }
  .sig div { flex: 1; border-top: 1px solid #111; padding-top: 3px; font-size: 10px; color: #444; }
  .lines div { border-bottom: 1px solid #999; height: 20px; }
  .foot { margin-top: 10px; font-size: 9px; color: #666; }
  tr { page-break-inside: avoid; }
`;

/** Prefix every rule with the print root so nothing leaks into (or is overridden by) the app's own styles. */
function scoped(css: string): string {
  return css.replace(/([^{}@]+)\{([^{}]*)\}/g, (_m, sel: string, body: string) =>
    sel.trim().split(',').map(x => {
      const t = x.trim();
      return t === 'body' ? '#apex-print-root' : `#apex-print-root ${t}`;
    }).join(',') + `{${body}}`);
}

/**
 * Show the print dialog for the given page markup.
 * The pages are put into the app's own document and everything else is hidden while printing — this is
 * the one approach that behaves the same on iPhone, Android and desktop (a hidden frame does not on iOS).
 */
export function printHtml(title: string, body: string): void {
  document.getElementById('apex-print-root')?.remove();
  document.getElementById('apex-print-style')?.remove();

  const style = document.createElement('style');
  style.id = 'apex-print-style';
  style.textContent = `
    ${CSS.match(/@page[^}]*}/)?.[0] ?? ''}
    ${scoped(CSS.replace(/@page[^}]*}/, ''))}
    #apex-print-root { color:#111; background:#fff; font-family: Arial, Helvetica, sans-serif; }
    #apex-print-root h1, #apex-print-root h3 { font-weight: bold; }
    #apex-print-root svg { display: inline-block; }
    @media screen { #apex-print-root { display: none; } }
    @media print {
      body > *:not(#apex-print-root) { display: none !important; }
      html, body { background: #fff !important; }
      #apex-print-root { display: block; }
    }`;
  const root = document.createElement('div');
  root.id = 'apex-print-root';
  root.innerHTML = body;
  document.head.appendChild(style);
  document.body.appendChild(root);

  const oldTitle = document.title;
  document.title = title;                       // becomes the file name when saved as PDF
  const cleanup = () => {
    document.title = oldTitle;
    root.remove(); style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => {
    try { window.print(); } catch (e) { cleanup(); throw e; }
    // some mobile browsers never fire afterprint
    setTimeout(() => { if (document.getElementById('apex-print-root')) cleanup(); }, 120_000);
  }, 200);
}

const stamp = () => `Printed ${new Date().toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
const head = (title: string, metaHtml: string, code?: string) => `
  <div class="head">
    <div><div class="brand">Apex Trophy Solutions</div><h1>${esc(title)}</h1></div>
    <div style="display:flex;gap:10px;align-items:flex-start">
      <div class="meta">${metaHtml}</div>${code ? qr(code, 62) : ''}
    </div>
  </div>`;

// ── job cards ───────────────────────────────────────────────────────────────

interface PrintJob {
  id: string; huntId: string;
  clientName: string; clientNumber: string; clientEmail: string;
  huntRef: string; huntYear: string; operator: string; country: string;
  species: string; mount: string; quantity: number | string; tag: string; instructions: string; received: string; condition: string;
  special: string[];
  dept: string; status: string; priority: number; dueDate: string | null; priorityNote: string; assignedTo: string;
  stageHistory: { dept: string; completedAt?: string; completedBy?: string }[];
}

const JOB_SELECT = 'id, hunt_id, title, form_data, current_department, status, priority, due_date, priority_note, assigned_to, ' +
  'client_hunts(ref_number, year, operator, country, clients(full_name, client_number, email))';

async function hydrate(rows: any[]): Promise<{ jobs: PrintJob[]; items: { id: string; dept_key: string; label: string }[]; progress: Set<string> }> {
  const staffRows = await fetchAllRows<any>(() => (supabase as any).from('staff_profiles').select('id, full_name'));
  const staff: Record<string, string> = {};
  staffRows.forEach(s => { staff[s.id] = s.full_name; });

  const hunts = [...new Set(rows.map(r => r.hunt_id))];
  const special: Record<string, string[]> = {};
  const cust = hunts.length
    ? (await selectIn<any>('hunt_documents', 'hunt_id, title, form_data, doc_type', 'hunt_id', hunts)).filter(c => c.doc_type === 'customisation')
    : [];
  cust.forEach(c => {
    (special[c.hunt_id] ??= []).push(c.form_data?.description ? `${c.title}: ${c.form_data.description}` : c.title);
  });

  const { data: items } = await (supabase as any).from('department_checklist_items')
    .select('id, dept_key, label, sort_order').eq('is_active', true).order('sort_order');
  const prog = rows.length ? await selectIn<any>('job_checklist_progress', 'job_doc_id, item_id, done', 'job_doc_id', rows.map(r => r.id)) : [];
  const progress = new Set<string>(prog.filter(p => p.done).map(p => `${p.job_doc_id}:${p.item_id}`));

  const jobs: PrintJob[] = rows.map(d => {
    const h = d.client_hunts ?? {}; const c = h.clients ?? {}; const fd = d.form_data ?? {};
    return {
      id: d.id, huntId: d.hunt_id,
      clientName: c.full_name ?? '', clientNumber: c.client_number ?? '', clientEmail: c.email ?? '',
      huntRef: h.ref_number ?? '', huntYear: String(h.year ?? ''), operator: h.operator ?? '', country: h.country ?? '',
      species: fd.species ?? d.title ?? '', mount: fd.mount_type ?? '', quantity: fd.quantity ?? 1, tag: fd.tag_number ?? '',
      instructions: fd.instructions ?? '', special: special[d.hunt_id] ?? [],
      received: (fd.received_parts ?? []).length ? listParts((fd.received_parts ?? []).map((p: any) => p.code), fd.received_other) : '', condition: conditionSummary(fd.condition_report, fd.condition),
      dept: d.current_department ?? 'receiving', status: d.status ?? '', priority: d.priority ?? 3,
      dueDate: d.due_date ?? null, priorityNote: d.priority_note ?? '', assignedTo: d.assigned_to ? (staff[d.assigned_to] ?? '') : '',
      stageHistory: fd.stage_history ?? [],
    };
  });
  return { jobs, items: items ?? [], progress };
}

function jobPage(j: PrintJob, items: { id: string; dept_key: string; label: string }[], progress: Set<string>): string {
  const route = getPipeline(j.mount);
  const here = route.indexOf(j.dept);
  const history = new Map(j.stageHistory.map(s => [s.dept, s]));

  const stageRows = route.map((dept, i) => {
    const steps = items.filter(x => x.dept_key === dept);
    const done = history.get(dept);
    const current = i === here;
    const stepHtml = steps.length
      ? steps.map(s => `<div class="step"><span class="tick ${progress.has(`${j.id}:${s.id}`) ? 'on' : ''}"></span>${esc(s.label)}</div>`).join('')
      : '<span class="sub">—</span>';
    return `<tr>
      <td style="width:22%"><strong>${i + 1}. ${esc(DEPT_LABELS[dept] ?? dept)}</strong>${current ? '<div class="sub">◄ it is here now</div>' : ''}</td>
      <td>${stepHtml}</td>
      <td style="width:14%">${esc(done?.completedBy ?? '')}</td>
      <td style="width:12%">${esc(fmtDate(done?.completedAt))}</td>
    </tr>`;
  }).join('');

  return `<section class="page">
    ${head('Job Card', `${esc(j.huntRef)} · ${esc(j.huntYear)}<br>${j.priority === 1 ? '<span class="urgent">URGENT</span>' : `Priority: ${esc(PRIORITY_TEXT[j.priority] ?? 'Normal')}`}<br>${esc(stamp())}`, j.tag || j.id)}
    <table>
      <tr><td class="k">Client</td><td><strong>${esc(j.clientName)}</strong></td><td class="k">Client no.</td><td>${esc(j.clientNumber)}</td></tr>
      <tr><td class="k">Hunt ref</td><td>${esc(j.huntRef)} (${esc(j.huntYear)})</td><td class="k">Outfitter</td><td>${esc(j.operator) || '—'}</td></tr>
      <tr><td class="k">Species</td><td><strong style="font-size:14px">${esc(j.species)}</strong>${sciName(j.species) ? `<div class="sub" style="font-style:italic">${esc(sciName(j.species))}</div>` : ''}</td><td class="k">Mount type</td><td><strong>${esc(j.mount)}</strong></td></tr>
      <tr><td class="k">Quantity</td><td>${esc(j.quantity)}</td><td class="k">Tag no.</td><td>${esc(j.tag) || '—'}</td></tr>
      <tr><td class="k">Due date</td><td>${esc(fmtDate(j.dueDate)) || '—'}</td><td class="k">Assigned to</td><td>${esc(j.assignedTo) || '—'}</td></tr>
      ${j.received ? `<tr><td class="k">Received</td><td colspan="3">${esc(j.received)}${j.condition ? ` &middot; ${esc(j.condition)}` : ''}</td></tr>` : ''}
      <tr><td class="k">Now in</td><td colspan="3">${esc(j.dept === 'done' ? 'Finished' : (DEPT_LABELS[j.dept] ?? j.dept))}</td></tr>
    </table>
    ${j.priorityNote ? `<div class="box" style="min-height:0"><strong>Rush note:</strong> ${esc(j.priorityNote)}</div>` : ''}
    <h3>Client instructions</h3>
    <div class="box">${esc(j.instructions) || '&nbsp;'}</div>
    ${j.special.length ? `<h3>Special requests</h3><div class="box">${j.special.map(esc).join('\n')}</div>` : ''}
    <h3>Production route — tick each step, then sign off the department</h3>
    <table>
      <tr><th>Department</th><th>Steps to complete</th><th>Done by</th><th>Date</th></tr>
      ${stageRows}
    </table>
    <h3>Notes</h3>
    <div class="lines"><div></div><div></div><div></div></div>
    <div class="foot">Apex Trophy Solutions · job card ${esc(j.huntRef)} · ${esc(j.species)}</div>
  </section>`;
}

export type JobPrintFilter =
  | { docIds: string[] }
  | { clientId: string; includeFinished?: boolean }
  | { dept: string };

/** Print one A4 job card per trophy. Resolves with how many were printed. */
export async function printJobCards(filter: JobPrintFilter): Promise<number> {
  let rows: any[];
  if ('docIds' in filter) {
    rows = await selectIn<any>('hunt_documents', JOB_SELECT, 'id', filter.docIds);
  } else if ('clientId' in filter) {
    const hunts = await fetchAllRows<any>(() => (supabase as any).from('client_hunts').select('id').eq('client_id', filter.clientId));
    rows = (await selectIn<any>('hunt_documents', JOB_SELECT + ', doc_type', 'hunt_id', hunts.map(h => h.id))).filter(r => r.doc_type === 'job_card');
    if (!filter.includeFinished) rows = rows.filter(r => !['completed', 'complete'].includes(r.status) && r.current_department !== 'done');
  } else {
    rows = await fetchAllRows<any>(() => (supabase as any).from('hunt_documents').select(JOB_SELECT)
      .eq('doc_type', 'job_card').eq('status', 'in_progress').eq('current_department', filter.dept).order('created_at'));
  }
  if (rows.length === 0) return 0;
  const { jobs, items, progress } = await hydrate(rows);
  jobs.sort((a, b) => a.clientName.localeCompare(b.clientName) || a.huntRef.localeCompare(b.huntRef) || a.species.localeCompare(b.species));
  printHtml(jobs.length === 1 ? `Job Card — ${jobs[0].clientName} — ${jobs[0].species}` : `Job Cards (${jobs.length})`,
    jobs.map(j => jobPage(j, items, progress)).join(''));
  return jobs.length;
}

// ── receiving sheet ─────────────────────────────────────────────────────────

export interface ReceivingPrint {
  clientName: string; clientNumber?: string | null; huntRef?: string; year?: number | string | null; operator?: string | null;
  receivedBy?: string;
  lines: { species: string; mountType: string; quantity: number; tagNumber: string; instructions: string; status: 'pending' | 'ok' | 'issue'; conditionNotes: string }[];
}

export function printReceivingSheet(r: ReceivingPrint): void {
  const rows = r.lines.map((l, i) => `<tr>
    <td style="width:4%">${i + 1}</td>
    <td><strong>${esc(l.species)}</strong><div class="sub">${esc(l.mountType)}${l.quantity > 1 ? ` × ${esc(l.quantity)}` : ''}</div></td>
    <td style="width:11%">${esc(l.tagNumber)}</td>
    <td style="width:26%">${esc(l.instructions)}</td>
    <td style="width:12%;white-space:nowrap"><span class="tick ${l.status === 'ok' ? 'on' : ''}"></span>OK<br><span class="tick ${l.status === 'issue' ? 'on' : ''}"></span>Issue</td>
    <td style="width:24%">${esc(l.conditionNotes)}</td>
  </tr>`).join('');
  const body = `<section class="page">
    ${head('Receiving Sheet', `${esc(r.huntRef ?? '')}${r.year ? ` · ${esc(r.year)}` : ''}<br>${esc(stamp())}`)}
    <table>
      <tr><td class="k">Client</td><td><strong>${esc(r.clientName)}</strong></td><td class="k">Client no.</td><td>${esc(r.clientNumber ?? '') || '—'}</td></tr>
      <tr><td class="k">Outfitter</td><td>${esc(r.operator ?? '') || '—'}</td><td class="k">Date received</td><td>${esc(fmtDate(new Date().toISOString()))}</td></tr>
      <tr><td class="k">Received by</td><td colspan="3">${esc(r.receivedBy ?? '') || '&nbsp;'}</td></tr>
    </table>
    <h3>Trophies received — ${r.lines.length} item${r.lines.length === 1 ? '' : 's'}</h3>
    <table>
      <tr><th>#</th><th>Trophy</th><th>Tag</th><th>Client instructions</th><th>Check</th><th>Condition / notes</th></tr>
      ${rows || '<tr><td colspan="6">No trophies listed</td></tr>'}
    </table>
    <h3>Delivery details &amp; notes</h3>
    <div class="lines"><div></div><div></div><div></div></div>
    <div class="sig"><div>Received by (name &amp; signature)</div><div>Delivered by (name &amp; signature)</div><div>Date</div></div>
    <div class="foot">Apex Trophy Solutions · receiving sheet · ${esc(r.clientName)}</div>
  </section>`;
  printHtml(`Receiving Sheet — ${r.clientName}`, body);
}

// ── packing list ────────────────────────────────────────────────────────────

export interface PackingPrint {
  clientName: string; clientNumber?: string | null; courier?: string; tracking?: string; notes?: string;
  trophies: { docId: string; tagNumber: string; species: string; mountType: string }[];
  crates: { number: string; length: string; width: string; height: string; weight: string; trophies: string[] }[];
}

export function printPackingList(p: PackingPrint): void {
  const byId = new Map(p.trophies.map(t => [t.docId, t]));
  const totalWeight = p.crates.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0);
  const unpacked = p.trophies.filter(t => !p.crates.some(c => c.trophies.includes(t.docId)));
  const crateHtml = p.crates.map((c, i) => {
    const contents = c.trophies.map(id => byId.get(id)).filter(Boolean) as PackingPrint['trophies'];
    const dims = [c.length, c.width, c.height].every(Boolean) ? `${esc(c.length)} × ${esc(c.width)} × ${esc(c.height)} cm` : '—';
    return `<h3>Crate ${i + 1}</h3>
      <table>
        <tr><td class="k">Size</td><td>${dims}</td><td class="k">Weight</td><td>${c.weight ? `${esc(c.weight)} kg` : '—'}</td></tr>
      </table>
      <table>
        <tr><th style="width:4%">✓</th><th style="width:16%">Tag</th><th>Trophy</th><th style="width:30%">Mount type</th></tr>
        ${contents.length ? contents.map(t => `<tr><td><span class="tick"></span></td><td>${esc(t.tagNumber)}</td><td>${esc(t.species)}</td><td>${esc(t.mountType)}</td></tr>`).join('') : '<tr><td colspan="4">Empty</td></tr>'}
      </table>`;
  }).join('');
  const body = `<section class="page">
    ${head('Packing List', `${p.crates.length} crate${p.crates.length === 1 ? '' : 's'} · ${p.trophies.length} trophies${totalWeight ? ` · ${totalWeight.toFixed(1)} kg` : ''}<br>${esc(stamp())}`)}
    <table>
      <tr><td class="k">Client</td><td><strong>${esc(p.clientName)}</strong></td><td class="k">Client no.</td><td>${esc(p.clientNumber ?? '') || '—'}</td></tr>
      <tr><td class="k">Courier</td><td>${esc(p.courier ?? '') || '—'}</td><td class="k">Tracking / AWB</td><td>${esc(p.tracking ?? '') || '—'}</td></tr>
    </table>
    ${crateHtml}
    ${unpacked.length ? `<div class="box"><strong>Not yet in a crate:</strong> ${unpacked.map(t => esc(`${t.tagNumber} ${t.species}`.trim())).join(', ')}</div>` : ''}
    ${p.notes ? `<h3>Notes / special instructions</h3><div class="box">${esc(p.notes)}</div>` : ''}
    <div class="sig"><div>Packed by (name &amp; signature)</div><div>Checked by (name &amp; signature)</div><div>Date</div></div>
    <div class="foot">Apex Trophy Solutions · packing list · ${esc(p.clientName)}</div>
  </section>`;
  printHtml(`Packing List — ${p.clientName}`, body);
}

// ── drop-off sheet + welcome letter (what the hunter handed in) ──────────────

export interface DropOffAnimal {
  species: string; tag: string; condition: string; parts: string[]; other: string; notes: string;
}
export interface DropOffPrint {
  clientName: string; clientNumber?: string | null; huntRef?: string; receivedBy?: string; receivedAt?: string;
  animals: DropOffAnimal[];
  inviteLink?: string | null;       // shown as a QR code so the hunter can scan it and register
  workshop: { name: string; platform: string; portalUrl: string };
}

const PART_COLS: [string, string][] = [
  ['SKULL', 'Skull'], ['CAPE', 'Cape'], ['BSKIN', 'Back skin'], ['FLATSKIN', 'Flat skin'], ['FSKIN', 'Full skin'],
  ['FEET', 'Feet'], ['TAIL', 'Tail'], ['TUSKS', 'Tusks'], ['OTHER', 'Other'],
];

function dropOffSheetHtml(p: DropOffPrint): string {
  const when = fmtDate(p.receivedAt ?? new Date().toISOString());
  const rows = p.animals.map((a, i) => `<tr>
      <td style="width:4%">${i + 1}</td>
      <td><strong>${esc(a.species)}</strong>${a.tag ? `<div class="sub">Tag ${esc(a.tag)}</div>` : ''}<div class="sub">${esc(a.condition)}</div></td>
      ${PART_COLS.map(([code]) => `<td style="text-align:center;width:6.5%"><span class="tick ${a.parts.includes(code) ? 'on' : ''}"></span></td>`).join('')}
      <td style="width:18%">${esc([a.other ? `Other: ${a.other}` : '', a.notes].filter(Boolean).join(' · '))}</td>
    </tr>`).join('');
  return `<section class="page">
    ${head('Receiving Sheet', `${esc(p.workshop.name)}<br>${esc(p.huntRef ?? '')}<br>${esc(when)}`)}
    <table>
      <tr><td class="k">Hunter</td><td><strong>${esc(p.clientName)}</strong></td><td class="k">Client no.</td><td>${esc(p.clientNumber ?? '') || '—'}</td></tr>
      <tr><td class="k">Received by</td><td>${esc(p.receivedBy ?? '') || '&nbsp;'}</td><td class="k">Animals</td><td>${p.animals.length}</td></tr>
    </table>
    <h3>What was handed in — a filled box means we received it</h3>
    <table>
      <tr><th>#</th><th>Animal</th>${PART_COLS.map(([, l]) => `<th style="text-align:center">${l}</th>`).join('')}<th>Notes</th></tr>
      ${rows}
    </table>
    <p class="sub">Please check this sheet against what you handed in. Anything not listed was not received.</p>
    <div class="sig"><div>Received by (name &amp; signature)</div><div>Handed in by (name &amp; signature)</div><div>Date</div></div>
    <div class="foot">${esc(p.workshop.name)} · receiving sheet · ${esc(p.clientName)}</div>
  </section>`;
}

function welcomeLetterHtml(p: DropOffPrint): string {
  const first = p.clientName.split(' ')[0] || 'there';
  const list = p.animals.map(a => {
    const names = a.parts.map(c => PART_COLS.find(x => x[0] === c)?.[1] ?? c);
    if (a.other) { const i = names.indexOf('Other'); if (i >= 0) names[i] = `Other (${a.other})`; }
    return `<li><strong>${esc(a.species)}</strong>${names.length ? ` — ${esc(names.join(', '))}` : ''}</li>`;
  }).join('');
  return `<section class="page">
    ${head('Welcome', `${esc(p.workshop.name)}<br>${esc(fmtDate(p.receivedAt ?? new Date().toISOString()))}`)}
    <p style="font-size:13px;line-height:1.6">Dear ${esc(first)},</p>
    <p style="font-size:13px;line-height:1.6">Thank you for choosing <strong>${esc(p.workshop.name)}</strong> for your trophies. We have received the following from you:</p>
    <ul style="font-size:13px;line-height:1.7">${list}</ul>
    <p style="font-size:13px;line-height:1.6">The next step is yours: create your profile on our hunter portal, see exactly what we received, and choose how you would like each animal mounted. Once you have chosen, we start work and you can follow every stage — with photos — from your phone.</p>
    ${p.inviteLink ? `<div style="display:flex;gap:16px;align-items:center;border:1px solid #555;padding:12px;margin:14px 0">
        ${qr(p.inviteLink, 110)}
        <div style="font-size:12px;line-height:1.6"><strong>Scan this code with your phone camera</strong><br>or open this link:<br><span style="font-family:monospace;word-break:break-all">${esc(p.inviteLink)}</span></div>
      </div>` : `<p style="font-size:13px">Sign in to your profile at <strong>${esc(p.workshop.portalUrl)}</strong> to choose your mounts.</p>`}
    <p style="font-size:13px;line-height:1.6">If you have any questions, reply to this letter or message us through the portal.</p>
    <p style="font-size:13px;line-height:1.6">Kind regards,<br><strong>${esc(p.workshop.name)}</strong></p>
    <div class="foot">Powered by ${esc(p.workshop.platform)}</div>
  </section>`;
}

/** The receiving sheet (what was dropped off) and, optionally, the welcome letter with the sign-up QR code. */
export function printDropOffPapers(p: DropOffPrint, opts: { sheet?: boolean; letter?: boolean } = { sheet: true, letter: true }): void {
  const parts = [opts.sheet !== false ? dropOffSheetHtml(p) : '', opts.letter ? welcomeLetterHtml(p) : ''].join('');
  printHtml(`Receiving Sheet — ${p.clientName}`, parts);
}
