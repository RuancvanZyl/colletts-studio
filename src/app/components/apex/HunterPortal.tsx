import { useState } from 'react';
import { HunterHome } from './hunter/HunterHome';
import { MyTrophies } from './hunter/MyTrophies';
import { TrophyDetail } from './hunter/TrophyDetail';
import { Notifications } from './hunter/Notifications';
import { HunterProfile } from './hunter/HunterProfile';
import { TrophySelection } from './hunter/TrophySelection';
import { HunterRegistration } from './hunter/HunterRegistration';
import { VerificationPending } from './hunter/VerificationPending';
import { TrophyTrackingDashboard } from './hunter/TrophyTrackingDashboard';
import { TrophyMessages } from './hunter/TrophyMessages';
import { SpecialRequests } from './hunter/SpecialRequests';
import { HunterHuntCreationWizard } from './hunter/HunterHuntCreationWizard';
import { UniversalAIAssistant } from './shared/UniversalAIAssistant';
import { Button } from '../ui/button';
import { Home, Award, Bell, User, Moon, Sun, Trophy as TrophyIcon, Plus, MessageCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Trophy, TrophySelection as TrophySelectionType } from './types';
import { useClientNotifications } from '../../../lib/hooks/useClientNotifications';
import { useTheme } from './ThemeProvider';
import { usePortalTheme } from './PortalThemeProvider';
import { toast } from 'sonner';
import { useHunterClient } from '../../../lib/hooks/useHunterClient';
import { useHunterHunts } from '../../../lib/hooks/useHunterHunts';
import { useAuth } from '../../../lib/auth';
import { AlertCircle, Loader2 } from 'lucide-react';

const PHASE_PROGRESS: Record<string, number> = {
  intake: 10, skin_processing: 20, skull_processing: 30,
  storage_pre: 35, tannery: 45, storage_post: 55,
  mounting: 65, finishing: 75, quality_check: 85,
  packing: 90, shipped: 95, delivered: 100,
};

interface HunterPortalProps {
  onLogout: () => void;
}

type HunterFlow =
  | 'registration'
  | 'pending-verification'
  | 'onboarding'
  | 'active-hunt'
  | 'add-trophy'
  | 'tracking'
  | 'create-hunt'
  | 'main';

type HunterView = 'home' | 'trophies' | 'trophy-detail' | 'notifications' | 'profile' | 'trophy-selection' | 'messages' | 'special-requests';

