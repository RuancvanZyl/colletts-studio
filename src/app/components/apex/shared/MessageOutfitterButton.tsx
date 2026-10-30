/**
 * MessageOutfitterButton — "Message the outfitter about this client". Opens the hunt's conversation right here, already on the right
 * topic (and trophy), so staff never have to hunt for the thread or fall back to a private WhatsApp. Shown only when the hunt has an
 * outfitter and the person is allowed to write to outfitters.
 */
import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { OutfitterThread } from './OutfitterThread';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { TOPIC_LABEL } from '../../../../lib/threadTopics';

const cache = new Map<string, { outfitter: string; client: string } | null>();

export function MessageOutfitterButton({ huntId, topic = 'general', docId = null, label, className = '' }: { huntId: string; topic?: string; docId?: string | null; label?: string; className?: string }) {
  const { profile } = useAuth();
  const canWrite = ['admin', 'studio_manager', 'bookkeeper'].includes(profile?.role ?? '') || ((profile as any)?.manages_departments?.length ?? 0) > 0;
  const [who, setWho] = useState<{ outfitter: string; client: string } | null | undefined>(cache.get(huntId));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!canWrite || cache.has(huntId)) return;
    (async () => {
      const { data } = await (supabase as any).from('client_hunts').select('outfitter_id, outfitters(name), clients(full_name)').eq('id', huntId).maybeSingle();
      const v = data?.outfitter_id ? { outfitter: data.outfitters?.name ?? 'the outfitter', client: data.clients?.full_name ?? 'the hunter' } : null;
      cache.set(huntId, v); setWho(v);
    })();
  }, [huntId, canWrite]);

  if (!canWrite || !who) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className={`min-h-11 px-3 rounded-lg border border-slate-400 text-slate-700 dark:text-slate-200 text-sm font-semibold inline-flex items-center gap-1.5 ${className}`}><MessageSquare className="w-4 h-4" />{label ?? `Message ${who.outfitter} about ${who.client}`}</button>
      {open && (
        <Dialog open onOpenChange={(o: boolean) => { if (!o) setOpen(false); }}>
          <DialogContent className="max-w-xl max-h-[94vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-xl">{who.outfitter} about {who.client}</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-400">This message is saved under <strong className="text-slate-200">{TOPIC_LABEL[topic] ?? 'General'}</strong>{docId ? ' and tied to this trophy' : ''}. You can change the topic below the box.</p>
            <OutfitterThread huntId={huntId} side="workshop" canWrite topic={topic} docId={docId} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
