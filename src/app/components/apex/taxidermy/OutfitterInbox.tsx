/** OutfitterInbox — the workshop's conversations with outfitters, one thread per hunt. */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { OutfitterThread } from '../shared/OutfitterThread';

interface M { hunt_id: string; sender: string; body: string; read_at: string | null; created_at: string; client_hunts: { ref_number: string | null; clients: { full_name: string } | null } | null; outfitters: { name: string } | null }

export function OutfitterInbox({ onOpenDocs, initialHuntId }: { onOpenDocs: (huntId: string) => void; initialHuntId?: string }) {
  const { profile } = useAuth();
  const canWrite = ['admin', 'studio_manager', 'bookkeeper'].includes(profile?.role ?? '') || (profile as any)?.manages_departments?.length > 0;
  const [msgs, setMsgs] = useState<M[] | null>(null);
  const [open, setOpen] = useState<string | null>(initialHuntId ?? null);
  const [starting, setStarting] = useState(false);
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);

  const load = async () => {
    const { data } = await (supabase as any).from('outfitter_messages').select('hunt_id, sender, body, read_at, created_at, client_hunts(ref_number, clients(full_name)), outfitters(name)').order('created_at', { ascending: false }).limit(500);
    setMsgs(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const threads = useMemo(() => {
    const m = new Map<string, { id: string; client: string; ref: string; outfitter: string; last: M; unread: number }>();
    for (const x of msgs ?? []) {
      const t = m.get(x.hunt_id);
      if (!t) m.set(x.hunt_id, { id: x.hunt_id, client: x.client_hunts?.clients?.full_name ?? 'Hunter', ref: x.client_hunts?.ref_number ?? '', outfitter: x.outfitters?.name ?? '', last: x, unread: x.sender === 'outfitter' && !x.read_at ? 1 : 0 });
      else if (x.sender === 'outfitter' && !x.read_at) t.unread++;
    }
    return [...m.values()];
  }, [msgs]);

  async function startNew() {
    setStarting(true);
    const { data } = await (supabase as any).from('client_hunts').select('id, ref_number, clients(full_name), outfitters(name)').not('outfitter_id', 'is', null).eq('status', 'active').order('created_at', { ascending: false }).limit(80);
    setOptions((data ?? []).map((h: any) => ({ id: h.id, label: `${h.clients?.full_name ?? 'Hunter'} · ${h.ref_number ?? ''} · ${h.outfitters?.name ?? ''}` })));
  }

  if (open) {
    const t = threads.find(x => x.id === open);
    return (
      <div className="max-w-2xl space-y-4">
        <button onClick={() => { setOpen(null); setStarting(false); load(); }} className="inline-flex items-center gap-1.5 text-base text-[#3AAECC] font-semibold min-h-11"><ArrowLeft className="w-4 h-4" />All conversations</button>
        <div><h1 className="text-2xl font-bold text-slate-100">{t?.client ?? options.find(o => o.id === open)?.label.split(' · ')[0] ?? 'Hunter'}</h1><p className="text-slate-400">{t ? `${t.ref} · ${t.outfitter}` : ''}</p></div>
        <OutfitterThread huntId={open} side="workshop" canWrite={canWrite} />
        <button className="text-[#3AAECC] font-semibold min-h-11 underline" onClick={() => onOpenDocs(open)}>Open this hunt's documents</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-slate-100">Outfitter chat</h1><p className="text-base text-slate-400 mt-1">One conversation per hunter, so nothing gets mixed up.</p></div>
        {canWrite && <button className="min-h-12 px-4 rounded-xl bg-[#0073ea] text-white font-bold flex items-center gap-2 shrink-0" onClick={startNew}><Plus className="w-5 h-5" />New</button>}
      </div>
      {starting && (
        <div className="rounded-2xl border border-slate-600 bg-[#111c26] p-3 space-y-2">
          <p className="text-sm font-semibold text-slate-300">Which hunter is it about?</p>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">{options.length === 0 ? <p className="text-slate-400 p-3 text-sm">No hunts with an outfitter yet.</p> : options.map(o => <button key={o.id} className="w-full text-left px-2 py-3 min-h-12 text-slate-100 hover:bg-[#162330]" onClick={() => setOpen(o.id)}>{o.label}</button>)}</div>
        </div>
      )}
      {!msgs && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}
      {msgs && threads.length === 0 && !starting && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">No conversations yet.</p>}
      <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
        {threads.map(t => (
          <button key={t.id} onClick={() => setOpen(t.id)} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-16 hover:bg-[#162330]">
            <span className="flex-1 min-w-0"><span className="block text-lg font-semibold text-slate-100">{t.client} <span className="text-sm font-normal text-slate-500">via {t.outfitter}</span></span><span className="block text-sm text-slate-400 truncate">{t.last.sender === 'workshop' ? 'You: ' : ''}{t.last.body}</span></span>
            {t.unread > 0 && <span className="min-w-6 h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{t.unread}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
