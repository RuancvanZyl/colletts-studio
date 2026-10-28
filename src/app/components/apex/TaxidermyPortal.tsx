import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getStaffDepartments, STALL_HOURS } from '../../../lib/pipeline';
import { toast } from 'sonner';
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
import { StaffManagement } from './taxidermy/StaffManagement';
import { HuntArchive } from './taxidermy/HuntArchive';
import { ClientCare } from './taxidermy/ClientCare';
import { DeadlineWatch } from './taxidermy/DeadlineWatch';
import { AwaitingInstruction } from './taxidermy/AwaitingInstruction';
import { StaffOverview } from './taxidermy/StaffOverview';
import { DispatchBoard } from './taxidermy/DispatchBoard';
import { OfflineBanner } from './shared/OfflineBanner';
import { Messages } from './taxidermy/Messages';
import { WorkshopSetup } from './taxidermy/WorkshopSetup';
import { TodayScreen } from './taxidermy/TodayScreen';
import { AnimalGuideEditor } from './taxidermy/AnimalGuideEditor';
import { HuntDocuments } from './taxidermy/HuntDocuments';
import { DocumentTypesEditor } from './taxidermy/DocumentTypesEditor';
import { OutfitterInbox } from './taxidermy/OutfitterInbox';
import { PermitNumbers } from './taxidermy/PermitNumbers';
import { InstallBanner } from './shared/InstallApp';
import { DepartmentProgress } from './taxidermy/DepartmentProgress';
import { ProgressCheck } from './taxidermy/ProgressCheck';
import { IncomingCards } from './taxidermy/IncomingCards';
import { RejectionCases } from './taxidermy/RejectionCases';
import { Quotes } from './taxidermy/Quotes';
import { Outfitters } from './taxidermy/Outfitters';
import { PaymentsLedger } from './taxidermy/PaymentsLedger';
import { StationsHome } from './taxidermy/StationsHome';
import { ClientStatusBoard } from './taxidermy/ClientStatusBoard';
import { SectionTabs } from './shared/SectionTabs';
import { STATIONS } from '../../../lib/stations';
import { useUnreadMessages, canCommunicate } from '../../../lib/hooks/useMessages';
import { NoticeBoard } from './shared/NoticeBoard';
import { GlobalSearch } from './shared/GlobalSearch';
import { useAuth } from '../../../lib/auth';
import { Input } from '../ui/input';
import {
  LayoutDashboard, Scan, ClipboardCheck, Droplet, Skull,
  Warehouse, Scissors, Paintbrush, CheckCircle2, Package,
  List, Settings, Search, LogOut, Menu, X, Moon, Sun, Home, MoreHorizontal,
  Users, FileText, ChevronRight, ChevronLeft, BarChart3, ClipboardList, ListTodo, FolderOpen, CreditCard, Calendar, MessageCircle, AlertTriangle, Clock,
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
  | 'admin'
  | 'staff-management'
  | 'staff-overview'
  | 'dispatch'
  | 'messages'
  | 'workshop-setup'
  | 'hunt-archive'
  | 'client-care'
  | 'deadline-watch'
  | 'awaiting-instruction'
  | 'stations'
  | 'status-board'
  | 'whiteboard'
  | 'animal-guide'
  | 'quotes'
  | 'outfitters'
  | 'documents'
  | 'outfitter-chat'
  | 'document-types'
  | 'permit-numbers'
  | 'dept-progress'
  | 'progress-check'
  | 'incoming'
  | 'rejections';

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
  const [landed, setLanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [navClientId, setNavClientId] = useState<string | undefined>(undefined);
  const [myTaskCount, setMyTaskCount] = useState<number | null>(null);
  const [lastTab, setLastTab] = useState<Record<string, string>>({});
  const { theme, toggleTheme } = useTheme();
  const { profile, profileError } = useAuth();

  // If the profile could not be read, say so loudly — otherwise a manager
  // silently looks like a worker and nobody knows why.
  useEffect(() => {
    if (profileError) {
      toast.error(`Could not load your access level: ${profileError}`, { duration: 20000 });
    }
  }, [profileError]);

  // Live task count badge for the sidebar
  useEffect(() => {
    if (!profile?.full_name) return;
    const depts = getStaffDepartments(profile.full_name, profile.department_name, profile.works_in);
    if (!depts.length) return;
    (supabase as any)
      .from('hunt_documents')
      .select('id', { count: 'exact', head: true })
      .eq('doc_type', 'job_card')
      .in('current_department', depts)
      .eq('status', 'in_progress')
      .then(({ count }: { count: number | null }) => setMyTaskCount(count ?? 0));
  }, [profile?.full_name]);

  // Role-based landing page: admins land on Summary, bookkeepers on Payments,
  // everyone else on My Tasks
  useEffect(() => {
    if (!profile?.role || landed) return;
    setLanded(true);
    if (['admin', 'studio_manager'].includes(profile.role)) setCurrentView('whiteboard');
    else if (profile.role === 'bookkeeper') setCurrentView('payment-confirmation');
    else setCurrentView('tasks');
  }, [profile?.role, landed]);

  // Larger base text for the whole staff portal — easier reading on the floor
  useEffect(() => {
    const prev = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '17px';
    return () => { document.documentElement.style.fontSize = prev; };
  }, []);

  // Login alerts — once per session, tell the staff member what's waiting for them
  useEffect(() => {
    if (!profile?.id) return;
    const alertKey = `apex_login_alert_${profile.id}`;
    if (sessionStorage.getItem(alertKey)) return;
    sessionStorage.setItem(alertKey, '1');

    (async () => {
      const depts = getStaffDepartments(profile.full_name ?? '', profile.department_name, profile.works_in);
      const isAdminRole = ['admin', 'studio_manager'].includes(profile.role ?? '');

      // Tasks assigned directly to this staff member or unassigned in their departments
      let query = (supabase as any)
        .from('hunt_documents')
        .select('id, current_department, last_moved_at, assigned_to, admin_notes')
        .eq('doc_type', 'job_card')
        .eq('status', 'in_progress');

      if (!isAdminRole) {
        query = depts.length
          ? query.or(`assigned_to.eq.${profile.id},and(assigned_to.is.null,current_department.in.(${depts.join(',')}))`)
          : query.eq('assigned_to', profile.id);
      }

      const { data: docs } = await query;
      const myDocs: any[] = docs ?? [];
      if (myDocs.length === 0) {
        toast.success(`Welcome back, ${profile.full_name?.split(' ')[0]}! No open tasks right now.`);
        return;
      }

      const now = Date.now();
      const stalled = myDocs.filter(d => {
        if (!d.last_moved_at) return false;
        const hrs = (now - new Date(d.last_moved_at).getTime()) / 3_600_000;
        return hrs > (STALL_HOURS[d.current_department] ?? 72) * 2;
      }).length;
      const withNotes = myDocs.filter(d => d.admin_notes).length;

      toast.info(
        `Welcome back, ${profile.full_name?.split(' ')[0]}! ${myDocs.length} task${myDocs.length !== 1 ? 's' : ''} waiting${isAdminRole ? ' in the workshop' : ' for you'}.`,
        { duration: 6000 }
      );
      if (stalled > 0) {
        toast.error(`⚠ ${stalled} task${stalled !== 1 ? 's are' : ' is'} critically overdue — please prioritise.`, { duration: 8000 });
      }
      if (withNotes > 0 && !isAdminRole) {
        toast.warning(`📋 ${withNotes} task${withNotes !== 1 ? 's have' : ' has'} admin instructions attached.`, { duration: 8000 });
      }
    })();
  }, [profile?.id]);

  // Strict deadline alert — management only, does not auto-dismiss.
  // Checked every login so an overdue client can never quietly slip by.
  useEffect(() => {
    const role = profile?.role;
    if (!profile?.id || !['admin', 'studio_manager'].includes(role ?? '')) return;
    const alertKey = `apex_deadline_alert_${profile.id}`;
    if (sessionStorage.getItem(alertKey)) return;
    sessionStorage.setItem(alertKey, '1');

    (async () => {
      const { data } = await (supabase as any)
        .from('client_hunts')
        .select('deadline_current, clients!inner(full_name)')
        .eq('status', 'active')
        .eq('client_type', 'export')
        .not('deadline_current', 'is', null)
        .lt('deadline_current', new Date().toISOString().slice(0, 10));

      const overdue = data ?? [];
      if (overdue.length === 0) return;

      const names = overdue.slice(0, 3).map((h: any) => h.clients?.full_name).filter(Boolean).join(', ');
      toast.error(
        `⚠ ${overdue.length} client hunt${overdue.length !== 1 ? 's have' : ' has'} missed their deadline${names ? ` — ${names}${overdue.length > 3 ? '…' : ''}` : ''}. Open Deadline Watch to review.`,
        { duration: Infinity, closeButton: true }
      );
    })();
  }, [profile?.id, profile?.role]);

  const navigate = (view: string, clientId?: string) => {
    setCurrentView(view as TaxidermyView);
    setNavClientId(clientId);
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
    const sec = sectionOf(view);
    if (sec) setLastTab(m => ({ ...m, [sec.key]: STATION_VIEWS.includes(view) ? 'stations' : view }));
  };

  const role = profile?.role;
  const isAdmin      = role === 'admin' || role === 'studio_manager';
  const isBookkeeper = role === 'bookkeeper';
  const isManager    = canCommunicate(profile);
  const unreadMessages = useUnreadMessages();
  const canSeeBusiness = isAdmin || isBookkeeper;

  // ── Role tiers ────────────────────────────────────────────────────────────
  // admin / studio_manager : everything
  // bookkeeper             : overview + business (no processing stations)
  // ground_staff           : intake + their departments
  // department_staff       : only their own department stations + tasks
  const myDepts = getStaffDepartments(profile?.full_name ?? '', profile?.department_name, profile?.works_in);

  // Which departments unlock which station views
  const VIEW_DEPT: Record<string, string[]> = {
    'scan':             ['receiving'],
    'arrival':          ['receiving'],
    'receiving':        ['receiving'],
    'quick-entry':      ['receiving'],
    'dropbox-import':   ['receiving'],
    'skinning':         ['skinning'],
    'salting':          ['salting'],
    'tannery':          ['tannery'],
    'skin-processing':  ['cleaning_bleach'],
    'skull-processing': ['cleaning_bleach'],
    'dip-pack':         ['dip_pack'],
    'storage':          ['storage'],
    'mounting':         ['mounting'],
    'finishing':        ['finishing'],
    'quality':          ['quality_check'],
    'packing':          ['packing'],
    'photos-admin':     ['photos'],
    'ready-to-ship':    ['packing', 'administration'],
  };

  const canSeeView = (view: TaxidermyView): boolean => {
    if (isAdmin) return true;
    // Everyone gets their tasks + daily list + workshop instructions
    if (['daily-todo', 'tasks', 'workshop-brief', 'messages', 'incoming'].includes(view)) return true;
    if (view === 'stations') return STATIONS.some(st => canSeeView(st.view as TaxidermyView));
    // department managers also handle client conversations
    if (isManager && view === 'client-inbox') return true;
    if (isManager && view === 'dept-progress') return true;
    if (isManager && view === 'rejections') return true;
    if (isBookkeeper) {
      return ['summary', 'whiteboard', 'dashboard', 'client-inbox', 'payment-confirmation', 'invoices', 'inventory', 'clients', 'hunt-archive', 'client-care', 'deadline-watch', 'awaiting-instruction', 'status-board', 'quotes', 'documents', 'outfitter-chat'].includes(view);
    }
    // Department staff / ground staff: only stations in their departments
    const deptsNeeded = VIEW_DEPT[view];
    if (deptsNeeded) return deptsNeeded.some(d => myDepts.includes(d));
    return false; // summary, dashboard, job tracker, clients, business, staff — admin/bookkeeper only
  };

  // ── The menu: a few plain sections; related screens are tabs inside them ────────────
  interface Section { key: string; label: string; icon: React.ComponentType<{ className?: string }>; tabs: { view: TaxidermyView; label: string; badge?: number | null }[] }
  const allSections: Section[] = [
    { key: 'today', label: isAdmin || isBookkeeper ? 'Today' : 'My work', icon: Home, tabs: [
      { view: 'whiteboard', label: 'Whiteboard' },
      { view: 'summary',    label: 'Needs you' },
      { view: 'tasks',      label: 'My tasks', badge: isAdmin ? null : myTaskCount },
      { view: 'daily-todo', label: 'Daily list' },
    ] },
    { key: 'checkin', label: 'Check in', icon: ClipboardCheck, tabs: [
      { view: 'arrival',     label: 'Check in trophies' },
      { view: 'receiving',   label: 'Receiving sheet' },
      { view: 'scan',        label: 'Scan parts' },
      { view: 'quick-entry', label: 'Quick job entry' },
    ] },
    { key: 'hunters', label: 'Hunters', icon: Users, tabs: [
      { view: 'clients',              label: 'All hunters' },
      { view: 'client-care',          label: 'Need contact' },
      { view: 'awaiting-instruction', label: 'Waiting for mounts' },
      { view: 'documents',            label: 'Documents' },
      { view: 'deadline-watch',       label: 'Past deadline' },
      { view: 'outfitters',           label: 'Outfitters' },
      { view: 'status-board',         label: 'Status board' },
      { view: 'hunt-archive',         label: 'Archive' },
    ] },
    { key: 'workshop', label: 'Workshop', icon: Scissors, tabs: [
      { view: 'incoming',       label: 'Incoming' },
      { view: 'rejections',     label: 'Rejected skins' },
      { view: 'workshop-brief', label: 'Job cards' },
      { view: 'stations',       label: 'Stations' },
      { view: 'dispatch',       label: 'Assign work' },
      { view: 'inventory',      label: 'Job tracker' },
      { view: 'dept-progress',  label: 'Departments' },
      { view: 'progress-check', label: 'Progress check' },
    ] },
    { key: 'shipping', label: 'Shipping', icon: Package, tabs: [
      { view: 'packing',       label: 'Packing' },
      { view: 'photos-admin',  label: 'Photos & dispatch' },
      { view: 'ready-to-ship', label: 'Ready to ship' },
    ] },
    { key: 'messages', label: 'Messages', icon: MessageCircle, tabs: [
      { view: 'messages',     label: 'Team', badge: unreadMessages },
      { view: 'client-inbox', label: 'Hunters' },
      { view: 'outfitter-chat', label: 'Outfitters' },
    ] },
    { key: 'money', label: 'Money', icon: CreditCard, tabs: [
      { view: 'quotes',               label: 'Quotes' },
      { view: 'payment-confirmation', label: 'Payments' },
      { view: 'invoices',             label: 'Invoices' },
    ] },
    { key: 'setup', label: 'Setup', icon: Settings, tabs: [
      { view: 'staff-management', label: 'Staff' },
      { view: 'workshop-setup',   label: 'Checklists' },
      { view: 'document-types',   label: 'Required documents' },
      { view: 'permit-numbers',   label: 'Permit numbers' },
      { view: 'animal-guide',     label: 'Animal guide' },
      { view: 'admin',            label: 'Settings' },
      { view: 'dropbox-import',   label: 'Dropbox import' },
    ] },
  ];

  const STATION_VIEWS = STATIONS.map(st => st.view);
  const sections = allSections
    .map(sec => ({ ...sec, tabs: sec.tabs.filter(t => canSeeView(t.view)) }))
    .filter(sec => sec.tabs.length > 0);
  const sectionOf = (v: string) => sections.find(sec => sec.tabs.some(t => t.view === v) || (sec.key === 'workshop' && STATION_VIEWS.includes(v)));
  const activeSection = sectionOf(currentView);
  const activeTab = STATION_VIEWS.includes(currentView) ? 'stations' : currentView;
  const sectionBadge = (sec: { tabs: { badge?: number | null }[] }) => sec.tabs.reduce((n, t) => n + (t.badge ?? 0), 0);
  const openSection = (sec: { key: string; tabs: { view: TaxidermyView }[] }) => navigate(lastTab[sec.key] && sec.tabs.some(t => t.view === lastTab[sec.key]) ? lastTab[sec.key] : sec.tabs[0].view);
  const viewLabel = (v: string) => STATIONS.find(st => st.view === v)?.label ?? sections.flatMap(sec => sec.tabs).find(t => t.view === v)?.label ?? v.replace(/-/g, ' ');

  const renderView = () => {
    // Enforce role tier — even if a view is reached programmatically
    if (!canSeeView(currentView)) return <MyTasks />;
    switch (currentView) {
      case 'daily-todo':      return <DailyTodoList onNavigateDept={navigate} />;
      case 'tasks':           return <MyTasks />;
      case 'summary':         return <TodayScreen onNavigate={navigate} />;
      case 'whiteboard':      return <SummarySheet onNavigate={navigate} />;
      case 'animal-guide':    return <AnimalGuideEditor />;
      case 'outfitters':      return <Outfitters onOpenQuote={(id) => navigate('quotes', id)} />;
      case 'documents':       return <HuntDocuments key={navClientId ?? 'all'} initialHuntId={navClientId} />;
      case 'document-types':  return <DocumentTypesEditor />;
      case 'permit-numbers':  return <PermitNumbers />;
      case 'outfitter-chat':  return <OutfitterInbox key={navClientId ?? 'all'} initialHuntId={navClientId} onOpenDocs={(id) => navigate('documents', id)} />;
      case 'incoming':        return <IncomingCards />;
      case 'rejections':      return <RejectionCases key={navClientId ?? 'all'} initialCaseId={navClientId} onNavigate={navigate} />;
      case 'dept-progress':   return <DepartmentProgress onNavigate={navigate} />;
      case 'progress-check':  return <ProgressCheck key={navClientId ?? 'all'} initialHuntId={navClientId} onNavigate={navigate} />;
      case 'quotes':          return <Quotes key={navClientId ?? 'all'} initialHuntId={navClientId} />;
      case 'stations':        return <StationsHome stations={STATIONS.filter(st => canSeeView(st.view as TaxidermyView))} onOpen={navigate} />;
      case 'status-board':    return <ClientStatusBoard onNavigate={navigate} />;
      case 'dashboard':       return <WorkshopDashboard onNavigate={navigate} />;
      case 'scan':            return <PartScanningStation onNavigate={navigate} />;
      case 'arrival':         return <ArrivalCheckIn onComplete={() => navigate(isAdmin ? 'whiteboard' : 'tasks')} />;
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
      case 'ready-to-ship':          return <ReadyToShip onOpenClient={(id) => navigate('clients', id)} onOpenDocs={(id) => navigate('documents', id)} />;
      case 'client-inbox':           return <ClientInbox />;
      case 'payment-confirmation':   return <PaymentsLedger onOpenQuote={(id) => navigate('quotes', id)} />;
      case 'inventory':              return <JobTracker />;
      case 'clients':         return <ClientManagement initialClientId={navClientId} onOpenQuote={(id) => navigate('quotes', id)} />;
      case 'invoices':        return <InvoiceManagement />;
      case 'admin':             return <AdminConfiguration />;
      case 'staff-overview':    return <StaffOverview />;
      case 'dispatch':          return <DispatchBoard />;
      case 'messages':          return <Messages />;
      case 'workshop-setup':    return <WorkshopSetup />;
      case 'hunt-archive':      return <HuntArchive />;
      case 'client-care':       return <ClientCare onOpenClient={(id) => navigate('clients', id)} />;
      case 'deadline-watch':    return <DeadlineWatch onOpenHunt={(clientId) => navigate('clients', clientId)} />;
      case 'awaiting-instruction': return <AwaitingInstruction onOpenClient={(id) => navigate('clients', id)} />;
      case 'staff-management':  return <StaffManagement />;
      default:                  return <TodayScreen onNavigate={navigate} />;
    }
  };

  return (
    <div className="staff-readable min-h-screen bg-[#080C0C] dark:bg-[#080C0C] flex">

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
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
          {sections.map(sec => {
            const active = activeSection?.key === sec.key;
            const badge = sectionBadge(sec);
            return (
              <button
                key={sec.key}
                onClick={() => openSection(sec)}
                className={`w-full flex items-center gap-3 px-4 min-h-12 rounded-xl text-base transition-colors ${
                  active
                    ? 'bg-[rgba(58,174,204,0.18)] text-white border border-[rgba(58,174,204,0.4)] font-semibold'
                    : 'text-[#B5D3DB] hover:bg-[rgba(58,174,204,0.08)] hover:text-white border border-transparent'
                }`}
              >
                <sec.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#3AAECC]' : ''}`} />
                <span className="truncate">{sec.label}</span>
                {badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center flex-shrink-0">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
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
      <div className="flex-1 min-w-0 flex flex-col lg:ml-60 min-h-screen">

        {/* Top bar */}
        <header className="h-14 bg-[#0F1A1C] border-b border-[rgba(58,174,204,0.12)] flex items-center px-4 gap-3 sticky top-0 z-30 flex-shrink-0">
          {/* Hamburger */}
          <button
            className="lg:hidden text-[#7AADB8] hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Where am I */}
          <div className="flex items-center gap-1.5 text-base text-[#B5D3DB] min-w-0">
            {activeSection && <span className="hidden sm:inline">{activeSection.label}</span>}
            {activeSection && <ChevronRight className="hidden sm:block w-4 h-4 shrink-0" />}
            <span className="text-white font-semibold truncate">{viewLabel(currentView)}</span>
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
        <main className="flex-1 min-w-0 p-4 md:p-6 pb-28 lg:pb-6 overflow-x-auto bg-[#080C0C]">
          <OfflineBanner />
          <InstallBanner />
          {activeSection && (
            <>
              <SectionTabs tabs={activeSection.tabs} active={activeTab} onSelect={navigate} />
              {STATION_VIEWS.includes(currentView) && (
                <button onClick={() => navigate('stations')} className="mb-3 -mt-2 inline-flex items-center gap-1 text-base text-[#3AAECC] font-semibold min-h-11">
                  <ChevronLeft className="w-4 h-4" />All stations
                </button>
              )}
            </>
          )}
          {renderView()}
        </main>

        {/* Phone: the four main places, always one tap away */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0F1A1C] border-t border-[rgba(58,174,204,0.2)] grid" style={{ gridTemplateColumns: `repeat(${Math.min(sections.length, 5)}, minmax(0, 1fr))` }}>
          {sections.slice(0, sections.length > 5 ? 4 : 5).map(sec => {
            const active = activeSection?.key === sec.key;
            const badge = sectionBadge(sec);
            return (
              <button key={sec.key} onClick={() => openSection(sec)} className={`relative flex flex-col items-center justify-center gap-0.5 min-h-16 text-xs font-semibold ${active ? 'text-[#3AAECC]' : 'text-[#B5D3DB]'}`}>
                <sec.icon className="w-6 h-6" />{sec.label}
                {badge > 0 && <span className="absolute top-1.5 left-1/2 ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
              </button>
            );
          })}
          {sections.length > 5 && (
            <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center justify-center gap-0.5 min-h-16 text-xs font-semibold text-[#B5D3DB]">
              <MoreHorizontal className="w-6 h-6" />More
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
