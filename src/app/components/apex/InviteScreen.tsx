/**
 * InviteScreen — where a hunter lands from the workshop's welcome message.
 * They see what the workshop received, create their profile (two short steps) and go straight to
 * their trophies. The profile the workshop already made for them is linked automatically.
 */
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Trophy as TrophyIcon, AlertCircle } from 'lucide-react';
import { supabase, clearInviteToken } from '../../../lib/supabase';
import { WORKSHOP } from '../../../lib/workshop';
import { PART_LABEL } from '../../../lib/received';

interface Info { first_name: string; full_name: string; email: string | null; phone: string | null; client_type: string; registered: boolean; animals: { species: string; parts: { code: string; label?: string }[]; received_at: string }[] }

const field = 'w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 min-h-12 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600';
const label = 'block text-sm font-semibold text-slate-700 mb-1';
const primary = 'w-full rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold min-h-12 text-base disabled:opacity-50 flex items-center justify-center gap-2';

export function InviteScreen({ token, onDone, onSignIn, onAccountCreated }: { token: string; onDone: () => void; onSignIn: () => void; onAccountCreated?: () => void }) {
  const [info, setInfo] = useState<Info | null | undefined>(undefined);
  const [step, setStep] = useState<'account' | 'details' | 'check-email'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc('get_invite_info', { p_token: token });
      setInfo(data ?? null);
      if (data) { setEmail(data.email ?? ''); setPhone(data.phone ?? ''); }
    })();
  }, [token]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    setError(null);
    if (password.length < 8) { setError('Please choose a password of at least 8 characters.'); return; }
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: {
        emailRedirectTo: WORKSHOP.portalUrl,
        data: { full_name: info.full_name, phone: phone.trim() || null, client_type: info.client_type, portal_type: 'hunter', invite_token: token },
      },
    });
    setBusy(false);
    if (err) {
      setError(/already/i.test(err.message) ? 'There is already an account with this e-mail address. Sign in instead — your trophies will be added to it.' : err.message);
      return;
    }
    if (!data.session) { setStep('check-email'); return; }     // e-mail confirmation switched on
    onAccountCreated?.();
    setStep('details');
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase as any).from('clients').update({
        phone: phone.trim() || null, country: country.trim() || null, address: address.trim() || null, onboarding_status: 'complete',
      }).eq('auth_user_id', user.id);
    }
    setBusy(false);
    clearInviteToken();
    onDone();
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-green-50 to-lime-50 flex items-start sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
        <div className="bg-[#14301f] text-white px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-600/30 flex items-center justify-center"><TrophyIcon className="w-5 h-5 text-amber-200" /></div>
          <div><p className="font-bold leading-tight">{WORKSHOP.name}</p><p className="text-xs text-green-200">Hunter portal</p></div>
        </div>
        <div className="p-6 space-y-5">{children}</div>
      </div>
    </div>
  );

  if (info === undefined) return shell(<div className="flex items-center justify-center py-10 text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>);

  if (info === null) {
    return shell(<>
      <div className="flex items-start gap-3"><AlertCircle className="w-6 h-6 text-amber-500 shrink-0" /><div>
        <h1 className="text-lg font-bold text-slate-900">This link is not valid</h1>
        <p className="text-sm text-slate-600 mt-1">It may have been copied incompletely. Please ask {WORKSHOP.name} to send your link again.</p>
      </div></div>
      <button className={primary} onClick={onSignIn}>I already have an account — sign in</button>
    </>);
  }

  if (info.registered && step === 'account') {
    return shell(<>
      <h1 className="text-xl font-bold text-slate-900">Welcome back, {info.first_name}</h1>
      <p className="text-sm text-slate-600">You already have a profile. Sign in to see your trophies and choose your mounts.</p>
      <button className={primary} onClick={onSignIn}>Sign in</button>
    </>);
  }

  if (step === 'check-email') {
    return shell(<>
      <CheckCircle2 className="w-10 h-10 text-green-600" />
      <h1 className="text-xl font-bold text-slate-900">Check your e-mail</h1>
      <p className="text-sm text-slate-600">We sent a confirmation link to <strong>{email}</strong>. Open it, then sign in to see your trophies.</p>
      <button className={primary} onClick={onSignIn}>Go to sign in</button>
    </>);
  }

  if (step === 'details') {
    return shell(<>
      <div><p className="text-xs font-bold uppercase tracking-wide text-green-700">Step 2 of 2</p><h1 className="text-xl font-bold text-slate-900">A few details</h1>
        <p className="text-sm text-slate-600 mt-1">So we can reach you and know where your trophies are going.</p></div>
      <form onSubmit={saveDetails} className="space-y-4">
        <div><label className={label}>Mobile / WhatsApp</label><input className={field} inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 0100" /></div>
        <div><label className={label}>Country</label><input className={field} value={country} onChange={e => setCountry(e.target.value)} placeholder="USA" /></div>
        <div><label className={label}>Delivery address <span className="font-normal text-slate-400">(you can add this later)</span></label>
          <textarea className={`${field} py-2`} rows={3} value={address} onChange={e => setAddress(e.target.value)} /></div>
        <button className={primary} disabled={busy}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Show me my trophies</button>
        <button type="button" className="w-full text-sm text-slate-500 min-h-11" onClick={() => { clearInviteToken(); onDone(); }}>Skip for now</button>
      </form>
    </>);
  }

  const partNames = (a: Info['animals'][number]) => a.parts.map(p => p.label ?? PART_LABEL[p.code] ?? p.code).join(', ');
  return shell(<>
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-green-700">Step 1 of 2</p>
      <h1 className="text-xl font-bold text-slate-900">Welcome, {info.first_name}</h1>
      <p className="text-sm text-slate-600 mt-1">
        {info.animals.length > 0 ? 'Thank you for choosing us. This is what we received from you:' : 'Create your profile to follow your trophies with us.'}
      </p>
    </div>
    {info.animals.length > 0 && (
      <ul className="rounded-xl border border-green-100 bg-green-50/60 divide-y divide-green-100">
        {info.animals.map((a, i) => (
          <li key={i} className="px-4 py-2.5 text-sm"><strong className="text-slate-900">{a.species}</strong>{a.parts.length > 0 && <span className="text-slate-600"> — {partNames(a)}</span>}</li>
        ))}
      </ul>
    )}
    <form onSubmit={createAccount} className="space-y-4">
      <p className="text-sm text-slate-600">Create your profile, then you can choose how you want each animal mounted.</p>
      <div><label className={label}>E-mail</label><input className={field} type="email" inputMode="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
      <div><label className={label}>Choose a password</label><input className={field} type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className={primary} disabled={busy}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Create my profile</button>
      <button type="button" className="w-full text-sm text-slate-500 min-h-11" onClick={onSignIn}>I already have an account</button>
    </form>
  </>);
}
