/** Quotes: the manager's pipeline and the hunter's own quotes. */
import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';

export const money = (n: number | null | undefined, currency: string) =>
  n == null ? '—' : `${currency === 'ZAR' ? 'R ' : 'US$ '}${Number(n).toLocaleString(currency === 'ZAR' ? 'en-ZA' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export interface PipelineRow {
  hunt_id: string; client_id: string; client_name: string; client_number: string | null; ref_number: string | null; client_type: string | null;
  animals: number; chosen: number; quote_id: string | null; quote_status: string | null; currency: string | null; deposit_percent: number | null;
  total: number | null; amount_paid: number; amount_due_now: number | null; payment_option: string | null; stage: string; sent_at: string | null; accepted_at: string | null;
}

export const STAGE_LABEL: Record<string, string> = {
  to_quote: 'Needs a quote', draft: 'Quote not sent yet', sent: 'Waiting for the hunter', declined: 'Hunter asked for changes',
  awaiting_deposit: 'Waiting for payment', authorised: 'Work can start',
};

export function useQuotePipeline() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);   // only the first load shows a spinner; refreshes update quietly
  const load = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true);
    const { data } = await (supabase as any).from('v_quote_pipeline').select('*').order('client_name');
    setRows((data ?? []).map((r: any) => ({ ...r, animals: Number(r.animals), chosen: Number(r.chosen), total: r.total == null ? null : Number(r.total), amount_paid: Number(r.amount_paid ?? 0), amount_due_now: r.amount_due_now == null ? null : Number(r.amount_due_now), deposit_percent: r.deposit_percent == null ? null : Number(r.deposit_percent) })));
    setLoading(false); loadedOnce.current = true;
  }, []);
  useEffect(() => { load(); }, [load]);
  return { rows, loading, refresh: load };
}

export interface QuoteLine { id?: string; hunt_doc_id: string | null; description: string; amount: number | null; kind?: 'item' | 'credit' | 'hide_purchase'; stock_reference?: string | null; amendment_id?: string | null; credit_for_line_id?: string | null }
export interface Amendment { id: string; quote_id: string; credit_no: string | null; reason: string; client_agreed: string; credit_total: number; added_total: number; created_by_name: string | null; created_at: string }
export interface QuotePayment { id: string; amount: number; method: string | null; reference: string | null; source: string; received_at: string }
export interface Quote {
  id: string; hunt_id: string; status: string; currency: string; deposit_percent: number; note: string | null; hunter_comment: string | null;
  payment_option: string | null; amount_due_now: number | null; sent_at: string | null; accepted_at: string | null;
  xero_invoice_number: string | null; xero_invoice_url: string | null; lines: QuoteLine[]; payments: QuotePayment[]; amendments: Amendment[];
}

export async function loadQuotes(filter: { huntId?: string; clientId?: string }): Promise<Quote[]> {
  let q = (supabase as any).from('quotes').select('*').order('created_at', { ascending: false });
  if (filter.huntId) q = q.eq('hunt_id', filter.huntId);
  if (filter.clientId) q = q.eq('client_id', filter.clientId);
  const { data: quotes } = await q;
  const ids = (quotes ?? []).map((x: any) => x.id);
  if (!ids.length) return [];
  const [l, p, am] = await Promise.all([
    (supabase as any).from('quote_lines').select('*').in('quote_id', ids).order('sort_order'),
    (supabase as any).from('quote_payments').select('*').in('quote_id', ids).order('received_at'),
    (supabase as any).from('quote_amendments').select('*').in('quote_id', ids).order('created_at'),
  ]);
  return (quotes ?? []).map((x: any) => ({
    ...x, deposit_percent: Number(x.deposit_percent), amount_due_now: x.amount_due_now == null ? null : Number(x.amount_due_now),
    lines: (l.data ?? []).filter((y: any) => y.quote_id === x.id).map((y: any) => ({ ...y, amount: y.amount == null ? null : Number(y.amount) })),
    payments: (p.data ?? []).filter((y: any) => y.quote_id === x.id).map((y: any) => ({ ...y, amount: Number(y.amount) })),
    amendments: (am.data ?? []).filter((y: any) => y.quote_id === x.id).map((y: any) => ({ ...y, credit_total: Number(y.credit_total), added_total: Number(y.added_total) })),
  }));
}

export function useHunterQuotes(clientId: string | undefined) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const load = useCallback(async () => { if (clientId) setQuotes(await loadQuotes({ clientId })); }, [clientId]);
  useEffect(() => { load(); }, [load]);
  return { quotes, refresh: load };
}
