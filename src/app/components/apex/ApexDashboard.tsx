import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  User, 
  Compass, 
  Package, 
  ArrowRight, 
  Trophy, 
  Users, 
  Target,
  Activity,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ApexDashboardProps {
  onSelectPortal: (portal: 'hunter' | 'outfitter' | 'taxidermy' | 'admin') => void;
}

const systemMetrics = {
  activeHunts: 24,
  totalTrophiesTracked: 187,
  registeredHunters: 156,
  activeOutfitters: 12,
  huntsInProduction: 8,
  completedThisMonth: 15,
};

export function ApexDashboard({ onSelectPortal }: ApexDashboardProps) {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-green-50 to-lime-50 dark:from-stone-950 dark:via-green-950 dark:to-stone-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-lime-800 dark:from-green-950 dark:via-green-900 dark:to-lime-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTItMTRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center border border-white/20">
                <Trophy className="w-8 h-8 text-amber-300" />
              </div>
              <h1 className="text-white text-4xl md:text-5xl">Apex Trophy Solutions</h1>
            </div>
            <p className="text-xl text-green-100 mb-2">
              Connecting Hunters, Outfitters, and Taxidermists in one smart tracking ecosystem
            </p>
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md">
              Unified Management System
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* System Metrics */}
        <div className="mb-12">
          <h2 className="text-slate-900 dark:text-slate-100 mb-6">System Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-4 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
              <div className="text-center">
                <Activity className="w-8 h-8 mx-auto mb-2 text-green-700 dark:text-green-500" />
                <div className="text-2xl text-green-800 dark:text-green-400 mb-1">
                  {systemMetrics.activeHunts}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-400">Active Hunts</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/50 dark:to-green-950/50 border-lime-300 dark:border-lime-800">
              <div className="text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-lime-700 dark:text-lime-500" />
                <div className="text-2xl text-lime-800 dark:text-lime-400 mb-1">
                  {systemMetrics.totalTrophiesTracked}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-400">Total Trophies</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700">
              <div className="text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-green-700 dark:text-green-500" />
                <div className="text-2xl text-green-900 dark:text-green-300 mb-1">
                  {systemMetrics.registeredHunters}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-400">Hunters</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-amber-300 dark:border-amber-800">
              <div className="text-center">
                <Compass className="w-8 h-8 mx-auto mb-2 text-amber-700 dark:text-amber-500" />
                <div className="text-2xl text-amber-800 dark:text-amber-400 mb-1">
                  {systemMetrics.activeOutfitters}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-400">Outfitters</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-300 dark:border-blue-800">
              <div className="text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-blue-700 dark:text-blue-500" />
                <div className="text-2xl text-blue-800 dark:text-blue-400 mb-1">
                  {systemMetrics.huntsInProduction}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-400">In Production</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-300 dark:border-emerald-800">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-700 dark:text-emerald-500" />
                <div className="text-2xl text-emerald-800 dark:text-emerald-400 mb-1">
                  {systemMetrics.completedThisMonth}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-400">Completed</div>
              </div>
            </Card>
          </div>
        </div>

        {/* Portal Selection */}
        <div className="mb-12">
          <h2 className="text-slate-900 dark:text-slate-100 mb-6">Access Portals</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Hunter Portal */}
            <Card className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 cursor-pointer">
              <div className="p-8 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 group-hover:from-green-100 group-hover:to-lime-100 dark:group-hover:from-green-900/50 dark:group-hover:to-lime-900/50 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-green-700 via-green-600 to-lime-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-slate-900 dark:text-slate-100 mb-2">Hunter Portal</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Track your trophies, manage hunts, and communicate with outfitters and taxidermists
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="text-xs">Trophy Tracking</Badge>
                  <Badge variant="secondary" className="text-xs">AI Assistant</Badge>
                  <Badge variant="secondary" className="text-xs">Progress Timeline</Badge>
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-green-700 via-green-600 to-lime-600 hover:from-green-800 hover:via-green-700 hover:to-lime-700 text-white group-hover:shadow-lg"
                  onClick={() => onSelectPortal('hunter')}
                >
                  Open Portal
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>

            {/* Outfitter Portal */}
            <Card className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 cursor-pointer">
              <div className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 group-hover:from-amber-100 group-hover:to-orange-100 dark:group-hover:from-amber-900/50 dark:group-hover:to-orange-900/50 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-700 via-amber-600 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Compass className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-slate-900 dark:text-slate-100 mb-2">Outfitter Portal</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Manage hunts, link hunters, track compliance, and view performance analytics
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="text-xs">Hunt Register</Badge>
                  <Badge variant="secondary" className="text-xs">Analytics</Badge>
                  <Badge variant="secondary" className="text-xs">Compliance</Badge>
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 hover:from-amber-800 hover:via-amber-700 hover:to-orange-700 text-white group-hover:shadow-lg"
                  onClick={() => onSelectPortal('outfitter')}
                >
                  Open Portal
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>

            {/* Taxidermy Portal */}
            <Card className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer">
              <div className="p-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 group-hover:from-blue-100 group-hover:to-cyan-100 dark:group-hover:from-blue-900/50 dark:group-hover:to-cyan-900/50 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-slate-900 dark:text-slate-100 mb-2">Taxidermy Portal</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Manage intake, track processing, update status, and coordinate dispatch
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="text-xs">RFID Scanning</Badge>
                  <Badge variant="secondary" className="text-xs">Stage Tracking</Badge>
                  <Badge variant="secondary" className="text-xs">Inventory</Badge>
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 hover:from-blue-800 hover:via-blue-700 hover:to-cyan-700 text-white group-hover:shadow-lg"
                  onClick={() => onSelectPortal('taxidermy')}
                >
                  Open Portal
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Data Flow Visualization */}
        <Card className="p-8 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm border-green-200 dark:border-green-900">
          <h2 className="text-slate-900 dark:text-slate-100 mb-6 text-center">
            Ecosystem Data Flow
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            {/* Hunter Node */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-700 via-green-600 to-lime-600 rounded-full flex items-center justify-center shadow-lg mb-3">
                <User className="w-10 h-10 text-white" />
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Hunter</p>
            </div>

            <ArrowRight className="w-6 h-6 text-green-600 dark:text-green-500 hidden md:block" />
            <div className="md:hidden">↓</div>

            {/* Outfitter Node */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-700 via-amber-600 to-orange-600 rounded-full flex items-center justify-center shadow-lg mb-3">
                <Compass className="w-10 h-10 text-white" />
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Outfitter</p>
            </div>

            <ArrowRight className="w-6 h-6 text-amber-600 dark:text-amber-500 hidden md:block" />
            <div className="md:hidden">↓</div>

            {/* Taxidermy Node */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-lg mb-3">
                <Package className="w-10 h-10 text-white" />
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Taxidermy</p>
            </div>

            <ArrowRight className="w-6 h-6 text-blue-600 dark:text-blue-500 hidden md:block" />
            <div className="md:hidden">↓</div>

            {/* Delivery Node */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-700 via-emerald-600 to-teal-600 rounded-full flex items-center justify-center shadow-lg mb-3">
                <Target className="w-10 h-10 text-white" />
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Delivery</p>
            </div>
          </div>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            Real-time data synchronization across all portals with shared Hunt IDs and Trophy tracking
          </p>
        </Card>

        {/* Admin Access */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onSelectPortal('admin')}
            className="gap-2"
          >
            <Trophy className="w-5 h-5" />
            Master Admin Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
