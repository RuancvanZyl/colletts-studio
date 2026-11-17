import { useEffect, useRef, useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { plainError } from '../../../../lib/plainError';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { HuntFilm, sortStory, type StoryPhoto } from '../../../../lib/huntFilm';
import { WORKSHOP } from '../../../../lib/workshop';

/** Staff watch a hunter's film (no watermark, nothing saved) to check the quality before or after the hunter does. */
export function StaffFilmDialog({ huntId, clientName, onClose }: { huntId: string; clientName: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filmRef = useRef<HuntFilm | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'playing' | 'empty'>('loading');
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: h } = await (supabase as any).from('client_hunts').select('start_date, end_date, operator, outfitters(name)').eq('id', huntId).maybeSingle();
        const { data: docs } = await (supabase as any).from('hunt_documents').select('form_data').eq('hunt_id', huntId).eq('doc_type', 'job_card');
        const { data: ph } = await (supabase as any).from('trophy_photos').select('id, storage_path, story_part, caption, taken_at').eq('hunt_id', huntId).eq('kind', 'hunt').order('taken_at');
        const story: StoryPhoto[] = [];
        for (const p of sortStory((ph ?? []).map((r: any) => ({ ...r, part: r.story_part, takenAt: r.taken_at })))) {
          const { data } = await (supabase as any).storage.from('client-photos').download((p as any).storage_path);
          if (data) story.push({ id: (p as any).id, blob: data, part: (p as any).story_part, caption: (p as any).caption, takenAt: (p as any).taken_at });
        }
        setCount(story.length);
        if (story.length === 0 || !canvasRef.current) { setState('empty'); return; }
        const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const logo = await (await fetch('/apex-logo-blue.jpg')).blob().catch(() => null);
        const film = new HuntFilm(canvasRef.current, story, {
          hunterName: clientName, dates: [fmt(h?.start_date), fmt(h?.end_date)].filter(Boolean).join(' – '), place: h?.outfitters?.name ?? h?.operator ?? '',
          species: [...new Set((docs ?? []).map((d: any) => d.form_data?.species).filter(Boolean))] as string[], appUrl: WORKSHOP.portalUrl, logo,
        });
        await film.load(); film.draw(2.4); filmRef.current = film; setState('ready');
      } catch (e: any) { toast.error(plainError(e?.message ?? 'The film could not be made.')); setState('empty'); }
    })();
    return () => { filmRef.current?.dispose(); filmRef.current = null; };
  }, [huntId, clientName]);

  function play() { const f = filmRef.current; if (!f) return; setState('playing'); f.play({ preview: false, music: true, onEnd: () => setState('ready') }); }

  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[94vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{clientName}: hunt film</DialogTitle></DialogHeader>
        <div className="relative mx-auto rounded-xl overflow-hidden bg-black" style={{ width: 'min(100%, 300px)', aspectRatio: '9 / 16' }}>
          <canvas ref={canvasRef} className="w-full h-full" />
          {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>}
          {state === 'ready' && <button onClick={play} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-black/35"><Play className="w-14 h-14" /><span className="font-bold">Watch the film</span></button>}
          {state === 'empty' && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white text-sm">This hunter has not added any hunt photos yet.</div>}
        </div>
        <p className="text-xs text-slate-500">{count} photo{count === 1 ? '' : 's'}. This is how the hunter's film looks, without the watermark. Nothing is saved.</p>
      </DialogContent>
    </Dialog>
  );
}
