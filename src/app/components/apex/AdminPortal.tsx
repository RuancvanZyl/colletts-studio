import { useState } from 'react';
import { ReceptionDashboard } from './admin/ReceptionDashboard';
import { NewIntake } from './admin/NewIntake';
import { ScanStation } from './admin/ScanStation';
import { StorageLocator } from './admin/StorageLocator';
import { QualityCheck } from './admin/QualityCheck';
import { Dispatch } from './admin/Dispatch';
import { ClientSearch } from './admin/ClientSearch';
import { UniversalAIAssistant } from './shared/UniversalAIAssistant';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  LayoutDashboard, 
  Plus, 
  Scan, 
  Warehouse, 
  CheckCircle, 
  Truck, 
  Users, 
  Search,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Trophy,
  Package
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { usePortalTheme } from './PortalThemeProvider';

interface AdminPortalProps {
  onLogout: () => void;
}

type AdminView = 
  | 'dashboard' 
  | 'intake' 
  | 'scan' 
  | 'storage' 
  | 'qa' 
  | 'dispatch' 
  | 'clients';

export function AdminPortal({ onLogout }: AdminPortalProps) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { theme: portalTheme } = usePortalTheme();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <ReceptionDashboard onNewIntake={() => setCurrentView('intake')} />;
      case 'intake':
        return <NewIntake onComplete={() => setCurrentView('dashboard')} />;
      case 'scan':
        return <ScanStation />;
      case 'storage':
        return <StorageLocator />;
      case 'qa':
        return <QualityCheck />;
      case 'dispatch':
        return <Dispatch />;
      case 'clients':
        return <ClientSearch />;
      default:
        return <ReceptionDashboard onNewIntake={() => setCurrentView('intake')} />;
    }
  };

  const NavButton = ({ 
    view, 
    icon: Icon, 
    label 
  }: { 
    view: AdminView; 
    icon: any; 
    label: string;
  }) => (
    <Button
      variant={currentView === view ? 'default' : 'ghost'}
      className="w-full justify-start"
      onClick={() => {
        setCurrentView(view);
        setSidebarOpen(false);
      }}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-green-50 to-lime-50 dark:from-stone-950 dark:via-green-950 dark:to-stone-900">
      {/* Header */}
      <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-b border-green-200 dark:border-green-900 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${portalTheme.gradient} rounded-lg flex items-center justify-center shadow-md`}>
                  <Package className="w-5 h-5 text-amber-50" />
                </div>
                <div>
                  <h2 className={`bg-gradient-to-r ${portalTheme.gradient} bg-clip-text text-transparent`}>APEX TROPHY SOLUTIONS</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Taxidermy Portal</p>
                </div>
              </div>
            </div>
            
            {/* Desktop Search */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700 dark:text-green-500" />
                <Input 
                  placeholder="Search clients, trophies..." 
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
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-16 bottom-0 w-64 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-r border-green-200 dark:border-green-900 z-40
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <nav className="p-4 space-y-2">
          <NavButton view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavButton view="intake" icon={Plus} label="New Intake" />
          <NavButton view="scan" icon={Scan} label="Scan Station" />
          <NavButton view="storage" icon={Warehouse} label="Storage" />
          <NavButton view="qa" icon={CheckCircle} label="Quality Check" />
          <NavButton view="dispatch" icon={Truck} label="Dispatch" />
          <NavButton view="clients" icon={Users} label="Clients" />
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 p-4 md:p-6">
        {renderView()}
      </main>

      {/* Universal AI Assistant */}
      <UniversalAIAssistant />
    </div>
  );
}
