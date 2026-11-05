/** ChangePassword — a person chooses their own new password (staff, outfitters and hunters). */
import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useBack } from '../../../../lib/back';

export function ChangePasswordButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = () => { setOpen(false); setPw(''); setAgain(''); setShow(false); };
  useBack(open, close);

  async function save() {
    if (pw.length < 8) { toast.error('Your password needs at least 8 letters or numbers.'); return; }
    if (pw !== again) { toast.error('The two passwords are not the same. Please type them again.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(/same/i.test(error.message) ? 'That is your password already. Please choose a different one.' : error.message); return; }
    toast.success('Your password was changed. Use it the next time you sign in.');
    close();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 text-xs font-semibold underline min-h-9 ${className}`}>
        <KeyRound className="w-3.5 h-3.5" />Change my password
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl m-auto w-full max-w-sm p-6 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Change my password</h3>
              <button onClick={close} aria-label="Close" className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Choose a new password. Use at least 8 letters or numbers that only you know.</p>
            <label className="block text-sm font-semibold">New password
              <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password"
                className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-base font-normal" />
            </label>
            <label className="block text-sm font-semibold">Type it again
              <input type={show ? 'text' : 'password'} value={again} onChange={e => setAgain(e.target.value)} autoComplete="new-password"
                className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-base font-normal" />
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />Show what I type</label>
            <div className="flex gap-3 pt-1">
              <button onClick={close} className="flex-1 min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold">Cancel</button>
              <button onClick={save} disabled={busy} className="flex-1 min-h-11 rounded-lg bg-[#3AAECC] text-black font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Save new password'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