export function HunterPortal({ onLogout }: HunterPortalProps) {
  const { user } = useAuth();
  const { client, loading: clientLoading, displayName } = useHunterClient();
  const { hunts, loading: huntsLoading, refresh: refreshHunts } = useHunterHunts();

  const [flow, setFlow] = useState<HunterFlow>('main');
  const [currentView, setCurrentView] = useState<HunterView>('home');
  const [selectedTrophy, setSelectedTrophy] = useState<Trophy | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { theme: portalTheme } = usePortalTheme();

  const { notifications, unreadCount, markRead, markAllRead } = useClientNotifications(client?.id);

  const handleViewTrophy = (trophy: Trophy) => {
    setSelectedTrophy(trophy);
    setCurrentView('trophy-detail');
  };

  const handleBackToList = () => {
    setSelectedTrophy(null);
    setCurrentView('trophies');
  };

  const handleTrophySelectionComplete = (_selections: TrophySelectionType[]) => {
    setCurrentView('home');
  };

  // Loading state
  if (clientLoading || huntsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // New hunter — no hunts yet → show creation wizard
  if (hunts.length === 0 && flow !== 'create-hunt') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center gap-6">
        <div>
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mx-auto mb-4">
            <TrophyIcon className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Welcome, {displayName}!</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Let's register your hunt and trophies so our team can start processing them.
          </p>
        </div>
        <Button onClick={() => setFlow('create-hunt')} size="lg" className="gap-2">
          <Plus className="w-5 h-5" /> Register My Hunt & Trophies
        </Button>
        <button onClick={onLogout} className="text-xs text-slate-400 hover:text-slate-600">Sign out</button>
      </div>
    );
  }

  // Hunt creation wizard
  if (flow === 'create-hunt') {
    return (
      <HunterHuntCreationWizard
        clientId={client.id}
        clientName={displayName}
        clientEmail={client.email ?? user?.email ?? ''}
        clientType={(client as any).client_type ?? 'export'}
        onComplete={() => { refreshHunts(); setFlow('main'); }}
      />
    );
  }

  // Main Portal Views
  const renderView = () => {
    switch (currentView) {
      case 'home':
      case 'trophies':
        return <TrophyTrackingDashboard />;
      case 'trophy-detail':
        return selectedTrophy ? (
          <TrophyDetail trophy={selectedTrophy} onBack={handleBackToList} />
        ) : null;
      case 'notifications':
        return (
          <Notifications
            notifications={notifications}
            loading={false}
            unreadCount={unreadCount}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
          />
        );
      case 'messages':
        return <TrophyMessages />;
      case 'special-requests':
        return <SpecialRequests />;
      case 'profile':
        return <HunterProfile onLogout={onLogout} />;
      case 'trophy-selection':
        return (
          <TrophySelection
            onBack={() => setCurrentView('home')}
            onComplete={handleTrophySelectionComplete}
          />
        );
      default:
        return <TrophyTrackingDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-green-50 to-lime-50 dark:from-stone-950 dark:via-green-950 dark:to-stone-900">
      {/* Header */}
      <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-b border-green-200 dark:border-green-900 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${portalTheme.gradient} rounded-lg flex items-center justify-center shadow-md`}>
                <TrophyIcon className="w-5 h-5 text-amber-50" />
              </div>
              <div>
                <h2 className="bg-gradient-to-r from-green-800 via-green-700 to-lime-700 bg-clip-text text-transparent">APEX TROPHY SOLUTIONS</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">Hunter Portal {displayName ? `· ${displayName}` : ''}</p>
              </div>
            </div>
            
            <div className="hidden md:block flex-1" />

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setCurrentView('profile')}
                className="rounded-full"
              >
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>


      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {renderView()}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-t border-green-200 dark:border-green-900 z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          <Button
            variant={currentView === 'home' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setCurrentView('home')}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Button>
          <Button
            variant={currentView === 'trophies' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setCurrentView('trophies')}
          >
            <Award className="w-5 h-5" />
            <span className="text-xs">Trophies</span>
          </Button>
          <Button
            variant={currentView === 'trophy-selection' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setCurrentView('trophy-selection')}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">Add</span>
          </Button>
          <Button
            variant={currentView === 'notifications' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2 relative"
            onClick={() => setCurrentView('notifications')}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1/4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            <span className="text-xs">Alerts</span>
          </Button>
          <Button
            variant={currentView === 'messages' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setCurrentView('messages')}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">Ask</span>
          </Button>
          <Button
            variant={currentView === 'profile' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setCurrentView('profile')}
          >
            <User className="w-5 h-5" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed left-0 top-16 bottom-0 w-64 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-r border-green-200 dark:border-green-900 p-4">
        <div className="space-y-2">
          <Button
            variant={currentView === 'home' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('home')}
          >
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
          <Button
            variant={currentView === 'trophies' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('trophies')}
          >
            <Award className="w-5 h-5 mr-3" />
            My Trophies
          </Button>
          <Button
            variant={currentView === 'trophy-selection' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('trophy-selection')}
          >
            <Plus className="w-5 h-5 mr-3" />
            Add Trophy
          </Button>
          <Button
            variant={currentView === 'messages' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('messages')}
          >
            <MessageCircle className="w-5 h-5 mr-3" />
            Ask the Workshop
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setFlow('create-hunt')}
          >
            <Plus className="w-5 h-5 mr-3" />
            Register New Hunt
          </Button>
          <Button
            variant={currentView === 'notifications' ? 'default' : 'ghost'}
            className="w-full justify-start relative"
            onClick={() => setCurrentView('notifications')}
          >
            <Bell className="w-5 h-5 mr-3" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      </nav>

      {/* Desktop Content Offset */}
      <style>{`
        @media (min-width: 768px) {
          main {
            margin-left: 16rem;
          }
        }
      `}</style>

      {/* Universal AI Assistant */}
      <UniversalAIAssistant />
    </div>
  );
}
