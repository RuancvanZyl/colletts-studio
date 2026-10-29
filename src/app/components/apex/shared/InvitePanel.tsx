/**
 * InvitePanel — get the hunter onto their profile: copy the link, WhatsApp it, e-mail it.
 * Used when trophies are checked in and on the hunter's profile page.
 */
import { useEffect, useState } from 'react';
import { Copy, Mail, MessageCircle, CheckCircle2, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { getInviteLink, inviteText, whatsappUrl, markInviteSent, emailInvite, type InviteTarget } from '../../../../lib/invite';
import { plainError } from '../../../../lib/plainError';

export function InvitePanel({ target, onPrintLetter, compact = false }: { target: InviteTarget; onPrintLetter?: (url: string | null) => void; compact?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [registered, setRegistered] = useState(target.registered);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await getInviteLink(target.clientId);
        const { data } = await (supabase as any).from('clients').select('invite_sent_at, invite_channel, auth_user_id').eq('id', target.clientId).single();
        if (!alive) return;
        setUrl(u); setSentAt(data?.invite_sent_at ?? null); setChannel(data?.invite_channel ?? null); setRegistered(!!data?.auth_user_id);
      } catch (e: any) { if (alive) setError(e.message); }
    })();
    return () => { alive = false; };
  }, [target.clientId]);

  const t: InviteTarget = { ...target, registered };
  const mark = async (ch: 'whatsapp' | 'email' | 'link' | 'printed') => { await markInviteSent(target.clientId, ch); setSentAt(new Date().toISOString()); setChannel(ch); };

  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(inviteText(t, url)); toast.success('Message and link copied — paste it into any chat or e-mail'); await mark('link'); }
    catch { window.prompt('Copy this message:', inviteText(t, url)); }
  }
  function whatsapp() {
    if (!url) return;
    if (!target.phone) { toast.error('No phone number on file for this hunter'); return; }
    window.open(whatsappUrl(target.phone, inviteText(t, url)), '_blank', 'noopener');
    mark('whatsapp');
  }
  async function email() {
    if (!url) return;
    setBusy(true);
    try { await emailInvite(t, url); setSentAt(new Date().toISOString()); setChannel('email'); toast.success(`E-mail sent to ${target.email}`); }
    catch (e: any) { toast.error(e.message + ' — use WhatsApp or Copy instead.'); }
    finally { setBusy(false); }
  }

  const btn = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold px-3 min-h-11 text-sm hover:border-[#0073ea] disabled:opacity-50';
  return (
    <div className={`rounded-xl border ${registered ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800'} ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-start gap-2">
        {registered ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {registered ? `${target.name.split(' ')[0]} has a profile on the hunter portal` : `${target.name.split(' ')[0]} has not created a profile yet`}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {registered ? 'Let them know their trophies arrived so they can choose their mounts.' : 'Send the welcome message with their sign-up link.'}
            {sentAt && <> · Last sent {new Date(sentAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}{channel ? ` by ${channel}` : ''}</>}
          </p>
        </div>
      </div>
      {error ? <p className="text-xs text-red-600">{plainError(error)}</p> : (
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button className={btn} onClick={whatsapp} disabled={!url}><MessageCircle className="w-4 h-4 text-green-600" />WhatsApp</button>
          <button className={btn} onClick={email} disabled={!url || busy || !target.email}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}E-mail</button>
          <button className={btn} onClick={copy} disabled={!url}><Copy className="w-4 h-4" />Copy message</button>
          {onPrintLetter && <button className={btn} onClick={() => { onPrintLetter(url); mark('printed'); }}><Printer className="w-4 h-4" />Print letter</button>}
        </div>
      )}
      {!error && !target.phone && !target.email && <p className="text-xs text-amber-700">No phone or e-mail on file — add one on the Client Info tab, or print the letter.</p>}
    </div>
  );
}
