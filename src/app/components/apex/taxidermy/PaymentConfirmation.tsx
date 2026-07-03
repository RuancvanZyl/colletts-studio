/**
 * PaymentConfirmation — Admin view showing all hunts awaiting deposit.
 * Confirming a deposit flips all job cards for that hunt from
 * 'pending_payment' → 'in_progress', releasing them into the production pipeline.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import {
  CreditCard, CheckCircle2, AlertCircle, RefreshCw, Loader2,
  User, Calendar, Crosshair, ChevronDown, ChevronUp, DollarSign,
} from 'lucide-react';

interface PendingHunt {
  id: string;
  year: number;
  client_type: string;
  operator: string | null;
  farm: string | null;
  client_name: string;
  client_number: string | null;
  client_email: string | null;
  created_at: string;
  job_cards: { id: string; title: string }[];
}

export function PaymentConfirmation() {
  const [hunts,    setHunts]   = useState<PendingHunt[]>([]);
  const [loading,  setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);

    // Get all hunt_documents that are pending_payment grouped by hunt
    const { data: docs } = await (supabase as any)
      .from('hunt_documents')
      .select(`
        id, title, hunt_id,
        client_hunts!inner(
          id, year, client_type, operator, farm, created_at,
          clients!inner(full_name, client_number, email)
        )
      `)
      .eq('status', 'pending_payment')
      .eq('doc_type', 'job_card')
      .order('created_at', { ascending: false });

    if (!docs) { setLoading(false); return; }

    // Group by hunt_id
    const huntMap: Record<string, PendingHunt> = {};
    for (const d of docs) {
      const h = d.client_hunts;
      if (!huntMap[h.id]) {
        huntMap[h.id] = {
          id:            h.id,
          year:          h.year,
          client_type:   h.client_type ?? 'export',
          operator:      h.operator,
          farm:          h.farm,
          client_name:   h.clients?.full_name ?? 'Unknown',
          client_number: h.clients?.client_number ?? null,
          client_email:  h.clients?.email ?? null,
          created_at:    h.created_at,
          job_cards:     [],
        };
      }
      huntMap[h.id].job_cards.push({ id: d.id, title: d.title });
    }

    setHunts(Object.values(huntMap).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    setLoading(false);
  }

  async function confirmDeposit(hunt: PendingHunt) {
    setConfirming(hunt.id);
    try {
      // Flip all job cards for this hunt to in_progress
      const { error } = await (supabase as any)
        .from('hunt_documents')
        .update({
          status:     'in_progress',
          last_moved_at: new Date().toISOString(),
        })
        .eq('hunt_id', hunt.id)
        .eq('status', 'pending_payment');

      if (error) throw new Error(error.message);

      // Optionally record deposit amount on the hunt
      const amount = depositAmounts[hunt.id];
      if (amount) {
        await (supabase as any)
          .from('client_hunts')
          .update({ deposit_amount: parseFloat(amount), deposit_paid_at: new Date().toISOString() })
          .eq('id', hunt.id);
      }

      toast.success(`${hunt.job_cards.length} job card${hunt.job_cards.length !== 1 ? 's' : ''} activated for ${hunt.client_name}`);
      setHunts(prev => prev.filter(h => h.id !== hunt.id));
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setConfirming(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading pending payments…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            Pending Payment Confirmation
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Confirm deposit received to release job cards into production
          </p>
        </div>
        <button onClick={load} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {hunts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400" />
          <p className="font-medium text-slate-600 dark:text-slate-300">No pending payments</p>
          <p className="text-sm mt-1">All hunt deposits have been confirmed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hunts.map(hunt => {
            const isOpen = expanded === hunt.id;
            const isConfirming = confirming === hunt.id;
            const daysWaiting = Math.floor(
              (Date.now() - new Date(hunt.created_at).getTime()) / 86_400_000
            );

            return (
              <div key={hunt.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                  daysWaiting > 3 ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'
                }`}>

                {/* Hunt header */}
                <div className="p-4 flex items-start gap-3">
                  {/* Client avatar */}
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-slate-500">{hunt.client_name.charAt(0)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{hunt.client_name}</span>
                      {hunt.client_number && (
                        <Badge variant="secondary" className="text-xs">{hunt.client_number}</Badge>
                      )}
                      <Badge className={`text-xs ${hunt.client_type === 'export' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'} border-0`}>
                        {hunt.client_type}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                      {hunt.operator && <span className="flex items-center gap-1"><User className="w-3 h-3" />{hunt.operator}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{hunt.year}</span>
                      {hunt.farm && <span>{hunt.farm}</span>}
                      <span className="flex items-center gap-1"><Crosshair className="w-3 h-3" />{hunt.job_cards.length} trophy job card{hunt.job_cards.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Urgency badge + expand */}
                  <div className="flex items-center gap-2 shrink-0">
                    {daysWaiting > 3 && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{daysWaiting}d
                      </span>
                    )}
                    <button onClick={() => setExpanded(isOpen ? null : hunt.id)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded: trophy list + confirm */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-3 space-y-3">

                    {/* Trophy list */}
                    <div className="space-y-1">
                      {hunt.job_cards.map(jc => (
                        <div key={jc.id} className="flex items-center gap-2 text-sm py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">{jc.title}</span>
                        </div>
                      ))}
                    </div>

                    {/* Deposit amount field */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={depositAmounts[hunt.id] ?? ''}
                          onChange={e => setDepositAmounts(p => ({ ...p, [hunt.id]: e.target.value }))}
                          placeholder="Deposit amount (USD, optional)"
                          className="w-full h-9 pl-8 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
                        />
                      </div>
                      <Button
                        onClick={() => confirmDeposit(hunt)}
                        disabled={isConfirming}
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5 shrink-0">
                        {isConfirming
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Activating…</>
                          : <><CheckCircle2 className="w-3.5 h-3.5" />Confirm Deposit Received</>}
                      </Button>
                    </div>

                    <p className="text-xs text-slate-400">
                      This will release {hunt.job_cards.length} job card{hunt.job_cards.length !== 1 ? 's' : ''} into the receiving queue immediately.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
