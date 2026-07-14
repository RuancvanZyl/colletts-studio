import { NavLink, Outlet } from 'react-router';
import { Waves, LayoutDashboard, CalendarDays, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/events', label: 'Events & Races', icon: CalendarDays, end: false },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-white/[0.06] bg-black/20 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 font-semibold text-white border-b border-white/[0.06]">
          <Waves className="size-5 text-ocean-400" /> Meet Admin
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-ocean-500/15 text-ocean-200' : 'text-white/55 hover:bg-white/[0.05] hover:text-white/85',
                )
              }
            >
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <p className="px-3 text-xs text-white/40 mb-1">{profile?.full_name}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-white/55 hover:bg-white/[0.05] hover:text-white/85"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
