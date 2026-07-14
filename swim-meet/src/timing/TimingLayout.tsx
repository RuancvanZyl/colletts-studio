import { NavLink, Outlet, useParams, Link } from 'react-router';
import { Waves, LogInIcon, Timer, FlagIcon, ChevronLeft } from 'lucide-react';
import { useCategory } from '@/lib/hooks/useCategory';
import { useTimingSession } from '@/lib/hooks/useTimingSession';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const tabs = [
  { to: 'staging', label: 'Scan-in', icon: LogInIcon },
  { to: 'start', label: 'Start control', icon: Timer },
  { to: 'finish', label: 'Finish scan', icon: FlagIcon },
];

export function TimingLayout() {
  const { categoryId } = useParams();
  const { category } = useCategory(categoryId);
  const { session } = useTimingSession(categoryId);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/events" className="text-white/40 hover:text-white/80"><ChevronLeft className="size-5" /></Link>
          <div className="flex items-center gap-2 font-semibold text-white">
            <Waves className="size-5 text-ocean-400" /> {category?.name ?? 'Timing console'}
          </div>
        </div>
        {session && (
          <Badge
            tone={
              session.status === 'live' ? 'success' : session.status === 'countdown' ? 'warning' : session.status === 'finished' ? 'neutral' : 'ocean'
            }
          >
            {session.status}
          </Badge>
        )}
      </header>
      <nav className="flex gap-1 px-6 pt-3 border-b border-white/[0.06]">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-t-lg border-b-2 -mb-px transition-colors',
                isActive ? 'border-ocean-400 text-white' : 'border-transparent text-white/45 hover:text-white/75',
              )
            }
          >
            <Icon className="size-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
