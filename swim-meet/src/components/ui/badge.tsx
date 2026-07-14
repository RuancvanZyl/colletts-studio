import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'ocean' | 'success' | 'warning' | 'danger' | 'gold' | 'silver' | 'bronze';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-white/10 text-white/80 border-white/10',
  ocean: 'bg-ocean-500/15 text-ocean-300 border-ocean-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  danger: 'bg-red-500/15 text-red-300 border-red-500/25',
  gold: 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border-[var(--color-gold)]/30',
  silver: 'bg-[var(--color-silver)]/15 text-[var(--color-silver)] border-[var(--color-silver)]/30',
  bronze: 'bg-[var(--color-bronze)]/15 text-[var(--color-bronze)] border-[var(--color-bronze)]/30',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
