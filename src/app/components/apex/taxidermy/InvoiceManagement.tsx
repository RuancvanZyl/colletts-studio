import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { FileText, Plus, Search, RefreshCw, CreditCard, Loader2, ChevronRight, Trash2, AlertTriangle, Link2, Link2Off, ExternalLink } from 'lucide-react';
import { useInvoices } from '../../../../lib/hooks/useInvoices';
import { useClients } from '../../../../lib/hooks/useClients';
import { getXeroStatus, startXeroOAuth, clearXeroConnection, pushInvoiceToXero } from '../../../../lib/xero';
import { toast } from 'sonner';
import type { InvoiceWithDetails } from '../../../../lib/hooks/useInvoices';
import type { Database } from '../../../../lib/database.types';

type InvoiceStatus = Database['public']['Tables']['invoices']['Row']['status'];

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-800',
  partially_paid: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-500 line-through',
};

interface LineItem { description: string; quantity: string; unit_price: string }

const EMPTY_LINE: LineItem = { description: '', quantity: '1', unit_price: '0' };

export function InvoiceManagement() {
  const { invoices, loading, createInvoice, recordPayment, updateStatus, refresh } = useInvoices();
  const { clients } = useClients();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InvoiceWithDetails | null>(null);
  const [xeroStatus] = useState(() => getXeroStatus());
  const [xeroPushing, setXeroPushing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [newClientId, setNewClientId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDeposit, setNewDeposit] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...EMPTY_LINE }]);

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState<'deposit' | 'progress' | 'final'>('deposit');
  const [payMethod, setPayMethod] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    return !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.clients?.full_name.toLowerCase().includes(q);
  });

  const totalAmount = (inv: InvoiceWithDetails) => inv.invoice_line_items.reduce((s, li) => s + li.line_total, 0);
  const totalPaid = (inv: InvoiceWithDetails) => inv.payments.reduce((s, p) => s + p.amount, 0);
  const balance = (inv: InvoiceWithDetails) => totalAmount(inv) - totalPaid(inv);

  function addLine() { setLineItems(prev => [...prev, { ...EMPTY_LINE }]); }
  function removeLine(i: number) { setLineItems(prev => prev.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: keyof LineItem, val: string) {
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: val } : li));
  }

  const lineTotal = (li: LineItem) => Number(li.quantity) * Number(li.unit_price);
  const invoiceTotal = lineItems.reduce((s, li) => s + lineTotal(li), 0);

  async function handlePushToXero(inv: InvoiceWithDetails) {
    if (!xeroStatus.connected) { toast.error('Connect Xero first in Admin → Integrations'); return; }
    const client = clients.find(c => c.id === inv.client_id);
    setXeroPushing(true);
    const result = await pushInvoiceToXero({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      clientName: inv.clients?.full_name ?? 'Unknown',
      clientEmail: client?.email ?? null,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      currency: inv.currency,
      lineItems: inv.invoice_line_items.map(li => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unit_price,
      })),
      depositAmount: inv.deposit_amount,
      notes: inv.notes,
    });
    setXeroPushing(false);
    if (result.error) { toast.error(`Xero sync failed: ${result.error}`); return; }
    toast.success(`Synced to Xero — ${result.xeroInvoiceNumber}`);
  }

  async function handleCreate() {
    if (!newClientId) { toast.error('Select a client'); return; }
    if (lineItems.every(li => !li.description.trim())) { toast.error('Add at least one line item'); return; }
    setSaving(true);
    const result = await createInvoice(
      {
        client_id: newClientId,
        status: 'draft',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: newDueDate || null,
        currency: 'ZAR',
        deposit_amount: newDeposit ? Number(newDeposit) : null,
        notes: newNotes || null,
        invoice_number: '', // generated by hook
      },
      lineItems.filter(li => li.description.trim()).map(li => ({
        description: li.description,
        quantity: Number(li.quantity),
        unit_price: Number(li.unit_price),
      }))
    );
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Invoice created');
    setCreateOpen(false);
    setNewClientId(''); setNewDueDate(''); setNewDeposit(''); setNewNotes('');
    setLineItems([{ ...EMPTY_LINE }]);
  }

  async function handlePayment() {
    if (!selected) return;
    if (!payAmount || Number(payAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (!payMethod) { toast.error('Select payment method'); return; }
    setSaving(true);
    const result = await recordPayment({
      invoice_id: selected.id,
      amount: Number(payAmount),
      payment_type: payType,
      paid_at: new Date().toISOString(),
      method: payMethod,
      notes: payNotes || null,
      payfast_payment_id: null,
    });
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Payment recorded');
    setPayOpen(false);
    setPayAmount(''); setPayMethod(''); setPayNotes('');
    // refresh selected
    refresh();
  }

  async function markSent(inv: InvoiceWithDetails) {
    await updateStatus(inv.id, 'sent');
    toast.success('Marked as sent');
  }

  const summaryStats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    unpaid: invoices.filter(i => ['sent', 'partially_paid', 'overdue'].includes(i.status)).length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Invoicing</h1>
          <p className="text-slate-600 dark:text-slate-400">Create and manage client invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />New Invoice
          </Button>
        </div>
      </div>

      {/* Xero connection status */}
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${xeroStatus.connected ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'}`}>
        {xeroStatus.connected
          ? <Link2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          : <Link2Off className="w-4 h-4 text-amber-600 flex-shrink-0" />
        }
        <div className="flex-1 text-sm">
          {xeroStatus.connected
            ? <span className="text-green-800 dark:text-green-200">Connected to Xero — <strong>{xeroStatus.tenantName}</strong></span>
            : <span className="text-amber-800 dark:text-amber-200">Xero not connected — invoices won't sync automatically</span>
          }
        </div>
        {xeroStatus.connected
          ? <button onClick={() => { clearXeroConnection(); window.location.reload(); }} className="text-xs text-red-500 hover:underline">Disconnect</button>
          : <button onClick={startXeroOAuth} className="text-xs text-[#0073ea] hover:underline flex items-center gap-1">Connect Xero <ExternalLink className="w-3 h-3" /></button>
        }
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: summaryStats.total, color: 'text-slate-700' },
          { label: 'Draft', value: summaryStats.draft, color: 'text-slate-500' },
          { label: 'Awaiting Payment', value: summaryStats.unpaid, color: 'text-amber-600' },
          { label: 'Overdue', value: summaryStats.overdue, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice number or client..." className="pl-10" />
          </div>

          {loading ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No invoices yet</p></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(inv => (
                    <div
                      key={inv.id}
                      onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
                      className={`flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors ${selected?.id === inv.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-medium">{inv.invoice_number}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>{inv.status.replace('_', ' ')}</span>
                          {inv.status === 'overdue' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{inv.clients?.full_name ?? '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-slate-100">R {totalAmount(inv).toLocaleString()}</p>
                        {balance(inv) > 0 && (
                          <p className="text-xs text-amber-600">R {balance(inv).toLocaleString()} outstanding</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Invoice detail */}
        <div>
          {selected ? (
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {selected.invoice_number}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-500">Client</p>
                  <p className="font-medium">{selected.clients?.full_name ?? '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-slate-500">Issued</p><p>{new Date(selected.issue_date).toLocaleDateString()}</p></div>
                  {selected.due_date && <div><p className="text-slate-500">Due</p><p className={new Date(selected.due_date) < new Date() && selected.status !== 'paid' ? 'text-red-600 font-medium' : ''}>{new Date(selected.due_date).toLocaleDateString()}</p></div>}
                </div>

                {/* Line items */}
                <div>
                  <p className="text-slate-500 mb-2">Line Items</p>
                  <div className="space-y-1">
                    {selected.invoice_line_items.map(li => (
                      <div key={li.id} className="flex justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-300">{li.description} × {li.quantity}</span>
                        <span className="font-medium">R {li.line_total.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>Total</span><span>R {totalAmount(selected).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payments */}
                {selected.payments.length > 0 && (
                  <div>
                    <p className="text-slate-500 mb-2">Payments</p>
                    {selected.payments.map(p => (
                      <div key={p.id} className="flex justify-between text-xs text-green-700 dark:text-green-400">
                        <span>{p.payment_type} · {p.method}</span>
                        <span>R {p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>Balance</span>
                      <span className={balance(selected) > 0 ? 'text-amber-600' : 'text-green-600'}>
                        R {balance(selected).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {selected.notes && (
                  <p className="text-xs text-slate-500 italic">{selected.notes}</p>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  {selected.status === 'draft' && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => markSent(selected)}>
                      <FileText className="w-3 h-3 mr-2" />Mark as Sent
                    </Button>
                  )}
                  {['sent', 'partially_paid', 'overdue'].includes(selected.status) && (
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => { setPayOpen(true); }}>
                      <CreditCard className="w-3 h-3 mr-2" />Record Payment
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="w-full" onClick={() => handlePushToXero(selected)} disabled={xeroPushing || !xeroStatus.connected}>
                    {xeroPushing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <ExternalLink className="w-3 h-3 mr-2" />}
                    {xeroStatus.connected ? 'Sync to Xero' : 'Connect Xero to sync'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed sticky top-20">
              <CardContent className="py-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Select an invoice to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create invoice dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select value={newClientId} onValueChange={setNewClientId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Deposit Required (R)</Label>
              <Input type="number" min="0" value={newDeposit} onChange={e => setNewDeposit(e.target.value)} placeholder="0" className="mt-1" />
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 mr-1" />Add Line</Button>
              </div>
              <div className="space-y-2">
                {lineItems.map((li, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      {i === 0 && <Label className="text-xs text-slate-500">Description</Label>}
                      <Input value={li.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Shoulder mount — Kudu" className="mt-1" />
                    </div>
                    <div className="w-20">
                      {i === 0 && <Label className="text-xs text-slate-500">Qty</Label>}
                      <Input type="number" min="1" value={li.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} className="mt-1" />
                    </div>
                    <div className="w-28">
                      {i === 0 && <Label className="text-xs text-slate-500">Unit Price (R)</Label>}
                      <Input type="number" min="0" value={li.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} className="mt-1" />
                    </div>
                    <div className="w-24 text-right">
                      {i === 0 && <Label className="text-xs text-slate-500">Total</Label>}
                      <p className="mt-1 py-2 text-sm font-medium">R {lineTotal(li).toLocaleString()}</p>
                    </div>
                    {lineItems.length > 1 && (
                      <Button size="icon" variant="ghost" className="mb-0.5" onClick={() => removeLine(i)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-slate-100">Total: R {invoiceTotal.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Record Payment — {selected?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Balance outstanding: <strong>R {selected ? balance(selected).toLocaleString() : '—'}</strong></p>
            </div>
            <div>
              <Label>Amount (R) *</Label>
              <Input type="number" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" className="mt-1" />
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select value={payType} onValueChange={v => setPayType(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="progress">Progress Payment</SelectItem>
                  <SelectItem value="final">Final Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Method *</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>
                  {['EFT / Bank Transfer', 'Cash', 'Credit Card', 'Xero Payment', 'PayPal', 'Other'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Reference number, etc." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={handlePayment} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CreditCard className="w-4 h-4 mr-2" />Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
