import { Button } from '../../ui/button';
import { ChevronRight, Home } from 'lucide-react';
import { usePortalTheme } from '../PortalThemeProvider';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface PortalBreadcrumbProps {
  items: BreadcrumbItem[];
  onHome?: () => void;
}

export function PortalBreadcrumb({ items, onHome }: PortalBreadcrumbProps) {
  const { theme } = usePortalTheme();

  return (
    <div className="flex items-center gap-2 mb-4">
      {onHome && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onHome}
            className="h-8 px-2 gap-1"
          >
            <Home className="w-4 h-4" />
          </Button>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </>
      )}
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {item.onClick ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={item.onClick}
              className={`h-8 px-2 ${theme.textLight}`}
            >
              {item.label}
            </Button>
          ) : (
            <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      ))}
    </div>
  );
}
