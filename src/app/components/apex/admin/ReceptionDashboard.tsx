import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { StatusBadge } from '../StatusBadge';
import { Plus, TrendingUp, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { mockTrophies } from '../mockData';

interface ReceptionDashboardProps {
  onNewIntake: () => void;
}

export function ReceptionDashboard({ onNewIntake }: ReceptionDashboardProps) {
  const todayIntakes = 5;
  const pendingQuotes = 8;
  const pendingDeposits = 3;
  const blockedOrders = 2;

  const recentActivity = mockTrophies.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-2">Reception Dashboard</h1>
          <p className="text-slate-600">Manage intakes and orders</p>
        </div>
        <Button onClick={onNewIntake}>
          <Plus className="w-4 h-4 mr-2" />
          New Intake
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-700 dark:text-stone-300">Today's Intakes</span>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-700 dark:text-green-400" />
            </div>
          </div>
          <div className="text-green-800 dark:text-green-400">{todayIntakes}</div>
          <p className="text-stone-600 dark:text-stone-400 mt-1">+2 from yesterday</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 border-amber-300 dark:border-amber-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-700 dark:text-stone-300">Pending Quotes</span>
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-800 dark:text-amber-400" />
            </div>
          </div>
          <div className="text-amber-800 dark:text-amber-400">{pendingQuotes}</div>
          <p className="text-stone-600 dark:text-stone-400 mt-1">Awaiting approval</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-700 dark:text-stone-300">Pending Deposits</span>
            <div className="w-10 h-10 bg-green-200 dark:bg-green-800/50 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-800 dark:text-green-300" />
            </div>
          </div>
          <div className="text-green-900 dark:text-green-300">{pendingDeposits}</div>
          <p className="text-stone-600 dark:text-stone-400 mt-1">Awaiting payment</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 border-red-300 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-700 dark:text-stone-300">Blocked Orders</span>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-700 dark:text-red-400" />
            </div>
          </div>
          <div className="text-red-700 dark:text-red-400">{blockedOrders}</div>
          <p className="text-stone-600 dark:text-stone-400 mt-1">Requires attention</p>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <div className="p-6 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-stone-900 dark:text-white">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-700 bg-green-50 dark:bg-stone-800/50">
                <th className="text-left p-4 text-stone-700 dark:text-stone-300">Client</th>
                <th className="text-left p-4 text-stone-700 dark:text-stone-300">Trophy</th>
                <th className="text-left p-4 text-stone-700 dark:text-stone-300">Status</th>
                <th className="text-left p-4 text-stone-700 dark:text-stone-300">Last Seen</th>
                <th className="text-left p-4 text-stone-700 dark:text-stone-300">Zone</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((trophy) => {
                const lastEvent = trophy.events[trophy.events.length - 1];
                return (
                  <tr key={trophy.id} className="border-b border-stone-100 dark:border-stone-800 hover:bg-green-50 dark:hover:bg-stone-800/50">
                    <td className="p-4">
                      <div className="text-stone-900 dark:text-white">{trophy.clientName}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-stone-900 dark:text-white">{trophy.species}</div>
                      <div className="text-stone-600 dark:text-stone-400">{trophy.id}</div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={trophy.currentStage} />
                    </td>
                    <td className="p-4 text-stone-600 dark:text-stone-400">
                      {new Date(trophy.lastUpdated).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{lastEvent.zone}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
