import { TrophyStatus } from './types';
import { Badge } from '../ui/badge';

interface StatusBadgeProps {
  status: TrophyStatus;
  size?: 'sm' | 'default' | 'lg';
}

const statusConfig: Record<TrophyStatus, { label: string; className: string }> = {
  received: { label: 'Received', className: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400 hover:bg-lime-100 dark:hover:bg-lime-900/30 border border-lime-300 dark:border-lime-800' },
  cleaning: { label: 'Cleaning', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-300 dark:border-green-800' },
  tannery: { label: 'Tannery', className: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-300 dark:border-amber-800' },
  boiling: { label: 'Boiling', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-300 dark:border-orange-800' },
  mounting: { label: 'Mounting', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-300 dark:border-green-800' },
  qc: { label: 'QC Check', className: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400 hover:bg-lime-100 dark:hover:bg-lime-900/30 border border-lime-300 dark:border-lime-800' },
  packed: { label: 'Packed', className: 'bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/40 border border-green-400 dark:border-green-700' },
  dispatched: { label: 'Dispatched', className: 'bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/40 border border-green-400 dark:border-green-700' },
  delivered: { label: 'Delivered', className: 'bg-green-300 text-green-900 dark:bg-green-800/50 dark:text-green-200 hover:bg-green-300 dark:hover:bg-green-800/50 border border-green-500 dark:border-green-600' }
};

export function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}
