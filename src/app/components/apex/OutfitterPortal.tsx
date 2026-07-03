import { useState } from 'react';
import { HuntDashboard } from './outfitter/HuntDashboard';
import { HuntDetailView } from './outfitter/HuntDetailView';
import { LinkedHunters } from './outfitter/LinkedHunters';
import { AnimalSummary } from './outfitter/AnimalSummary';
import { DocumentsCompliance } from './outfitter/DocumentsCompliance';
import type { OutfitterHunt } from './outfitter/HuntDashboard';
import { CommunicationPanel } from './outfitter/CommunicationPanel';
import { PerformanceAnalytics } from './outfitter/PerformanceAnalytics';
import { OutfitterProfile } from './outfitter/OutfitterProfile';
import { HuntCreationWizard } from './outfitter/HuntCreationWizard';
import { HunterLinkRequests } from './outfitter/HunterLinkRequests';
import { ActiveLinkedHunts } from './outfitter/ActiveLinkedHunts';
import { UniversalAIAssistant } from './shared/UniversalAIAssistant';
import { Button } from '../ui/button';
import {
  Home,
  Compass,
  Users,
  MessageSquare,
  User,
  Search,
  Moon,
  Sun,
  Trophy as TrophyIcon,
  FileText,
  BarChart3,
  Shield,
  Bell,
  UserCheck,
  Link as LinkIcon,
} from 'lucide-react';
import { Input } from '../ui/input';
import { mockOutfitter, mockOutfitterChats } from './mockOutfitterData';
import { Hunt } from './types';
import { useTheme } from './ThemeProvider';
import { usePortalTheme } from './PortalThemeProvider';
import { Badge } from '../ui/badge';

interface OutfitterPortalProps {
  onLogout: () => void;
}

type OutfitterView =
  | 'dashboard'
  | 'hunts'
  | 'hunt-detail'
  | 'create-hunt'
  | 'hunters'
  | 'link-requests'
  | 'linked-hunts'
  | 'analytics'
  | 'documents'
  | 'messages'
  | 'profile';

