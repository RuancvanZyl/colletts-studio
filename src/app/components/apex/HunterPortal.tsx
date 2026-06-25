import { useState } from 'react';
import { HunterHome } from './hunter/HunterHome';
import { MyTrophies } from './hunter/MyTrophies';
import { TrophyDetail } from './hunter/TrophyDetail';
import { Notifications } from './hunter/Notifications';
import { HunterProfile } from './hunter/HunterProfile';
import { TrophySelection } from './hunter/TrophySelection';
import { HunterRegistration } from './hunter/HunterRegistration';
import { VerificationPending } from './hunter/VerificationPending';
import { HunterOnboarding } from './hunter/HunterOnboarding';
import { ActiveHuntDashboard } from './hunter/ActiveHuntDashboard';
import { AddTrophyFlow } from './hunter/AddTrophyFlow';
import { TrophyTrackingDashboard } from './hunter/TrophyTrackingDashboard';
import { UniversalAIAssistant } from './shared/UniversalAIAssistant';
import { Button } from '../ui/button';
import { Home, Award, Bell, User, Search, Moon, Sun, Trophy as TrophyIcon, Plus } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { mockNotifications } from './mockData';
import { Trophy, TrophySelection as TrophySelectionType } from './types';
import { useTheme } from './ThemeProvider';
import { usePortalTheme } from './PortalThemeProvider';
import { toast } from 'sonner';
import { useHunterClient } from '../../../lib/hooks/useHunterClient';
import { useAuth } from '../../../lib/auth';
import { AlertCircle, CreditCard } from 'lucide-react';

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
  | 'main';

type HunterView = 'home' | 'trophies' | 'trophy-detail' | 'notifications' | 'profile' | 'trophy-selection';

export function HunterPortal({ onLogout }: HunterPortalProps) {
  const { user } = useAuth();
  const { client, specimens, loading: clientLoading, displayName, ensureClient } = useHunterClient();

  // Flow state - determines which major section the user is in
  const [flow, setFlow] = useState<HunterFlow>('main');
  const [huntData, setHuntData] = useState<any>(null);

  // Main portal state
  const [currentView, setCurrentView] = useState<HunterView>('home');
  const [selectedTrophy, setSelectedTrophy] = useState<Trophy | null>(null);
  const [notifications, setNotifications] = useState(mockNotifications);
  const { theme, toggleTheme } = useTheme();
  const { theme: portalTheme } = usePortalTheme();

  // Convert real specimens to the Trophy shape expected by existing UI components
  const realTrophies: Trophy[] = specimens.map(s => {
    const job = s.jobs?.[0];
    const phase = job?.current_phase ?? 'intake';
    const progress = PHASE_PROGRESS[phase] ?? 0;
    return {
      id: s.id,
      species: s.species?.common_name ?? s.species_name ?? 'Unknown Species',
      clientName: displayName,
      progress,
      currentStage: phase as any,
      parts: [],
      imageUrl: undefined,
      createdAt: s.created_at,
      lastUpdated: s.updated_at,
      events: [],
    };
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // Registration flow handlers
  const handleRegistrationComplete = () => {
    setFlow('pending-verification');
  };

  const handleBackToLogin = () => {
    onLogout();
  };

  const handleOnboardingComplete = (data: any) => {
    setHuntData(data);
    setFlow('active-hunt');
  };

  const handleAddTrophy = () => {
    setFlow('add-trophy');
  };

  const handleTrophyAdded = (trophy: any) => {
    toast.success('Trophy added successfully!');
    setFlow('active-hunt');
  };

  const handleSubmitHunt = () => {
    toast.success('Hunt submitted to taxidermy workshop!');
    setFlow('tracking');
  };

  // Main portal handlers
  const handleViewTrophy = (trophy: Trophy) => {
    setSelectedTrophy(trophy);
    setCurrentView('trophy-detail');
  };

  const handleBackToList = () => {
    setSelectedTrophy(null);
    setCurrentView('trophies');
  };

  const handleTrophySelectionComplete = (selections: TrophySelectionType[]) => {
    toast.success(`Successfully added ${selections.length} trophy selection${selections.length > 1 ? 's' : ''}!`, {
      description: 'Your selections have been saved and will be tracked through the process.',
    });
    setCurrentView('home');
  };

  // Registration and Onboarding Flow
  if (flow === 'registration') {
    return (
      <HunterRegistration 
        onComplete={handleRegistrationComplete}
        onBack={handleBackToLogin}
      />
    );
  }

  if (flow === 'pending-verification') {
    return (
      <VerificationPending 
        onBackToLogin={handleBackToLogin}
      />
    );
  }

  if (flow === 'onboarding') {
    return (
      <HunterOnboarding 
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Active Hunt Management
  if (flow === 'active-hunt') {
    return (
      <>
        <ActiveHuntDashboard
          huntData={huntData}
          onAddTrophy={handleAddTrophy}
          onViewTrophy={(t: any) => handleViewTrophy(t as Trophy)}
          onSubmitHunt={handleSubmitHunt}
        />
        <UniversalAIAssistant />
      </>
    );
  }

  if (flow === 'add-trophy') {
    return (
      <>
        <AddTrophyFlow 
          huntId={huntData?.huntId || 'HUNT-2025-0001'}
          onComplete={handleTrophyAdded}
          onCancel={() => setFlow('active-hunt')}
        />
        <UniversalAIAssistant />
      </>
    );
  }

  // Trophy Tracking (Post-submission)
  if (flow === 'tracking') {
    return (
      <>
        <TrophyTrackingDashboard 
          huntId={huntData?.huntId || 'HUNT-2025-0001'}
        />
        <UniversalAIAssistant />
      </>
    );
  }

  // Main Portal Views
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HunterHome trophies={realTrophies} onViewTrophy={handleViewTrophy} onAddTrophy={() => setCurrentView('trophy-selection')} hunterName={displayName} />;
      case 'trophies':
        return <MyTrophies trophies={realTrophies} onViewTrophy={handleViewTrophy} />;
      case 'trophy-detail':
        return selectedTrophy ? (
          <TrophyDetail trophy={selectedTrophy} onBack={handleBackToList} />
        ) : null;
      case 'notifications':
        return (
          <Notifications 
            notifications={notifications} 
            onMarkAsRead={(id) => {
              setNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, read: true } : n)
              );
            }}
          />
        );
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
        return <HunterHome trophies={realTrophies} onViewTrophy={handleViewTrophy} onAddTrophy={() => setCurrentView('trophy-selection')} hunterName={displayName} />;
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
            
            {/* Desktop Search */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700 dark:text-green-500" />
                <Input 
                  placeholder="Search trophies..." 
                  className="pl-10 bg-green-50 dark:bg-stone-800 border-green-200 dark:border-green-800 focus:border-green-500 dark:focus:border-green-600"
                />
              </div>
            </div>

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

      {/* Payment Required Banner — shown when client has trophies but no deposit paid */}
      {client && specimens.length > 0 && specimens.some(s => s.jobs?.length === 0 || s.status === 'expected') && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-800 dark:text-amber-300 font-medium text-sm">
                Deposit required before processing begins
              </p>
              <p className="text-amber-700 dark:text-amber-400 text-xs">
                Your trophies are registered. A 50% deposit invoice will be sent to you — work starts once payment is confirmed.
              </p>
            </div>
          </div>
        </div>
      )}

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
