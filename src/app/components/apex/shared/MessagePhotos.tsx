import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { messageFileUrl } from '../../../../lib/messageFiles';

/** The photos and PDFs that came with a message. Tap one to open it big. */
export function MessagePhotos({ paths }: { paths?: string[] | null }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = (paths ?? []).join('|');
  useEffect(() => {
    let live = true;
    (async () => {
      const next: Record<string, string> = {};
      for (const p of paths ?? []) { const u = await messageFileUrl(p); if (u) next[p] = u; }
      if (live) setUrls(next);
    })();
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!paths || paths.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {paths.map(p => {
        const pdf = p.toLowerCase().endsWith('.pdf');
        const u = urls[p];
        return (
          <a key={p} href={u} target="_blank" rel="noreferrer" aria-label={pdf ? 'Open the PDF' : 'Open the photo'}
             className="w-28 h-28 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            {pdf ? <span className="flex flex-col items-center text-xs text-slate-600 dark:text-slate-300"><FileText className="w-8 h-8" />PDF</span>
              : u ? <img src={u} alt="Photo in the message" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-400">Loading…</span>}
          </a>
        );
      })}
    </div>
  );
}