export function OutfitterPortal({ onLogout }: OutfitterPortalProps) {
  const [currentView, setCurrentView] = useState<OutfitterView>('hunts');
  const [selectedHunt, setSelectedHunt] = useState<Hunt | null>(null);
  const [openHunt, setOpenHunt] = useState<OutfitterHunt | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { theme: portalTheme } = usePortalTheme();

  const unreadMessages = mockOutfitterChats.reduce((sum, chat) => sum + chat.unread, 0);
  const expiringDocs = mockOutfitter.documents.filter(
    doc => doc.status === 'expiring-soon' || doc.status === 'expired'
  ).length;

  const handleCreateHunt = () => {
    setCurrentView('create-hunt');
  };

  const handleHuntSaved = () => {
    setSelectedHunt(null);
    setCurrentView('hunts');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <AnimalSummary />;
      case 'hunts':
        return (
          <HuntDashboard
            onCreateHunt={handleCreateHunt}
            onOpenHunt={hunt => { setOpenHunt(hunt); setCurrentView('hunt-detail'); }}
          />
        );
      case 'hunt-detail':
        return openHunt
          ? <HuntDetailView hunt={openHunt} onBack={() => setCurrentView('hunts')} />
          : null;
      case 'create-hunt':
        return (
          <HuntCreationWizard
            onDone={handleHuntSaved}
            onCancel={() => {
              setSelectedHunt(null);
              setCurrentView('hunts');
            }}
          />
        );
      case 'hunters':
        return <LinkedHunters />;
      case 'link-requests':
        return <HunterLinkRequests />;
      case 'linked-hunts':
        return <ActiveLinkedHunts />;
      case 'analytics':
        return <PerformanceAnalytics />;
      case 'documents':
        return <DocumentsCompliance />;
      case 'messages':
        return <CommunicationPanel />;
      case 'profile':
        return <OutfitterProfile onLogout={onLogout} />;
      default:
        return <AnimalSummary />;
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
                <Compass className="w-5 h-5 text-amber-50" />
              </div>
              <div>
                <h2 className={`bg-gradient-to-r ${portalTheme.gradient} bg-clip-text text-transparent`}>
                  APEX TROPHY SOLUTIONS
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Outfitter Portal · {mockOutfitter.company}
                </p>
              </div>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700 dark:text-green-500" />
                <Input
                  placeholder="Search hunts, hunters..."
                  className="pl-10 bg-green-50 dark:bg-stone-800 border-green-200 dark:border-green-800 focus:border-green-500 dark:focus:border-green-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              {expiringDocs > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full relative"
                  onClick={() => setCurrentView('documents')}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-0 right-0 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {expiringDocs}
                  </span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentView('profile')}
                className="rounded-full"
              >
                <User className="w-5 h-5" />
              </Button>
              <Badge
                variant={
                  mockOutfitter.status === 'approved'
                    ? 'default'
                    : mockOutfitter.status === 'pending-review'
                    ? 'secondary'
                    : 'destructive'
                }
                className="hidden md:inline-flex"
              >
                {mockOutfitter.status === 'approved' && '✓ Verified'}
                {mockOutfitter.status === 'pending-review' && '⏳ Pending'}
                {mockOutfitter.status === 'expired' && '⚠ Expired'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">{renderView()}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-t border-green-200 dark:border-green-900 z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          <Button
            variant={currentView === 'dashboard' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setCurrentView('dashboard')}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Dashboard</span>
          </Button>
          <Button
            variant={currentView === 'hunts' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setCurrentView('hunts')}
          >
            <TrophyIcon className="w-5 h-5" />
            <span className="text-xs">Hunts</span>
          </Button>
          <Button
            variant={currentView === 'hunters' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setCurrentView('hunters')}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs">Hunters</span>
          </Button>
          <Button
            variant={currentView === 'messages' ? 'default' : 'ghost'}
            className="flex flex-col items-center gap-1 h-auto py-2 relative"
            onClick={() => setCurrentView('messages')}
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute top-1 right-1/4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
            <span className="text-xs">Messages</span>
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
            variant={currentView === 'dashboard' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('dashboard')}
          >
            <Home className="w-5 h-5 mr-3" />
            Dashboard
          </Button>
          <Button
            variant={currentView === 'hunts' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('hunts')}
          >
            <TrophyIcon className="w-5 h-5 mr-3" />
            Hunt Register
          </Button>
          <Button
            variant={currentView === 'hunters' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('hunters')}
          >
            <Users className="w-5 h-5 mr-3" />
            Hunters
          </Button>
          <Button
            variant={currentView === 'link-requests' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('link-requests')}
          >
            <UserCheck className="w-5 h-5 mr-3" />
            Link Requests
          </Button>
          <Button
            variant={currentView === 'linked-hunts' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('linked-hunts')}
          >
            <LinkIcon className="w-5 h-5 mr-3" />
            Linked Hunts
          </Button>
          <Button
            variant={currentView === 'analytics' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('analytics')}
          >
            <BarChart3 className="w-5 h-5 mr-3" />
            Analytics
          </Button>
          <Button
            variant={currentView === 'documents' ? 'default' : 'ghost'}
            className="w-full justify-start relative"
            onClick={() => setCurrentView('documents')}
          >
            <Shield className="w-5 h-5 mr-3" />
            Documents
            {expiringDocs > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {expiringDocs}
              </span>
            )}
          </Button>
          <Button
            variant={currentView === 'messages' ? 'default' : 'ghost'}
            className="w-full justify-start relative"
            onClick={() => setCurrentView('messages')}
          >
            <MessageSquare className="w-5 h-5 mr-3" />
            Messages
            {unreadMessages > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {unreadMessages}
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
