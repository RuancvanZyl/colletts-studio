/** The topics a conversation with an outfitter is saved under (migration 064). */
export const TOPICS = [
  { key: 'general', label: 'General' },
  { key: 'documents', label: 'Documents' },
  { key: 'rejected_skin', label: 'Rejected skin' },
  { key: 'quote', label: 'Quote and payment' },
  { key: 'job_card', label: 'A trophy' },
] as const;
export type TopicKey = typeof TOPICS[number]['key'];
export const TOPIC_LABEL: Record<string, string> = Object.fromEntries(TOPICS.map(t => [t.key, t.label]));

/** A WhatsApp link for a South African or international number. Returns null when there is no usable number. */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  let d = (phone ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '27' + d.slice(1);
  if (d.length < 9) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
