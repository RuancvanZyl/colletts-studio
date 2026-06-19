import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type LineItemInsert = Database['public']['Tables']['invoice_line_items']['Insert'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

export type InvoiceWithDetails = Invoice & {
  clients: { full_name: string } | null;
  invoice_line_items: {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    job_id: string | null;
  }[];
  payments: {
    id: string;
    amount: number;
    payment_type: string | null;
    paid_at: string;
    method: string | null;
  }[];
};

export function useInvoices(clientId?: string) {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let q = supabase
      .from('invoices')
      .select(`
        *,
        clients(full_name),
        invoice_line_items(id, description, quantity, unit_price, line_total, job_id),
        payments(id, amount, payment_type, paid_at, method)
      `)
      .order('created_at', { ascending: false });
    if (clientId) q = q.eq('client_id', clientId);
    const { data } = await q;
    setInvoices((data ?? []) as InvoiceWithDetails[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [clientId]);

  async function createInvoice(invoice: InvoiceInsert, lineItems: Omit<LineItemInsert, 'invoice_id'>[]) {
    // Generate invoice number
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    const num = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;

    const { data, error } = await supabase
      .from('invoices')
      .insert({ ...invoice, invoice_number: num })
      .select()
      .single();
    if (error) return { error: error.message, data: null };

    if (lineItems.length > 0) {
      await supabase.from('invoice_line_items').insert(
        lineItems.map(li => ({ ...li, invoice_id: data.id }))
      );
    }

    await load();
    return { data, error: null };
  }

  async function recordPayment(payment: Omit<PaymentInsert, 'id'>) {
    const { error } = await supabase.from('payments').insert(payment);
    if (error) return { error: error.message };
    await load();
    return { error: null };
  }

  async function updateStatus(id: string, status: Invoice['status']) {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (!error) await load();
    return { error: error?.message ?? null };
  }

  return { invoices, loading, createInvoice, recordPayment, updateStatus, refresh: load };
}
