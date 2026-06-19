import { useState } from 'react';
import { WorkshopDashboard } from './taxidermy/WorkshopDashboard';
import { PartScanningStation } from './taxidermy/PartScanningStation';
import { ArrivalCheckIn } from './taxidermy/ArrivalCheckIn';
import { SkinProcessing } from './taxidermy/SkinProcessing';
import { SkullProcessing } from './taxidermy/SkullProcessing';
import { StorageManagement } from './taxidermy/StorageManagement';
import { MountingStation } from './taxidermy/MountingStation';
import { FinishingStation } from './taxidermy/FinishingStation';
import { QualityInspection } from './taxidermy/QualityInspection';
import { PackingShipping } from './taxidermy/PackingShipping';
import { InventoryView } from './taxidermy/InventoryView';
import { AdminConfiguration } from './taxidermy/AdminConfiguration';
import { UniversalAIAssistant } from './shared/UniversalAIAssistant';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  LayoutDashboard, 
  Scan, 
  ClipboardCheck,
  Droplet,
  Skull,
  Warehouse,
  Scissors,
  Paintbrush,
  CheckCircle2,
  Package,
  List,
  Settings,
  Search,
  LogOut,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { usePortalTheme } from './PortalThemeProvider';

interface TaxidermyPortalProps {
  onLogout: () => void;
}

type TaxidermyView = 
  | 'dashboard' 
  | 'scan' 
  | 'arrival'
  | 'skin-processing'
  | 'skull-processing'
  | 'storage'
  | 'mounting'
  | 'finishing'
  | 'quality'
  | 'packing'
  | 'inventory'
  | 'admin';

export function TaxidermyPortal({ onLogout }: TaxidermyPortalProps) {
  const [currentView, setCurrentView] = useState<TaxidermyView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { theme: portalTheme } = usePortalTheme();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <WorkshopDashboard onNavigate={setCurrentView} />;
      case 'scan':
        return <PartScanningStation />;
      case 'arrival':
        return <ArrivalCheckIn onComplete={() => setCurrentView('dashboard')} />;
      case 'skin-processing':
        return <SkinProcessing />;
      case 'skull-processing':
        return <SkullProcessing />;
      case 'storage':
        return <StorageManagement />;
      case 'mounting':
        return <MountingStation />;
      case 'finishing':
        return <FinishingStation />;
      case 'quality':
        return <QualityInspection />;
      case 'packing':
        return <PackingShipping />;
      case 'inventory':
        return <InventoryView />;
      case 'admin':
        return <AdminConfiguration />;
      default:
        return <WorkshopDashboard onNavigate={setCurrentView} />;
    }
  };

  const NavButton = ({ 
    view, 
    icon: Icon, 
    label 
  }: { 
    view: TaxidermyView; 
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
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-slate-50 to-blue-50 dark:from-stone-950 dark:via-slate-950 dark:to-blue-950">
      {/* Header */}
      <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
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
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="bg-gradient-to-r from-slate-700 to-blue-700 dark:from-slate-400 dark:to-blue-400 bg-clip-text text-transparent">APEX TROPHY SOLUTIONS</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Taxidermy Workshop</p>
                </div>
              </div>
            </div>
            
            {/* Desktop Search */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Search trophies, parts, hunt IDs..." 
                  className="pl-10 bg-slate-50 dark:bg-stone-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-600"
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
        fixed left-0 top-16 bottom-0 w-64 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-r border-slate-200 dark:border-slate-800 z-40
        transition-transform duration-300 ease-in-out overflow-y-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <nav className="p-4 space-y-2">
          <div className="mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 px-3 mb-2">Main</p>
            <NavButton view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavButton view="scan" icon={Scan} label="Scan Parts" />
            <NavButton view="arrival" icon={ClipboardCheck} label="Arrival Check-In" />
          </div>
          
          <div className="mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 px-3 mb-2">Processing</p>
            <NavButton view="skin-processing" icon={Droplet} label="Skin Processing" />
            <NavButton view="skull-processing" icon={Skull} label="Skull Processing" />
            <NavButton view="storage" icon={Warehouse} label="Storage" />
          </div>

          <div className="mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 px-3 mb-2">Assembly</p>
            <NavButton view="mounting" icon={Scissors} label="Mounting" />
            <NavButton view="finishing" icon={Paintbrush} label="Finishing" />
            <NavButton view="quality" icon={CheckCircle2} label="Quality Check" />
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 px-3 mb-2">Logistics</p>
            <NavButton view="packing" icon={Package} label="Packing & Shipping" />
            <NavButton view="inventory" icon={List} label="Inventory" />
            <NavButton view="admin" icon={Settings} label="Admin" />
          </div>
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
