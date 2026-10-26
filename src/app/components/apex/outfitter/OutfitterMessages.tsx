/** OutfitterMessages — one conversation with the workshop per hunter, so each client is a separate query. */
import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useOutfitter } from '../../../../lib/hooks/useOutfitter';
import { OutfitterThread } from '../shared/OutfitterThread';

export function OutfitterMessages({ initialHuntId }: { initialHuntId?: string | null }) {
  const { data, loading } = useOutfitter();
  const [open, setOpen] = useState<string | null>(initialHuntId ?? null);
  const [unread, setUnread] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data: m } = await (supabase as any).from('outfitter_messages').select('hunt_id').eq('sender', 'workshop').is('read_at', null);
      const c: Record<string, number> = {};
      for (const x of m ?? []) c[x.hunt_id] = (c[x.hunt_id] ?? 0) + 1;
      setUnread(c);
    })();
  }, [open]);

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  const hunts = data?.hunts ?? [];
  const current = hunts.find(h => h.id === open);

  if (open) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button onClick={() => setOpen(null)} className="inline-flex items-center gap-1.5 text-base text-green-800 dark:text-green-300 font-semibold min-h-11"><ArrowLeft className="w-4 h-4" />All hunters</button>
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{current?.hunter ?? 'Hunter'}</h1><p className="text-sm text-slate-600 dark:text-slate-300">This conversation is only about this hunter, so nothing gets mixed up.</p></div>
        <OutfitterThread huntId={open} side="outfitter" />
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Messages</h1><p className="text-sm text-slate-600 dark:text-slate-300">Pick a hunter to talk to the workshop about them.</p></div>
      {hunts.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-slate-500">Register a hunt first, then you can message the workshop about it.</p>}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {hunts.map(h => (
          <button key={h.id} onClick={() => setOpen(h.id)} className="w-full text-left px-4 py-3 min-h-16 flex items-center gap-3">
            <span className="flex-1 min-w-0"><span className="block text-lg font-semibold text-slate-900 dark:text-slate-100">{h.hunter}</span><span className="block text-sm text-slate-500">{h.animals.length} animal{h.animals.length === 1 ? '' : 's'}</span></span>
            {unread[h.id] > 0 && <span className="min-w-6 h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{unread[h.id]}</span>}
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
