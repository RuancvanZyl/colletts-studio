import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { PhotoGallery } from './TrophyPhotos';

/** The photos the hunter took in the field, to compare with the animal when it is checked in. */
export function HunterPhotosButton({ huntId, clientName }: { huntId: string; clientName?: string }) {
  const [n, setN] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    (async () => {
      const { count } = await (supabase as any).from('trophy_photos').select('id', { count: 'exact', head: true }).eq('hunt_id', huntId).in('kind', ['hunt', 'reference']);
      setN(count ?? 0);
    })();
  }, [huntId]);
  if (n === null) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Camera className="w-4 h-4" />Hunter's photos ({n})
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{clientName ? `${clientName}: ` : ''}photos from the hunter</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Taken by the hunter in the field. Use them to check each animal when it arrives.</p>
          <PhotoGallery huntId={huntId} kinds={['hunt', 'reference']} empty="The hunter has not added any photos yet." />
        </DialogContent>
      </Dialog>
    </>
  );
}
