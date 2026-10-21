/**
 * Hard copies — job cards, receiving sheets and packing lists as clean A4 pages.
 *
 * Printing happens in a hidden frame (no pop-up for the browser to block, nothing else from the app
 * ends up on the paper) and uses only data already on screen or in the saved copy, so it also works
 * with the internet off.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from './supabase';
import { selectIn, fetchAllRows } from './supabaseHelpers';
import { DEPT_LABELS, getPipeline } from './pipeline';

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
  * { box-sizing: border-box; }
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

/** Show the browser's print dialog for the given page markup. */
export function printHtml(title: string, body: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) { frame.remove(); throw new Error('Printing is not available in this browser'); }
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`);
  doc.close();
  const go = () => {
    win.focus();
    win.print();
    // keep the frame until the dialog has been dealt with
    setTimeout(() => frame.remove(), 60_000);
  };
  // let the QR codes / layout settle
  setTimeout(go, 150);
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
  species: string; mount: string; quantity: number | string; tag: string; instructions: string;
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
      <tr><td class="k">Species</td><td><strong style="font-size:14px">${esc(j.species)}</strong></td><td class="k">Mount type</td><td><strong>${esc(j.mount)}</strong></td></tr>
      <tr><td class="k">Quantity</td><td>${esc(j.quantity)}</td><td class="k">Tag no.</td><td>${esc(j.tag) || '—'}</td></tr>
      <tr><td class="k">Due date</td><td>${esc(fmtDate(j.dueDate)) || '—'}</td><td class="k">Assigned to</td><td>${esc(j.assignedTo) || '—'}</td></tr>
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
