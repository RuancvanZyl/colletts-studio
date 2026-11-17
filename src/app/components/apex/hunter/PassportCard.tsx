import { useRef, useState } from 'react';
import { CheckCircle2, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { shrinkPhoto } from '../../../../lib/offline/photos';
import { plainError } from '../../../../lib/plainError';

/** An export client adds a photo of their passport. It is kept in their file at the workshop. */
export function PassportCard({ clientId, has, onSaved, intro }: { clientId: string; has: boolean; onSaved: () => void; intro?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function send(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      const isPdf = f.type === 'application/pdf';
      const body: Blob = isPdf ? f : await shrinkPhoto(f, 2400, 0.88);
      const path = `passports/${clientId}/passport-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${isPdf ? 'pdf' : 'jpg'}`;
      const { error: upErr } = await (supabase as any).storage.from('client-documents').upload(path, body, { contentType: isPdf ? 'application/pdf' : 'image/jpeg' });
      if (upErr) throw new Error(upErr.message);
      const { error } = await (supabase as any).rpc('hunter_save_passport', { p_path: path, p_file_name: f.name });
      if (error) throw new Error(error.message);
      toast.success('Thank you. Your passport photo is saved in your file.');
      onSaved();
    } catch (e: any) {
      toast.error(plainError(e?.message ?? 'Could not save your passport photo. Please try again.'));
    }
    setBusy(false);
  }

  return (
    <div className={`rounded-2xl border-2 p-4 space-y-3 ${has ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'}`}>
      {has ? (
        <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" />Your passport photo is in your file</p>
      ) : (
        <>
          <p className="font-bold text-slate-900 dark:text-slate-100">Please add a photo of your passport</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{intro ?? 'Because your trophies are going out of South Africa, we need a clear photo of the page with your photo and details. It is kept safely in your file and only the workshop can see it.'}</p>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { send(e.target.files?.[0]); e.target.value = ''; }} />
      <button disabled={busy} onClick={() => fileRef.current?.click()}
        className={`w-full min-h-12 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 ${has ? 'border-2 border-green-700 text-green-800 dark:text-green-300' : 'bg-green-700 hover:bg-green-800 text-white'}`}>
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}{has ? 'Replace my passport photo' : 'Add my passport photo'}
      </button>
    </div>
  );
}
