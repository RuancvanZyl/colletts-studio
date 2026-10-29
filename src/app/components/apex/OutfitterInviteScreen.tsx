/** OutfitterInviteScreen — where an outfitter lands from the workshop's invitation link. */
import { useEffect, useState } from 'react';
import { Compass, Loader2, AlertCircle } from 'lucide-react';
import { supabase, clearInviteToken } from '../../../lib/supabase';
import { WORKSHOP } from '../../../lib/workshop';
import { InstallCard } from './shared/InstallApp';
import { plainError } from '../../../lib/plainError';

const field = 'w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 min-h-12 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600';
const primary = 'w-full rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold min-h-12 text-base disabled:opacity-50 flex items-center justify-center gap-2';

export function OutfitterInviteScreen({ token, onDone, onSignIn }: { token: string; onDone: () => void; onSignIn: () => void }) {
  const [info, setInfo] = useState<{ name: string; contact_name: string | null; email: string | null; registered: boolean } | null | undefined>(undefined);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [checkMail, setCheckMail] = useState(false); const [created, setCreated] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await (supabase as any).rpc('get_outfitter_invite_info', { p_token: token });
    setInfo(data ?? null); if (data?.email) setEmail(data.email);
  })(); }, [token]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 8) { setError('Please choose a password of at least 8 characters.'); return; }
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: WORKSHOP.portalUrl, data: { full_name: info?.contact_name ?? info?.name, company: info?.name, phone: phone.trim() || null, portal_type: 'outfitter', invite_token: token } },
    });
    setBusy(false);
    if (err) { setError(/already/i.test(err.message) ? 'There is already an account with this e-mail address. Sign in instead.' : err.message); return; }
    if (!data.session) { setCheckMail(true); return; }
    setCreated(true);
  }

  const shell = (c: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-green-50 to-lime-50 flex items-start sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
        <div className="bg-[#14301f] text-white px-6 py-5 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-600/30 flex items-center justify-center"><Compass className="w-5 h-5 text-amber-200" /></div><div><p className="font-bold leading-tight">{WORKSHOP.name}</p><p className="text-xs text-green-200">Outfitter portal</p></div></div>
        <div className="p-6 space-y-5">{c}</div>
      </div>
    </div>
  );

  if (info === undefined) return shell(<div className="flex justify-center py-10 text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>);
  if (info === null) return shell(<><div className="flex items-start gap-3"><AlertCircle className="w-6 h-6 text-amber-500 shrink-0" /><div><h1 className="text-lg font-bold text-slate-900">This link is not valid</h1><p className="text-sm text-slate-600 mt-1">Please ask {WORKSHOP.name} to send your link again.</p></div></div><button className={primary} onClick={onSignIn}>I already have an account</button></>);
  if (created) return shell(<><div><h1 className="text-xl font-bold text-slate-900">You are in</h1><p className="text-sm text-slate-600 mt-1">Your outfitter account is ready.</p></div><InstallCard /><button className={primary} onClick={() => { clearInviteToken(); onDone(); }}>Continue to my account</button></>);
  if (info.registered) return shell(<><h1 className="text-xl font-bold text-slate-900">Welcome back, {info.name}</h1><p className="text-sm text-slate-600">You already have an account. Sign in to register hunts and follow your hunters.</p><button className={primary} onClick={onSignIn}>Sign in</button></>);
  if (checkMail) return shell(<><h1 className="text-xl font-bold text-slate-900">Check your e-mail</h1><p className="text-sm text-slate-600">We sent a confirmation link to <strong>{email}</strong>. Open it, then sign in.</p><InstallCard /><button className={primary} onClick={onSignIn}>Go to sign in</button></>);

  return shell(<>
    <div><h1 className="text-xl font-bold text-slate-900">Welcome, {info.name}</h1><p className="text-sm text-slate-600 mt-1">Create your outfitter account to register your hunters and their animals with {WORKSHOP.name}, and follow every trophy.</p></div>
    <form onSubmit={create} className="space-y-4">
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">E-mail</label><input className={field} type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">Mobile / WhatsApp</label><input className={field} inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
      <div><label className="block text-sm font-semibold text-slate-700 mb-1">Choose a password</label><input className={field} type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></div>
      {error && <p className="text-sm text-red-600">{plainError(error)}</p>}
      <button className={primary} disabled={busy}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Create my account</button>
      <button type="button" className="w-full text-sm text-slate-500 min-h-11" onClick={onSignIn}>I already have an account</button>
    </form>
  </>);
}
