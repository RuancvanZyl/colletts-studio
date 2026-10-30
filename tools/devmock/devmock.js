// TEMPORARY local test data — not committed.
(function () {
  if (!/\/\/localhost/.test(location.href)) return;
  const scenario = localStorage.getItem('__scenario');
  if (scenario === 'invite') { localStorage.removeItem('sb-kpbtydfkqrrtbpwxvbep-auth-token'); }
  if (!scenario) return;
  const REF = 'kpbtydfkqrrtbpwxvbep';
  const now = Date.now();
  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify({ sub: 'u1', exp: Math.floor(now / 1000) + 86400 * 30, role: 'authenticated', email: 'john@example.com' })).replace(/=/g, '') + '.sig';
  const user = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'john@example.com', user_metadata: { full_name: 'John Smith', portal_type: scenario === 'outfitter' ? 'outfitter' : 'hunter' }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  if (scenario !== 'staff' && scenario !== 'invite') localStorage.setItem('sb-' + REF + '-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 86400 * 30, expires_at: Math.floor(now / 1000) + 86400 * 30, user }));
  const jc = (id, species, mount, dept, o = {}) => ({ id, hunt_id: 'h1', doc_type: 'job_card', status: o.status || 'in_progress', current_department: dept, started_at: o.started || '2026-10-10T08:00:00Z', created_at: '2026-10-01T08:00:00Z', last_moved_at: '2026-10-20T08:00:00Z',
    title: species, form_data: { species, mount_type: mount, tag_number: o.tag || '', condition: 'fresh', received_parts: [{ code: 'skull', label: 'Skull' }, { code: 'cape', label: 'Cape' }], received_at: '2026-10-05T08:00:00Z', stage_history: [] } });
  const T = {
    clients: [{ id: 'c1', full_name: 'John Smith', email: 'john@example.com', phone: '0821234567', client_number: 'C-0101', client_type: 'export', auth_user_id: 'u1' }],
    client_hunts: [{ id: 'h1', ref_number: 'H-2026-014', year: 2026, status: 'active', client_id: 'c1', operator: 'Kalahari Safaris', farm: null, client_type: 'export', process_type: 'taxidermy', created_at: '2026-10-01T08:00:00Z' }],
    hunt_documents: [
      jc('d1', 'Kudu', 'Pending Instructions', 'receiving', { status: 'in_progress', started: null, tag: '204' }),
      jc('d2', 'Impala', 'Shoulder Mount', 'mounting', { tag: '205' }),
      jc('d3', 'Gemsbok', 'European Mount', 'salting', { tag: '206' }),
      jc('d4', 'Warthog', 'Shoulder Mount', 'packing', { status: 'completed', tag: '207' }),
    ],
    quotes: [{ id: 'q1', hunt_id: 'h1', client_id: 'c1', status: 'sent', currency: 'USD', deposit_percent: 50, note: 'Thank you for choosing us.', hunter_comment: null, payment_option: null, amount_due_now: null, sent_at: '2026-10-20T08:00:00Z', accepted_at: null, xero_invoice_number: null, xero_invoice_url: null, created_at: '2026-10-20T08:00:00Z' }],
    quote_lines: [
      { id: 'l1', quote_id: 'q1', description: 'Impala: Shoulder Mount', amount: 450, kind: 'mount', sort_order: 1 },
      { id: 'l2', quote_id: 'q1', description: 'Gemsbok: European Mount', amount: 380, kind: 'mount', sort_order: 2 },
      { id: 'l3', quote_id: 'q1', description: 'Crating and courier', amount: 600, kind: 'extra', sort_order: 3 },
    ],
    client_notifications: [{ id: 'n1', client_id: 'c1', title: 'Your Impala moved to Mounting', message: 'Work on your Impala is going well.', read_at: null, created_at: '2026-10-25T08:00:00Z' }],
  };
  const R = {
    hunter_documents_overview: [{ hunt_id: 'h1', ref: 'H-2026-014', outfitter: 'Kalahari Safaris', items: [
      { id: 'r1', name: 'Hunt register', responsible: 'outfitter', status: 'awaiting', reason: null, requested_at: '2026-10-05T08:00:00Z' },
      { id: 'r2', name: 'CITES permit', responsible: 'authority', status: 'received', reason: null, requested_at: '2026-10-05T08:00:00Z' },
      { id: 'r3', name: 'Signed export declaration', responsible: 'hunter', status: 'rejected', reason: 'Signature missing on page 2', requested_at: '2026-10-05T08:00:00Z' },
    ] }],
  };
  if (scenario === 'outfitter') {
    R.outfitter_overview = { outfitter: { id: 'o1', name: 'Kalahari Safaris', status: 'active' }, hunts: [
      { id: 'h1', ref: 'H-2026-014', hunter: 'John Smith', email: 'john@example.com', start: '2026-09-28', end: '2026-10-05', registered: true,
        animals: [{ species: 'Kudu', tag: '204', status: 'in_progress', dept: 'tannery', mount: 'Shoulder Mount' }, { species: 'Impala', tag: '205', status: 'awaiting_arrival', dept: 'receiving', mount: null }],
        money: { status: 'deposit_paid', currency: 'USD', total: 1430, paid: 715, paid_by_outfitter: 0 } },
      { id: 'h2', ref: 'H-2026-015', hunter: 'Anna van der Merwe', email: null, start: '2026-10-10', end: '2026-10-15', registered: false, animals: [{ species: 'Blesbok', tag: '310', status: 'awaiting_arrival', dept: 'receiving', mount: null }], money: null },
    ] };
    R.outfitter_cases = [{ id: 'q1', hunt_id: 'h1', status: 'open', client: 'John Smith', species: 'Kudu', reasons: ['Hair slip', 'Bug damage'], note: null, created_at: '2026-10-26T08:00:00Z', ack_at: null, outcome: null, outcome_at: null, client_informed_at: null, client_decision: null }];
    R.outfitter_documents_overview = [{ hunt_id: 'h1', ref: 'H-2026-014', hunter: 'John Smith', items: [
      { id: 'r1', name: 'Hunt register', responsible: 'outfitter', status: 'awaiting', reason: null, needs_signature: true, needs_stamp: true, requested_at: '2026-10-05T08:00:00Z', files: 0 },
      { id: 'r2', name: 'PH permit', responsible: 'outfitter', status: 'rejected', reason: 'Permit number does not match the register', needs_signature: false, needs_stamp: false, requested_at: '2026-10-05T08:00:00Z', files: 1 },
    ] }];
    R.check_hunt_register = [];
    T.outfitter_messages = [{ id: 'm1', hunt_id: 'h1', sender: 'workshop', read_at: null, body: 'Please send the register.', created_at: '2026-10-27T08:00:00Z' }];
  }
  if (scenario === 'staff') {
    const day = 86400000; const iso = (d) => new Date(now + d * day).toISOString();
    const ms = (start) => [{ key: 'm1', label: 'Skin & skull preparation', due_date: iso(start + 90) }, { key: 'm2', label: 'Tannery', due_date: iso(start + 150) }, { key: 'm3', label: 'Completion', due_date: iso(start + 180) }];
    const hunt = (id, n, num, ref, started) => ({ id, ref_number: ref, year: 2026, order_size: 'small', timeline_started_at: started === null ? null : iso(-started), deadline_current: started === null ? null : iso(-started + 180), milestones: started === null ? null : ms(-started), clients: { id: 'c' + id, full_name: n, client_number: num }, status: 'active', client_id: 'c' + id, operator: 'Kalahari Safaris' });
    T.client_hunts = [hunt('h1', 'John Smith', 'C-0101', 'H-2026-014', 40), hunt('h2', 'Anna van der Merwe', 'C-0102', 'H-2026-015', 100), hunt('h3', 'Pieter Botha', 'C-0103', 'H-2026-016', 200), hunt('h4', 'Sipho Dlamini', 'C-0104', 'H-2026-017', null)];
    const j = (id, h, sp, mount, dept) => ({ id, hunt_id: h, doc_type: 'job_card', status: 'in_progress', current_department: dept, species: sp, mount, form_data: { species: sp, mount_type: mount }, client_hunts: T.client_hunts.find(x => x.id === h) });
    T.hunt_documents = [j('d1', 'h1', 'Kudu', 'Shoulder Mount', 'skinning'), j('d2', 'h1', 'Impala', 'Shoulder Mount', 'salting'), j('d3', 'h2', 'Blesbok', 'Shoulder Mount', 'salting'), j('d4', 'h2', 'Zebra', 'Full Mount', 'tannery'), j('d5', 'h3', 'Warthog', 'Shoulder Mount', 'skinning'), j('d6', 'h3', 'Gemsbok', 'Shoulder Mount', 'skinning'), j('d7', 'h4', 'Eland', 'Shoulder Mount', 'receiving')];
    T.quality_cases = [{ id: 'q1', hunt_id: 'h2', job_doc_id: 'd4', reasons: ['Hair slip'], order_override_at: null, order_override_reason: null, status: 'open', doc: { form_data: { species: 'Zebra' } } }];
    R.my_incoming_cards = [
      { doc_id: 'd1', hunt_id: 'h1', client: 'John Smith', species: 'Kudu', mount: 'Shoulder Mount', department: 'skinning', sent_at: iso(-1), hours_waiting: 30 },
      { doc_id: 'd2', hunt_id: 'h1', client: 'Anna van der Merwe', species: 'Impala', mount: 'Full Mount', department: 'skinning', sent_at: iso(-0.1), hours_waiting: 2 } ];
    R.my_soak_reviews = [{ id: 's1', doc_id: 'd4', hunt_id: 'h2', client: 'Anna van der Merwe', species: 'Zebra', type: 'in_house', tannery_name: null, mount: 'Full Mount', findings: { bullet: true, hair_slip: true }, holes: 4, files: [], notes: null, by: 'Thabo', submitted_at: iso(-0.3) }];
    T.quality_cases = [{ id: 'q1', hunt_id: 'h2', job_doc_id: 'd4', status: 'open', reasons: ['Hair slip','Bug damage'], note: null, created_at: iso(-3), created_by_name: 'Thabo', outfitter_notified_at: iso(-3), outfitter_ack_at: null, outfitter_ack_by_name: null, outcome_at: null, ai_recommendation: null, ai_recommended_at: null, outcome: null, outcome_note: null, stock_reference: null, outcome_by_name: null, client_informed_by: null, client_informed_at: null, client_decision: null, client_decision_note: null, order_override_at: null, doc: { form_data: { species: 'Zebra' } }, hunt: { clients: { full_name: 'Anna van der Merwe' } }, outfitter: { name: 'Kalahari Safaris', phone: '0821112222', contact_name: 'Piet Kruger' }, soak: null }];
    T.v_last_progress_review = []; T.milestone_feedback = [];
  }
  R.get_invite_info = { first_name: 'John', full_name: 'John Smith', email: 'john@example.com', phone: '0821234567', client_type: 'export', registered: false, animals: [{ species: 'Kudu', parts: [{ code: 'skull' }, { code: 'cape' }], received_at: '2026-10-05' }, { species: 'Impala', parts: [{ code: 'skull' }], received_at: '2026-10-05' }] };
  window.__tables = T; window.__rpc = R; window.__log = [];
  const orig = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = String((input && input.url) || input); const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    const json = (b, s) => Promise.resolve(new Response(JSON.stringify(b), { status: s || 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' } }));
    if (url.includes('/auth/v1/user')) return json(user);
    if (url.includes('/auth/v1/token')) return json({ access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, user });
    let m = url.match(/\/rest\/v1\/rpc\/([a-z_0-9]+)/);
    if (m) { window.__log.push('RPC ' + m[1] + ' ' + (init && init.body ? String(init.body).slice(0, 160) : '')); return json(R[m[1]] !== undefined ? R[m[1]] : null); }
    m = url.match(/\/rest\/v1\/([a-z_0-9]+)/);
    if (m) {
      window.__log.push(method + ' ' + m[1]);
      const wantsObject = JSON.stringify((init && init.headers) || {}).includes('vnd.pgrst.object');
      if (method === 'GET' || method === 'HEAD') { let rows = T[m[1]] || []; const eq = url.match(/[?&]id=eq\.([^&]+)/); if (eq) rows = rows.filter(r => r.id === decodeURIComponent(eq[1])); return json(wantsObject ? (rows[0] || null) : rows); }
      const body = init && init.body ? JSON.parse(init.body) : {}; const row = Array.isArray(body) ? body : [{ id: 'new1', ...body }];
      return json(wantsObject ? row[0] : row, method === 'POST' ? 201 : 200);
    }
    if (url.includes('/storage/v1/') || url.includes('/functions/v1/')) return json({});
    return orig(input, init);
  };
})();
