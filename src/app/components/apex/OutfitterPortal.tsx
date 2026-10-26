/**
 * OutfitterPortal — the outfitter's window into the workshop: register a hunt and its animals (never the mounts —
 * the hunter chooses those), follow every animal, and see the money side of each hunt.
 */
import { useState } from 'react';
import { Compass, Home, LogOut, Moon, Plus, Sun, User } from 'lucide-react';
import { Button } from '../ui/button';
import { OutfitterHunts } from './outfitter/OutfitterHunts';
import { RegisterHunt } from './outfitter/RegisterHunt';
import { useOutfitter } from '../../../lib/hooks/useOutfitter';
import { useTheme } from './ThemeProvider';
import { usePortalTheme } from './PortalThemeProvider';

interface OutfitterPortalProps { onLogout: () => void }
type OutfitterView = 'hunts' | 'register' | 'account';

export function OutfitterPortal({ onLogout }: OutfitterPortalProps) {
  const [view, setView] = useState<OutfitterView>('hunts');
  const [tick, setTick] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const { theme: portalTheme } = usePortalTheme();
  const { data } = useOutfitter();

  const items: { v: OutfitterView; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { v: 'hunts', icon: Home, label: 'My hunts' },
    { v: 'register', icon: Plus, label: 'Register a hunt' },
    { v: 'account', icon: User, label: 'Account' },
  ];

  const body = () => {
    if (view === 'register') return <RegisterHunt onClose={() => setView('hunts')} onDone={() => setTick(t => t + 1)} />;
    if (view === 'account') {
      return (
        <div className="max-w-md mx-auto space-y-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Account</h1>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{data?.outfitter.name ?? 'Outfitter'}</p>
            <p className="text-sm text-slate-500">{data?.outfitter.status === 'active' ? 'Active' : 'Waiting for the workshop to activate this account'}</p>
          </div>
          <Button variant="outline" className="w-full min-h-12" onClick={onLogout}><LogOut className="w-4 h-4 mr-2" />Sign out</Button>
        </div>
      );
    }
    return <OutfitterHunts key={tick} onRegister={() => setView('register')} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-green-50 to-lime-50 dark:from-stone-950 dark:via-green-950 dark:to-stone-900">
      <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-b border-green-200 dark:border-green-900 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${portalTheme.gradient} rounded-lg flex items-center justify-center shadow-md`}><Compass className="w-5 h-5 text-amber-50" /></div>
            <div><h2 className="font-bold leading-tight text-slate-900 dark:text-slate-100">APEX TROPHY SOLUTIONS</h2><p className="text-xs text-slate-600 dark:text-slate-400">Outfitter portal{data ? ` · ${data.outfitter.name}` : ''}</p></div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full" title="Switch light or dark mode" aria-label="Switch light or dark mode">{theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</Button>
        </div>
      </header>

      <main className="md:ml-64 px-4 py-6 pb-28 md:pb-6 min-w-0 overflow-x-hidden">{body()}</main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-t border-green-200 dark:border-green-900 z-50">
        <div className="grid grid-cols-3 gap-1 p-2">
          {items.map(i => (
            <Button key={i.v} variant={view === i.v ? 'default' : 'ghost'} className="flex flex-col items-center gap-1 h-auto min-h-14 py-2" onClick={() => setView(i.v)}>
              <i.icon className="w-5 h-5" /><span className="text-xs">{i.label}</span>
            </Button>
          ))}
        </div>
      </nav>
      <nav className="hidden md:block fixed left-0 top-16 bottom-0 w-64 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-r border-green-200 dark:border-green-900 p-4 space-y-2">
        {items.map(i => (
          <Button key={i.v} variant={view === i.v ? 'default' : 'ghost'} className="w-full justify-start min-h-11" onClick={() => setView(i.v)}><i.icon className="w-5 h-5 mr-3" />{i.label}</Button>
        ))}
      </nav>
    </div>
  );
}
