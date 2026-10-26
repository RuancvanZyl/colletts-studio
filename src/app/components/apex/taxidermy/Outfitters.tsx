/** Outfitters — who sends us hunters: their account, invitation link, hunts, and what is outstanding. */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Loader2, MessageCircle, Mail, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useQuotePipeline, money, STAGE_LABEL } from '../../../../lib/hooks/useQuotes';
import { WORKSHOP, inviteUrl } from '../../../../lib/workshop';
import { whatsappUrl } from '../../../../lib/invite';

interface Outfitter { id: string; name: string; contact_name: string | null; email: string | null; phone: string | null; country: string | null; farm_name: string | null; commission_pct: number | null; status: string; invite_token: string | null; invite_sent_at: string | null; auth_user_id: string | null }
interface HuntRow { id: string; outfitter_id: string }

const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-sm font-semibold text-slate-300 mb-1';
const STATUS: Record<string, string> = { active: 'bg-emerald-900/50 text-emerald-300', inactive: 'bg-amber-900/50 text-amber-300', suspended: 'bg-red-900/50 text-red-300' };

export function Outfitters({ onOpenQuote }: { onOpenQuote: (huntId: string) => void }) {
  const [list, setList] = useState<Outfitter[]>([]);
  const [hunts, setHunts] = useState<HuntRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | 'new' | null>(null);
  const { rows } = useQuotePipeline();

  const load = async () => {
    setLoading(true);
    const [o, h] = await Promise.all([
      (supabase as any).from('outfitters').select('*').order('name'),
      (supabase as any).from('client_hunts').select('id, outfitter_id').not('outfitter_id', 'is', null),
    ]);
    setList(o.data ?? []); setHunts(h.data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const huntsOf = (id: string) => hunts.filter(h => h.outfitter_id === id).map(h => h.id);
  const owed = (id: string, cur: string) => rows.filter(r => huntsOf(id).includes(r.hunt_id) && r.currency === cur && ['accepted', 'deposit_paid'].includes(r.quote_status ?? '')).reduce((n, r) => n + Math.max(0, (r.total ?? 0) - r.amount_paid), 0);
  const shown = useMemo(() => list.filter(o => !q.trim() || `${o.name} ${o.contact_name ?? ''} ${o.email ?? ''}`.toLowerCase().includes(q.toLowerCase())), [list, q]);

  if (open) return <Detail id={open} outfitter={list.find(o => o.id === open) ?? null} huntIds={open === 'new' ? [] : huntsOf(open)} onBack={() => { setOpen(null); load(); }} onOpenQuote={onOpenQuote} />;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-slate-100">Outfitters</h1><p className="text-base text-slate-400 mt-1">The people who send hunters to you. They register the hunter and animals; the hunter chooses the mounts.</p></div>
        <button className="min-h-12 px-4 rounded-xl bg-[#0073ea] text-white font-bold flex items-center gap-2 shrink-0" onClick={() => setOpen('new')}><Plus className="w-5 h-5" />Add</button>
      </div>
      <div className="relative"><Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input className={`${field} pl-9`} placeholder="Search outfitters" value={q} onChange={e => setQ(e.target.value)} /></div>
      {loading && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}
      {!loading && shown.length === 0 && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">No outfitters yet. Add one and send them their link.</p>}
      <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
        {shown.map(o => {
          const n = huntsOf(o.id).length;
          return (
            <button key={o.id} onClick={() => setOpen(o.id)} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-16 hover:bg-[#162330]">
              <span className="flex-1 min-w-0"><span className="block text-lg font-semibold text-slate-100">{o.name}</span>
                <span className="block text-sm text-slate-400">{n} hunt{n === 1 ? '' : 's'}{o.auth_user_id ? ' · has an account' : ' · not signed up yet'}{['USD', 'ZAR'].map(c => owed(o.id, c) > 0 ? ` · owes ${money(owed(o.id, c), c)}` : '').join('')}</span></span>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS[o.status] ?? ''}`}>{o.status}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ id, outfitter, huntIds, onBack, onOpenQuote }: { id: string; outfitter: Outfitter | null; huntIds: string[]; onBack: () => void; onOpenQuote: (huntId: string) => void }) {
  const [f, setF] = useState({ name: outfitter?.name ?? '', contact_name: outfitter?.contact_name ?? '', email: outfitter?.email ?? '', phone: outfitter?.phone ?? '', country: outfitter?.country ?? '', farm_name: outfitter?.farm_name ?? '', commission_pct: outfitter?.commission_pct == null ? '' : String(outfitter.commission_pct), status: outfitter?.status ?? 'active' });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(id !== 'new');
  const [rec, setRec] = useState<Outfitter | null>(outfitter);
  const { rows } = useQuotePipeline();
  const mine = rows.filter(r => huntIds.includes(r.hunt_id));
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) { toast.error('Give the outfitter a name'); return; }
    setBusy(true);
    const payload = { name: f.name.trim(), contact_name: f.contact_name.trim() || null, email: f.email.trim() || null, phone: f.phone.trim() || null, country: f.country.trim() || null, farm_name: f.farm_name.trim() || null, commission_pct: f.commission_pct === '' ? null : Number(f.commission_pct), status: f.status };
    const r = id === 'new' && !rec
      ? await (supabase as any).from('outfitters').insert(payload).select('*').single()
      : await (supabase as any).from('outfitters').update(payload).eq('id', rec!.id).select('*').single();
    setBusy(false);
    if (r.error) { toast.error(r.error.message.includes('row-level') ? 'Only admins can change outfitters' : r.error.message); return; }
    setRec(r.data); setSaved(true); toast.success('Saved');
  }

  const link = rec?.invite_token ? inviteUrl('o_' + rec.invite_token) : null;
  const text = link ? `Hi ${(rec?.contact_name ?? rec?.name ?? '').split(' ')[0]}, ${WORKSHOP.name} has set you up on our outfitter portal. Register your hunters and their animals, and follow every trophy:\n${link}` : '';
  async function sent(ch: string) { if (rec) await (supabase as any).from('outfitters').update({ invite_sent_at: new Date().toISOString() }).eq('id', rec.id); toast.success(ch); }

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-base text-[#3AAECC] font-semibold min-h-11"><ArrowLeft className="w-4 h-4" />All outfitters</button>
      <h1 className="text-3xl font-bold text-slate-100">{id === 'new' && !rec ? 'New outfitter' : f.name}</h1>
      <section className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className={lab}>Business name *</label><input className={field} value={f.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label className={lab}>Contact person</label><input className={field} value={f.contact_name} onChange={e => set('contact_name', e.target.value)} /></div>
        <div><label className={lab}>Mobile / WhatsApp</label><input className={field} inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className={lab}>E-mail</label><input className={field} type="email" value={f.email} onChange={e => set('email', e.target.value)} /></div>
        <div><label className={lab}>Country</label><input className={field} value={f.country} onChange={e => set('country', e.target.value)} /></div>
        <div><label className={lab}>Farm / area</label><input className={field} value={f.farm_name} onChange={e => set('farm_name', e.target.value)} /></div>
        <div><label className={lab}>Commission % <span className="font-normal text-slate-500">(optional)</span></label><input className={field} inputMode="decimal" value={f.commission_pct} onChange={e => set('commission_pct', e.target.value)} /></div>
        <div><label className={lab}>Account</label><select className={field} value={f.status} onChange={e => set('status', e.target.value)}><option value="active">Active</option><option value="inactive">Inactive (cannot register hunts)</option><option value="suspended">Suspended</option></select></div>
      </section>
      <button className="w-full min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-60 flex items-center justify-center gap-2" disabled={busy} onClick={save}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Save</button>

      {rec && saved && link && (
        <section className="space-y-3 rounded-2xl border border-slate-700 bg-[#111c26] p-4">
          <h2 className="text-lg font-bold text-slate-100">Their link</h2>
          <p className="text-sm text-slate-400">{rec.auth_user_id ? 'This outfitter already has an account.' : 'They have not created an account yet.'}{rec.invite_sent_at ? ` Last sent ${new Date(rec.invite_sent_at).toLocaleDateString('en-ZA')}.` : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button disabled={!rec.phone} className="min-h-11 rounded-lg border border-slate-500 text-slate-100 font-semibold flex items-center justify-center gap-2 disabled:opacity-50" onClick={() => { window.open(whatsappUrl(rec.phone, text), '_blank', 'noopener'); sent('Opened WhatsApp'); }}><MessageCircle className="w-4 h-4 text-green-400" />WhatsApp</button>
            <a className={`min-h-11 rounded-lg border border-slate-500 text-slate-100 font-semibold flex items-center justify-center gap-2 ${rec.email ? '' : 'opacity-50 pointer-events-none'}`} href={`mailto:${rec.email ?? ''}?subject=${encodeURIComponent(`Your ${WORKSHOP.name} outfitter portal`)}&body=${encodeURIComponent(text)}`} onClick={() => sent('Opened your e-mail')}><Mail className="w-4 h-4" />E-mail</a>
            <button className="min-h-11 rounded-lg border border-slate-500 text-slate-100 font-semibold flex items-center justify-center gap-2" onClick={async () => { await navigator.clipboard.writeText(text); sent('Message copied'); }}><Copy className="w-4 h-4" />Copy message</button>
          </div>
        </section>
      )}

      {mine.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">Their hunts</h2>
          <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
            {mine.map(r => (
              <button key={r.hunt_id} onClick={() => onOpenQuote(r.hunt_id)} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-14 hover:bg-[#162330]">
                <span className="flex-1 min-w-0"><span className="block font-semibold text-slate-100">{r.client_name} <span className="font-mono text-xs text-slate-500">{r.ref_number}</span></span><span className="block text-xs text-slate-400">{STAGE_LABEL[r.stage]}{r.total != null ? ` · ${money(r.total, r.currency ?? 'USD')}, paid ${money(r.amount_paid, r.currency ?? 'USD')}` : ''}</span></span>
                {r.total != null && <span className="text-sm font-bold text-amber-300 tabular-nums">{money(Math.max(0, r.total - r.amount_paid), r.currency ?? 'USD')}</span>}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
