import { useState } from 'react';
import { LocalTrophyTracking } from './hunter/LocalTrophyTracking';
import { Notifications } from './hunter/Notifications';
import { HunterProfile } from './hunter/HunterProfile';
import { SpecialRequests } from './hunter/SpecialRequests';
import { TrophyMessages } from './hunter/TrophyMessages';
import { UniversalAIAssistant } from './shared/UniversalAIAssistant';
import { Button } from '../ui/button';
import { Home, Bell, User, MessageCircle, Wand2, Moon, Sun, Package } from 'lucide-react';
import { useClientNotifications } from '../../../lib/hooks/useClientNotifications';
import { useTheme } from './ThemeProvider';
import { useHunterClient } from '../../../lib/hooks/useHunterClient';

interface LocalHunterPortalProps {
  onLogout: () => void;
}

type LocalView = 'home' | 'notifications' | 'profile' | 'messages' | 'special-requests';

export function LocalHunterPortal({ onLogout }: LocalHunterPortalProps) {
  const { client, displayName } = useHunterClient();
  const [currentView, setCurrentView] = useState<LocalView>('home');
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useClientNotifications(client?.id);

  const renderView = () => {
    switch (currentView) {
      case 'home':             return <LocalTrophyTracking />;
      case 'notifications':    return <Notifications notifications={notifications} loading={false} unreadCount={unreadCount} onMarkRead={markRead} onMarkAllRead={markAllRead} />;
      case 'messages':         return <TrophyMessages />;
      case 'special-requests': return <SpecialRequests />;
      case 'profile':          return <HunterProfile onLogout={onLogout} />;
      default:                 return <LocalTrophyTracking />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-yellow-50 dark:from-stone-950 dark:via-amber-950 dark:to-stone-900">

      {/* Header */}
      <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-b border-amber-200 dark:border-amber-900 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-500 rounded-lg flex items-center justify-center shadow-md">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-100 text-sm tracking-wider">APEX TROPHY SOLUTIONS</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Local Collection{displayName ? ` · ${displayName}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentView('profile')} className="rounded-full">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6 md:ml-56">
        {renderView()}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-t border-amber-200 dark:border-amber-900 z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          {[
            { view: 'home' as LocalView,             icon: Home,          label: 'My Trophies' },
            { view: 'messages' as LocalView,         icon: MessageCircle, label: 'Ask' },
            { view: 'special-requests' as LocalView, icon: Wand2,         label: 'Requests' },
            { view: 'notifications' as LocalView,    icon: Bell,          label: 'Alerts', badge: unreadCount },
            { view: 'profile' as LocalView,          icon: User,          label: 'Profile' },
          ].map(item => (
            <Button
              key={item.view}
              variant={currentView === item.view ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 relative"
              onClick={() => setCurrentView(item.view)}
            >
              <item.icon className="w-5 h-5" />
              {item.badge != null && item.badge > 0 && (
                <span className="absolute top-1 right-1/4 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{item.badge}</span>
              )}
              <span className="text-[10px]">{item.label}</span>
            </Button>
          ))}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:block fixed left-0 top-16 bottom-0 w-56 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-r border-amber-200 dark:border-amber-900 p-4 space-y-1">
        {[
          { view: 'home' as LocalView,             icon: Home,          label: 'My Trophies' },
          { view: 'messages' as LocalView,         icon: MessageCircle, label: 'Ask the Taxidermy' },
          { view: 'special-requests' as LocalView, icon: Wand2,         label: 'Special Requests' },
          { view: 'notifications' as LocalView,    icon: Bell,          label: 'Notifications', badge: unreadCount },
          { view: 'profile' as LocalView,          icon: User,          label: 'Profile' },
        ].map(item => (
          <Button
            key={item.view}
            variant={currentView === item.view ? 'default' : 'ghost'}
            className="w-full justify-start relative"
            onClick={() => setCurrentView(item.view)}
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{item.badge}</span>
            )}
          </Button>
        ))}
      </nav>

      <UniversalAIAssistant />
    </div>
  );
}
