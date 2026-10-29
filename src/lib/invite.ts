/** Sending a hunter their invitation: copy the link, WhatsApp it, or e-mail it (and remember that we did). */
import { supabase } from './supabase';
import { WORKSHOP, inviteUrl } from './workshop';
import { listParts } from './received';

export interface InviteTarget {
  clientId: string; name: string; email?: string | null; phone?: string | null;
  registered: boolean;
  animals: { species: string; parts: string[]; other?: string }[];
}

export async function getInviteLink(clientId: string): Promise<string> {
  const { data, error } = await (supabase as any).from('clients').select('invite_token').eq('id', clientId).single();
  if (error || !data?.invite_token) throw new Error(error?.message ?? 'No sign-up link could be made for this hunter. Please tell the office.');
  return inviteUrl(data.invite_token);
}

export function inviteText(t: InviteTarget, url: string): string {
  const first = t.name.split(' ')[0] || 'there';
  const list = t.animals.map(a => `• ${a.species}${a.parts.length ? ` — ${listParts(a.parts, a.other)}` : ''}`).join('\n');
  return t.registered
    ? `Hi ${first}, your trophies have arrived at ${WORKSHOP.name}:\n${list}\n\nOpen your profile to see what we received and choose your mounts:\n${url}\n\nTip: once you are in, install the app on your phone. iPhone: open the link in Safari, tap Share, then Add to Home Screen. Android: tap the menu (three dots), then Install app.`
    : `Hi ${first}, thank you for choosing ${WORKSHOP.name}. We have received:\n${list}\n\nPlease create your profile and choose how you would like each animal mounted:\n${url}\n\nTip: once you are in, install the app on your phone. iPhone: open the link in Safari, tap Share, then Add to Home Screen. Android: tap the menu (three dots), then Install app.`;
}

/** South-African style numbers (082 123 4567) → international digits for wa.me */
export function whatsappUrl(phone: string | null | undefined, text: string): string {
  let d = (phone ?? '').replace(/[^\d]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0') && d.length === 10) d = '27' + d.slice(1);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

export async function markInviteSent(clientId: string, channel: 'whatsapp' | 'email' | 'link' | 'printed') {
  await (supabase as any).from('clients').update({ invite_sent_at: new Date().toISOString(), invite_channel: channel }).eq('id', clientId);
}

export async function emailInvite(t: InviteTarget, url: string): Promise<void> {
  if (!t.email) throw new Error('This hunter has no e-mail address on file');
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-hunter-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify({
      email: t.email, name: t.name, url, workshop: WORKSHOP.name, variant: t.registered ? 'arrived' : 'welcome',
      animals: t.animals.map(a => ({ species: a.species, parts: listParts(a.parts, a.other) })),
    }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out?.error ?? `E-mail failed (${res.status})`);
  await markInviteSent(t.clientId, 'email');
}
