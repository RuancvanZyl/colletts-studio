import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-ocean-400 to-ocean-600 text-white shadow-[0_4px_20px_-4px_rgba(18,161,245,0.6)] hover:from-ocean-300 hover:to-ocean-500 active:scale-[0.98]',
  secondary:
    'bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1] active:scale-[0.98]',
  ghost: 'text-ocean-200 hover:bg-white/[0.06] active:scale-[0.98]',
  danger:
    'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_4px_20px_-4px_rgba(239,68,68,0.5)] hover:from-red-400 hover:to-red-500 active:scale-[0.98]',
  success:
    'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_4px_20px_-4px_rgba(34,197,94,0.5)] hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  xl: 'h-16 px-8 text-lg rounded-2xl gap-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
