import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  Settings, 
  Users, 
  Building2, 
  Warehouse,
  Bell,
  Shield,
  Plus
} from 'lucide-react';

export function AdminConfiguration() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Admin Configuration</h1>
        <p className="text-slate-600 dark:text-slate-400">System settings and management</p>
      </div>

      <Tabs defaultValue="staff">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="staff">
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="stations">
            <Building2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Stations</span>
          </TabsTrigger>
          <TabsTrigger value="storage">
            <Warehouse className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Storage</span>
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* STAFF TAB */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Staff Accounts
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'John Smith', role: 'Senior Taxidermist', department: 'Mounting', status: 'active' },
                  { name: 'Sarah Johnson', role: 'Processing Specialist', department: 'Cleaning', status: 'active' },
                  { name: 'Mike Davis', role: 'QC Inspector', department: 'Quality', status: 'active' },
                  { name: 'Lisa Brown', role: 'Receiving Clerk', department: 'Receiving', status: 'active' }
                ].map((staff, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="text-sm text-slate-900 dark:text-slate-100">{staff.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{staff.role} • {staff.department}</p>
                    </div>
                    <Badge variant={staff.status === 'active' ? 'default' : 'secondary'}>
                      {staff.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATIONS TAB */}
        <TabsContent value="stations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Processing Stations
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Station
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Receiving Bay 1', type: 'Receiving', capacity: 20, current: 8 },
                  { name: 'Skull Station A', type: 'Skull Processing', capacity: 10, current: 5 },
                  { name: 'Skin Processing 1', type: 'Skin Processing', capacity: 30, current: 12 },
                  { name: 'Mounting Station 2', type: 'Mounting', capacity: 8, current: 7 },
                  { name: 'Finishing Bay 3', type: 'Finishing', capacity: 6, current: 3 },
                  { name: 'QC Area', type: 'Quality Check', capacity: 5, current: 2 }
                ].map((station, index) => {
                  const percentage = (station.current / station.capacity) * 100;
                  return (
                    <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm text-slate-900 dark:text-slate-100">{station.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{station.type}</p>
                        </div>
                        <Badge variant="secondary">{station.current}/{station.capacity}</Badge>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${percentage > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STORAGE TAB */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-blue-600" />
                  Storage Zones
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Zone
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { zone: 'Skulls', racks: 12, bins: 48, utilization: 65 },
                  { zone: 'Hides', racks: 20, bins: 80, utilization: 42 },
                  { zone: 'Tusks', racks: 8, bins: 30, utilization: 40 },
                  { zone: 'Horns', racks: 15, bins: 60, utilization: 30 },
                  { zone: 'Full Bodies', racks: 5, bins: 15, utilization: 33 }
                ].map((storage, index) => (
                  <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-slate-900 dark:text-slate-100">{storage.zone}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {storage.racks} racks, {storage.bins} bins
                        </p>
                      </div>
                      <Badge variant="secondary">{storage.utilization}% full</Badge>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          storage.utilization > 80 ? 'bg-red-500' :
                          storage.utilization > 60 ? 'bg-amber-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${storage.utilization}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>External Tanneries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Premier Tannery', location: 'Cape Town', status: 'active', partsOut: 5 },
                  { name: 'African Hide Works', location: 'Johannesburg', status: 'active', partsOut: 3 }
                ].map((tannery, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="text-sm text-slate-900 dark:text-slate-100">{tannery.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{tannery.location} • {tannery.partsOut} parts out</p>
                    </div>
                    <Badge>{tannery.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Alerts & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Notify on part arrival', enabled: true },
                { label: 'Alert when part stalls >10 days', enabled: true },
                { label: 'Tannery return overdue alerts', enabled: true },
                { label: 'QC failure notifications', enabled: true },
                { label: 'Shipping confirmations', enabled: true }
              ].map((setting, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <span className="text-sm text-slate-900 dark:text-slate-100">{setting.label}</span>
                  <Badge variant={setting.enabled ? 'default' : 'secondary'}>
                    {setting.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Require scan validation', enabled: true },
                { label: 'Dual approval for QC failures', enabled: true },
                { label: 'Shipping authorization required', enabled: true },
                { label: 'Auto-save scans', enabled: true }
              ].map((setting, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <span className="text-sm text-slate-900 dark:text-slate-100">{setting.label}</span>
                  <Badge variant={setting.enabled ? 'default' : 'secondary'}>
                    {setting.enabled ? 'On' : 'Off'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
