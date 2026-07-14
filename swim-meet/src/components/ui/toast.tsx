import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<{ push: (kind: ToastKind, message: string) => void } | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'animate-flash-in flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md',
              t.kind === 'success' && 'bg-emerald-950/80 border-emerald-500/30 text-emerald-100',
              t.kind === 'error' && 'bg-red-950/80 border-red-500/30 text-red-100',
              t.kind === 'info' && 'bg-ocean-950/80 border-ocean-500/30 text-ocean-100',
            )}
          >
            {t.kind === 'success' && <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />}
            {t.kind === 'error' && <XCircle className="size-5 shrink-0 text-red-400" />}
            {t.kind === 'info' && <Info className="size-5 shrink-0 text-ocean-400" />}
            <p className="text-sm leading-snug flex-1">{t.message}</p>
            <button
              onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
              className="text-white/50 hover:text-white/90"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
