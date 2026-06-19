import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
  Scan, 
  ClipboardCheck, 
  TrendingUp, 
  RotateCw, 
  Scissors, 
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package,
  Activity,
  List
} from 'lucide-react';

interface WorkshopDashboardProps {
  onNavigate: (view: string) => void;
}

export function WorkshopDashboard({ onNavigate }: WorkshopDashboardProps) {
  // Mock data
  const summaryStats = [
    { label: 'Parts to Scan Today', value: 12, icon: Scan, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950' },
    { label: 'Pending Check-Ins', value: 8, icon: ClipboardCheck, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950' },
    { label: 'In Progress', value: 34, icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950' },
    { label: 'Returning From Tannery', value: 5, icon: RotateCw, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950' },
    { label: 'Ready for Mounting', value: 7, icon: Scissors, color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-950' },
    { label: 'Ready for QC', value: 9, icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950' },
  ];

  const secondaryStats = [
    { label: 'Stalled Parts', value: 3, icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950' },
    { label: 'Urgent Jobs', value: 5, icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950' },
    { label: 'Shipping Today', value: 2, icon: Package, color: 'text-cyan-600', bgColor: 'bg-cyan-50 dark:bg-cyan-950' },
  ];

  const recentActivity = [
    { id: 1, text: 'Skull #A121 entered Bleaching', time: '5 minutes ago', icon: Activity, color: 'text-blue-600' },
    { id: 2, text: 'Cape Skin #A121 dispatched to Tannery', time: '15 minutes ago', icon: Package, color: 'text-purple-600' },
    { id: 3, text: 'Kudu #002 fully mounted', time: '1 hour ago', icon: CheckCircle2, color: 'text-green-600' },
    { id: 4, text: 'Lion #008 passed Quality Check', time: '2 hours ago', icon: CheckCircle2, color: 'text-emerald-600' },
    { id: 5, text: 'Buffalo #015 arrived at workshop', time: '3 hours ago', icon: ClipboardCheck, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Workshop Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Production workflow overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onNavigate('scan')} className="bg-blue-600 hover:bg-blue-700">
            <Scan className="w-4 h-4 mr-2" />
            Scan Parts
          </Button>
          <Button onClick={() => onNavigate('arrival')} variant="outline">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            New Check-In
          </Button>
        </div>
      </div>

      {/* Summary Cards - Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                  <p className="text-slate-900 dark:text-slate-100 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {secondaryStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                  <p className="text-slate-900 dark:text-slate-100 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                  <div className={`w-8 h-8 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0`}>
                    <activity.icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100">{activity.text}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Production Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-700 dark:text-slate-300">On Schedule</span>
              </div>
              <span className="text-slate-900 dark:text-slate-100">28</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-slate-700 dark:text-slate-300">Slightly Delayed</span>
              </div>
              <span className="text-slate-900 dark:text-slate-100">6</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-slate-700 dark:text-slate-300">Overdue</span>
              </div>
              <span className="text-slate-900 dark:text-slate-100">3</span>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Today's Completion</span>
                <span className="text-sm text-slate-900 dark:text-slate-100">75%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: '75%' }}></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button className="w-full" variant="outline" onClick={() => onNavigate('inventory')}>
                <List className="w-4 h-4 mr-2" />
                View Full Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Status */}
      <Card>
        <CardHeader>
          <CardTitle>Department Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { dept: 'Receiving', count: 8, status: 'active' },
              { dept: 'Cleaning', count: 12, status: 'active' },
              { dept: 'Mounting', count: 7, status: 'active' },
              { dept: 'Finishing', count: 5, status: 'active' },
            ].map((dept, index) => (
              <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{dept.dept}</span>
                  <Badge variant={dept.status === 'active' ? 'default' : 'secondary'}>
                    {dept.status}
                  </Badge>
                </div>
                <p className="text-slate-900 dark:text-slate-100">{dept.count} parts</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}