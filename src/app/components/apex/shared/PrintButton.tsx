import { useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';

/** A Print button that gathers what it needs, opens the print dialog and tells the user if there was nothing to print. */
export function PrintButton({ label, onPrint, className = '', compact = false }: {
  label: string;
  /** Resolve with the number of pages printed (0 = nothing to print) */
  onPrint: () => Promise<number | void> | number | void;
  className?: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  async function run(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const n = await onPrint();
      if (n === 0) toast.info('Nothing to print');
    } catch (err: any) {
      toast.error('Could not print: ' + (err?.message ?? 'unknown error'));
    } finally { setBusy(false); }
  }
  return (
    <button type="button" onClick={run} disabled={busy} title={label} aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#0073ea] hover:text-[#0073ea] disabled:opacity-50 font-semibold ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} ${className}`}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
      {label}
    </button>
  );
}
