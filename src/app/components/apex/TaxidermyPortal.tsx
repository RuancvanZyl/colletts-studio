import { useState } from 'react';
import { WorkshopDashboard } from './taxidermy/WorkshopDashboard';
import { SummarySheet } from './taxidermy/SummarySheet';
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
import { ClientManagement } from './taxidermy/ClientManagement';
import { InvoiceManagement } from './taxidermy/InvoiceManagement';
import { AdminConfiguration } from './taxidermy/AdminConfiguration';
import { NoticeBoard } from './shared/NoticeBoard';
import { GlobalSearch } from './shared/GlobalSearch';
import { useAuth } from '../../../lib/auth';
import { Input } from '../ui/input';
import {
  LayoutDashboard, Scan, ClipboardCheck, Droplet, Skull,
  Warehouse, Scissors, Paintbrush, CheckCircle2, Package,
  List, Settings, Search, LogOut, Menu, X, Moon, Sun,
  Users, FileText, ChevronRight, BarChart3,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

type TaxidermyView =
  | 'summary'
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
  | 'clients'
  | 'invoices'
  | 'admin';

interface NavItem {
  view: TaxidermyView;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number | null;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

interface TaxidermyPortalProps {
  onLogout: () => void;
}

export function TaxidermyPortal({ onLogout }: TaxidermyPortalProps) {
  const [currentView, setCurrentView] = useState<TaxidermyView>('summary');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAuth();

  const navigate = (view: string) => {
    setCurrentView(view as TaxidermyView);
    setSidebarOpen(false);
  };

  const role = profile?.role;
  const isAdmin      = role === 'admin' || role === 'studio_manager';
  const isBookkeeper = role === 'bookkeeper';
  const canSeeBusiness = isAdmin || isBookkeeper;

  const allNavGroups: (NavGroup & { roles?: string[] })[] = [
    {
      heading: 'Overview',
      items: [
        { view: 'summary',   icon: BarChart3,      label: 'Summary' },
        { view: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ],
    },
    {
      heading: 'Intake',
      items: [
        { view: 'scan',    icon: Scan,          label: 'Scan Parts' },
        { view: 'arrival', icon: ClipboardCheck, label: 'Arrival Check-In' },
      ],
    },
    {
      heading: 'Processing',
      items: [
        { view: 'skin-processing',  icon: Droplet,   label: 'Skin Processing' },
        { view: 'skull-processing', icon: Skull,     label: 'Skull Processing' },
        { view: 'storage',          icon: Warehouse, label: 'Storage' },
      ],
    },
    {
      heading: 'Assembly',
      items: [
        { view: 'mounting',  icon: Scissors,    label: 'Mounting' },
        { view: 'finishing', icon: Paintbrush,  label: 'Finishing' },
        { view: 'quality',   icon: CheckCircle2, label: 'Quality Check' },
      ],
    },
    {
      heading: 'Logistics',
      items: [
        { view: 'packing',   icon: Package, label: 'Packing & Shipping' },
        { view: 'inventory', icon: List,    label: 'Job Tracker' },
        { view: 'clients',   icon: Users,   label: 'Clients' },
      ],
    },
    ...(canSeeBusiness ? [{
      heading: 'Business',
      items: [
        { view: 'invoices' as TaxidermyView, icon: FileText, label: 'Invoicing' },
        ...(isAdmin ? [{ view: 'admin' as TaxidermyView, icon: Settings, label: 'Admin' }] : []),
      ],
    }] : []),
  ];

  const navGroups = allNavGroups;

  const renderView = () => {
    switch (currentView) {
      case 'summary':         return <SummarySheet onNavigate={navigate} />;
      case 'dashboard':       return <WorkshopDashboard onNavigate={navigate} />;
      case 'scan':            return <PartScanningStation />;
      case 'arrival':         return <ArrivalCheckIn onComplete={() => navigate('summary')} />;
      case 'skin-processing': return <SkinProcessing />;
      case 'skull-processing':return <SkullProcessing />;
      case 'storage':         return <StorageManagement />;
      case 'mounting':        return <MountingStation />;
      case 'finishing':       return <FinishingStation />;
      case 'quality':         return <QualityInspection />;
      case 'packing':         return <PackingShipping />;
      case 'inventory':       return <InventoryView />;
      case 'clients':         return <ClientManagement />;
      case 'invoices':        return <InvoiceManagement />;
      case 'admin':           return <AdminConfiguration />;
      default:                return <SummarySheet onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] dark:bg-[#0e1621] flex">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-[#1c2b3a] flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[#2c3d5b] flex-shrink-0">
          <div className="w-8 h-8 bg-[#0073ea] rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold leading-tight truncate">APEX</p>
            <p className="text-[#8ea0b4] text-[10px] leading-tight">Trophy Solutions</p>
          </div>
          <button
            className="ml-auto lg:hidden text-[#8ea0b4] hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map(group => (
            <div key={group.heading}>
              <p className="text-[10px] font-semibold text-[#5b7a99] uppercase tracking-wider px-2 mb-1">
                {group.heading}
              </p>
              {group.items.map(item => {
                const active = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => navigate(item.view)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-[#0073ea] text-white'
                        : 'text-[#c5cfe0] hover:bg-[#2c3d5b] hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="flex-shrink-0 border-t border-[#2c3d5b] px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#0073ea] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {profile?.full_name?.charAt(0) ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{profile?.full_name ?? 'Staff'}</p>
              <p className="text-[#5b7a99] text-[10px] truncate">{profile?.role?.replace(/_/g, ' ')}</p>
            </div>
            <button
              onClick={onLogout}
              title="Log out"
              className="text-[#5b7a99] hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-56 min-h-screen">

        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-[#1c2b3a] border-b border-slate-200 dark:border-[#2c3d5b] flex items-center px-4 gap-3 sticky top-0 z-30 flex-shrink-0">
          {/* Hamburger */}
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1 text-sm text-slate-400">
            <span>Workshop</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 dark:text-slate-200 font-medium capitalize">
              {currentView.replace(/-/g, ' ')}
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 mx-4 hidden md:block">
            <GlobalSearch onNavigate={navigate} />
          </div>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-1">
            {/* Notice board */}
            <NoticeBoard onNavigate={navigate} />

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c3d5b] transition-colors"
            >
              {theme === 'light'
                ? <Moon className="w-4 h-4 text-slate-500" />
                : <Sun className="w-4 h-4 text-[#c5cfe0]" />
              }
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
