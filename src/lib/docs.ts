/** Documents: wording, uploads and signed links. One place so the workshop, outfitter and hunter all say the same thing. */
import { supabase } from './supabase';
import { shrinkPhoto } from './offline/photos';

export type DocStatus = 'awaiting' | 'received' | 'approved' | 'rejected' | 'not_needed';
export type Responsible = 'outfitter' | 'hunter' | 'workshop' | 'authority';

export const PROVINCES = ['Limpopo', 'Mpumalanga', 'Free State', 'North West', 'KwaZulu-Natal', 'Northern Cape', 'Eastern Cape', 'Western Cape', 'Gauteng'];

export const RESPONSIBLE_LABEL: Record<string, string> = { outfitter: 'The outfitter', hunter: 'The hunter', workshop: 'The workshop', authority: 'The authorities' };
export const STATUS_LABEL: Record<string, string> = { awaiting: 'Not received yet', received: 'Received, to be checked', approved: 'Approved', rejected: 'Sent back to be corrected', not_needed: 'Not needed' };
export const STATUS_TONE: Record<string, string> = { awaiting: 'bg-amber-100 text-amber-900', received: 'bg-sky-100 text-sky-900', approved: 'bg-green-100 text-green-900', rejected: 'bg-red-100 text-red-900', not_needed: 'bg-slate-100 text-slate-700' };

/** Days since a date, as a short phrase. */
export const waiting = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d < 1 ? 'today' : d === 1 ? '1 day' : `${d} days`;
};

/** What the hunter reads against each document: honest about who is holding it up. */
export function hunterWording(i: { status: string; responsible: string; reason?: string | null }, outfitter: string | null): { text: string; tone: 'ok' | 'wait' | 'bad' | 'info' } {
  if (i.status === 'approved') return { text: 'Approved', tone: 'ok' };
  if (i.status === 'received') return { text: 'Received. The workshop is checking it', tone: 'info' };
  if (i.status === 'rejected') return { text: `Sent back to be corrected${i.reason ? `: ${i.reason}` : ''}. ${i.responsible === 'outfitter' ? `${outfitter ?? 'Your outfitter'} has been asked to fix it.` : 'Please send it again.'}`, tone: 'bad' };
  if (i.responsible === 'outfitter') return { text: `Waiting for ${outfitter ?? 'your outfitter'} to send this`, tone: 'wait' };
  if (i.responsible === 'hunter') return { text: 'Waiting for you to send this', tone: 'wait' };
  if (i.responsible === 'authority') return { text: 'With the authorities', tone: 'wait' };
  return { text: 'The workshop is preparing this', tone: 'info' };
}

/** Upload scans or photos for a hunt; returns the stored paths. */
export async function uploadHuntFiles(huntId: string, files: File[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    const isPdf = f.type === 'application/pdf';
    const body: Blob = isPdf ? f : await shrinkPhoto(f, 2400, 0.88);
    const path = `${huntId}/${crypto.randomUUID()}.${isPdf ? 'pdf' : 'jpg'}`;
    const { error } = await (supabase as any).storage.from('hunt-documents').upload(path, body, { contentType: isPdf ? 'application/pdf' : 'image/jpeg' });
    if (error) throw new Error(error.message);
    out.push(path);
  }
  return out;
}

export async function openHuntFile(path: string) {
  const { data, error } = await (supabase as any).storage.from('hunt-documents').createSignedUrl(path, 600);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Could not open the file');
  window.open(data.signedUrl, '_blank', 'noopener');
}
