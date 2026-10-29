/** HunterProfile — who the workshop has on file for this hunter, how to get the app on the home screen, and sign out. */
import { LogOut, Mail, Phone, User, Hash, Globe } from 'lucide-react';
import { useHunterClient } from '../../../../lib/hooks/useHunterClient';
import { InstallCard } from '../shared/InstallApp';
import { AppVersion } from '../shared/AppVersion';
import { WORKSHOP } from '../../../../lib/workshop';

interface HunterProfileProps {
  onLogout: () => void;
}

export function HunterProfile({ onLogout }: HunterProfileProps) {
  const { client, displayName } = useHunterClient();
  const c: any = client ?? {};
  const rows = [
    { icon: Hash, label: 'Your hunter number', value: c.client_number },
    { icon: Mail, label: 'E-mail', value: c.email },
    { icon: Phone, label: 'Phone', value: c.phone },
    { icon: Globe, label: 'Your trophies are', value: c.client_type === 'local' ? 'Staying in South Africa' : c.client_type ? 'Being exported' : null },
  ].filter(r => r.value);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your profile</h1>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-700 to-lime-600 flex items-center justify-center shrink-0"><User className="w-8 h-8 text-white" /></div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{displayName || 'Hunter'}</p>
            {c.created_at && <p className="text-sm text-slate-600 dark:text-slate-300">Hunting with {WORKSHOP.name} since {new Date(c.created_at).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</p>}
          </div>
        </div>
        {rows.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(r => (
              <li key={r.label} className="py-3 flex items-center gap-3">
                <r.icon className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="min-w-0"><p className="text-sm text-slate-500 dark:text-slate-400">{r.label}</p><p className="text-base text-slate-900 dark:text-slate-100 break-words">{r.value}</p></div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300">Something not right? Tap <strong>Ask us</strong> at the bottom and tell the workshop. We will fix it for you.</p>
      </div>

      <InstallCard />

      <AppVersion className="text-slate-500" />

      <button onClick={onLogout} className="w-full min-h-12 rounded-xl border-2 border-slate-400 text-slate-900 dark:text-slate-100 font-bold flex items-center justify-center gap-2"><LogOut className="w-5 h-5" />Sign out</button>
    </div>
  );
}
