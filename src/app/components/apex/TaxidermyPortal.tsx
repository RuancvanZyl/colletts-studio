import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getStaffDepartments } from '../../../lib/pipeline';
import { MyTasks } from './taxidermy/MyTasks';
import { WorkshopDashboard } from './taxidermy/WorkshopDashboard';
import { SummarySheet } from './taxidermy/SummarySheet';
import { PartScanningStation } from './taxidermy/PartScanningStation';
import { ArrivalCheckIn } from './taxidermy/ArrivalCheckIn';
import { ReceivingSheet } from './taxidermy/ReceivingSheet';
import { SkinProcessing } from './taxidermy/SkinProcessing';
import { SkullProcessing } from './taxidermy/SkullProcessing';
import { StorageManagement } from './taxidermy/StorageManagement';
import { MountingStation } from './taxidermy/MountingStation';
import { FinishingStation } from './taxidermy/FinishingStation';
import { QualityInspection } from './taxidermy/QualityInspection';
import { PackingShipping } from './taxidermy/PackingShipping';
import { JobTracker } from './taxidermy/JobTracker';
import { ClientManagement } from './taxidermy/ClientManagement';
import { InvoiceManagement } from './taxidermy/InvoiceManagement';
import { AdminConfiguration } from './taxidermy/AdminConfiguration';
import { QuickJobEntry } from './taxidermy/QuickJobEntry';
import { DropboxImport } from './taxidermy/DropboxImport';
import { SkinningStation } from './taxidermy/SkinningStation';
import { SaltingStation } from './taxidermy/SaltingStation';
import { DipPackStation } from './taxidermy/DipPackStation';
import { PackingStation } from './taxidermy/PackingStation';
import { TanneryStation } from './taxidermy/TanneryStation';
import { ReadyToShip } from './taxidermy/ReadyToShip';
import { ClientInbox } from './taxidermy/ClientInbox';
import { WorkshopInstructions } from './taxidermy/WorkshopInstructions';
import { PaymentConfirmation } from './taxidermy/PaymentConfirmation';
import { DailyTodoList } from './taxidermy/DailyTodoList';
import { NoticeBoard } from './shared/NoticeBoard';
import { GlobalSearch } from './shared/GlobalSearch';
import { useAuth } from '../../../lib/auth';
import { Input } from '../ui/input';
import {
  LayoutDashboard, Scan, ClipboardCheck, Droplet, Skull,
  Warehouse, Scissors, Paintbrush, CheckCircle2, Package,
  List, Settings, Search, LogOut, Menu, X, Moon, Sun,
  Users, FileText, ChevronRight, BarChart3, ClipboardList, ListTodo, FolderOpen, CreditCard, Calendar, MessageCircle,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

type TaxidermyView =
  | 'summary'
  | 'dashboard'
  | 'daily-todo'
  | 'tasks'
  | 'scan'
  | 'arrival'
  | 'receiving'
  | 'quick-entry'
  | 'dropbox-import'
  | 'skinning'
  | 'salting'
  | 'tannery'
  | 'dip-pack'
  | 'skin-processing'
  | 'skull-processing'
  | 'storage'
  | 'mounting'
  | 'finishing'
  | 'quality'
  | 'packing'
  | 'photos-admin'
  | 'ready-to-ship'
  | 'client-inbox'
  | 'workshop-brief'
  | 'payment-confirmation'
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
  const [currentView, setCurrentView] = useState<TaxidermyView>('tasks');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [navClientId, setNavClientId] = useState<string | undefined>(undefined);
  const [myTaskCount, setMyTaskCount] = useState<number | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAuth();

  // Live task count badge for the sidebar
  useEffect(() => {
    if (!profile?.full_name) return;
    const depts = getStaffDepartments(profile.full_name);
    if (!depts.length) return;
    (supabase as any)
      .from('hunt_documents')
      .select('id', { count: 'exact', head: true })
      .eq('doc_type', 'job_card')
      .in('current_department', depts)
      .neq('status', 'complete')
      .then(({ count }: { count: number | null }) => setMyTaskCount(count ?? 0));
  }, [profile?.full_name]);

  const navigate = (view: string, clientId?: string) => {
    setCurrentView(view as TaxidermyView);
    setNavClientId(clientId);
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
        { view: 'daily-todo', icon: Calendar,        label: 'Daily Tasks' },
        { view: 'tasks',     icon: ListTodo,        label: 'My Tasks', badge: myTaskCount },
        { view: 'summary',   icon: BarChart3,       label: 'Summary' },
        { view: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ],
    },
    {
      heading: 'Intake',
      items: [
        { view: 'scan',        icon: Scan,          label: 'Scan Parts' },
        { view: 'arrival',     icon: ClipboardCheck, label: 'Arrival Check-In' },
        { view: 'receiving',   icon: ClipboardList,  label: 'Receiving Sheet' },
        { view: 'quick-entry',    icon: ClipboardList,  label: 'Quick Job Entry' },
        { view: 'dropbox-import', icon: FolderOpen,     label: 'Dropbox Import' },
      ],
    },
    {
      heading: 'Processing',
      items: [
        { view: 'skinning',         icon: Scissors,  label: 'Skinning' },
        { view: 'salting',          icon: Droplet,   label: 'Salting' },
        { view: 'tannery',          icon: Droplet,   label: 'Tannery' },
        { view: 'skin-processing',  icon: Droplet,   label: 'Cleaning & Bleach' },
        { view: 'skull-processing', icon: Skull,     label: 'Skull Processing' },
        { view: 'dip-pack',         icon: Package,   label: 'Dip & Pack' },
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
        { view: 'workshop-brief', icon: ClipboardList, label: 'Workshop Instructions' },
        { view: 'packing',       icon: Package, label: 'Packing & Crating' },
        { view: 'photos-admin',  icon: FileText, label: 'Photos & Dispatch' },
        { view: 'ready-to-ship', icon: Package, label: 'Ready to Ship' },
        { view: 'inventory',     icon: List,    label: 'Job Tracker' },
        { view: 'clients',      icon: Users,   label: 'Clients' },
      ],
    },
    ...(canSeeBusiness ? [{
      heading: 'Business',
      items: [
        { view: 'client-inbox' as TaxidermyView, icon: MessageCircle, label: 'Client Messages' },
        { view: 'payment-confirmation' as TaxidermyView, icon: CreditCard, label: 'Payments' },
        { view: 'invoices' as TaxidermyView, icon: FileText, label: 'Invoicing' },
        ...(isAdmin ? [{ view: 'admin' as TaxidermyView, icon: Settings, label: 'Admin' }] : []),
      ],
    }] : []),
  ];

  const navGroups = allNavGroups;

  const renderView = () => {
    switch (currentView) {
      case 'daily-todo':      return <DailyTodoList onNavigateDept={navigate} />;
      case 'tasks':           return <MyTasks />;
      case 'summary':         return <SummarySheet onNavigate={navigate} />;
      case 'dashboard':       return <WorkshopDashboard onNavigate={navigate} />;
      case 'scan':            return <PartScanningStation onNavigate={navigate} />;
      case 'arrival':         return <ArrivalCheckIn onComplete={() => navigate('receiving')} />;
      case 'receiving':       return <ReceivingSheet onNavigate={navigate} />;
      case 'quick-entry':     return <QuickJobEntry onDone={() => navigate('tasks')} />;
      case 'dropbox-import':  return <DropboxImport />;
      case 'skinning':        return <SkinningStation />;
      case 'salting':         return <SaltingStation />;
      case 'tannery':         return <TanneryStation />;
      case 'dip-pack':        return <DipPackStation />;
      case 'skin-processing': return <SkinProcessing />;
      case 'skull-processing':return <SkullProcessing />;
      case 'storage':         return <StorageManagement />;
      case 'mounting':        return <MountingStation />;
      case 'finishing':       return <FinishingStation />;
      case 'quality':         return <QualityInspection />;
      case 'workshop-brief':         return <WorkshopInstructions />;
      case 'packing':                return <PackingStation />;
      case 'photos-admin':           return <PackingShipping />;
      case 'ready-to-ship':          return <ReadyToShip />;
      case 'client-inbox':           return <ClientInbox />;
      case 'payment-confirmation':   return <PaymentConfirmation />;
      case 'inventory':              return <JobTracker />;
      case 'clients':         return <ClientManagement initialClientId={navClientId} />;
      case 'invoices':        return <InvoiceManagement />;
      case 'admin':           return <AdminConfiguration />;
      default:                return <SummarySheet onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#080C0C] dark:bg-[#080C0C] flex">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 flex flex-col
        bg-[#060A0A] border-r border-[rgba(58,174,204,0.12)]
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-[rgba(58,174,204,0.12)] flex-shrink-0">
          <img src="/apex-logo.png" alt="Apex Trophy Solutions" className="w-10 h-10 object-contain flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white text-sm font-bold tracking-widest leading-tight">APEX</p>
            <p className="text-[#3AAECC] text-[10px] tracking-[0.2em] uppercase leading-tight">Trophy Solutions</p>
          </div>
          <button
            className="ml-auto lg:hidden text-[#7AADB8] hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {navGroups.map(group => (
            <div key={group.heading}>
              <p className="text-[9px] font-bold text-[#3AAECC]/50 uppercase tracking-[0.18em] px-3 mb-1.5">
                {group.heading}
              </p>
              {group.items.map(item => {
                const active = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => navigate(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      active
                        ? 'bg-[rgba(58,174,204,0.15)] text-[#3AAECC] border border-[rgba(58,174,204,0.3)]'
                        : 'text-[#7AADB8] hover:bg-[rgba(58,174,204,0.07)] hover:text-[#EDF6F9]'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#3AAECC]' : ''}`} />
                    <span className="truncate font-medium">{item.label}</span>
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
        <div className="flex-shrink-0 border-t border-[rgba(58,174,204,0.12)] px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[rgba(58,174,204,0.2)] border border-[rgba(58,174,204,0.4)] flex items-center justify-center flex-shrink-0">
              <span className="text-[#3AAECC] text-xs font-bold">
                {profile?.full_name?.charAt(0) ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#EDF6F9] text-xs font-semibold truncate">{profile?.full_name ?? 'Staff'}</p>
              <p className="text-[#7AADB8] text-[10px] truncate capitalize">{profile?.role?.replace(/_/g, ' ')}</p>
            </div>
            <button
              onClick={onLogout}
              title="Log out"
              className="text-[#7AADB8] hover:text-red-400 transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">

        {/* Top bar */}
        <header className="h-14 bg-[#0F1A1C] border-b border-[rgba(58,174,204,0.12)] flex items-center px-4 gap-3 sticky top-0 z-30 flex-shrink-0">
          {/* Hamburger */}
          <button
            className="lg:hidden text-[#7AADB8] hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1 text-sm text-[#7AADB8]">
            <span>Workshop</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#EDF6F9] font-medium capitalize">
              {currentView.replace(/-/g, ' ')}
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 mx-4 hidden md:block">
            <GlobalSearch onNavigate={navigate} />
          </div>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-1">
            <NoticeBoard onNavigate={navigate} />
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[rgba(58,174,204,0.1)] transition-colors"
            >
              {theme === 'light'
                ? <Moon className="w-4 h-4 text-[#7AADB8]" />
                : <Sun className="w-4 h-4 text-[#7AADB8]" />
              }
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-[#080C0C]">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
