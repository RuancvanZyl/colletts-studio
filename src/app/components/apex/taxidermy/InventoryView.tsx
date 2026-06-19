import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { List, Search, Filter, AlertTriangle, Download } from 'lucide-react';

export function InventoryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [speciesFilter, setSpeciesFilter] = useState('all');

  // Mock inventory data
  const inventory = [
    {
      partId: 'SKIN-001',
      trophy: 'Kudu 001',
      species: 'Kudu',
      stage: 'Cleaning & Salting',
      timeInStage: '2 days',
      location: 'Processing - Bay 3',
      huntId: 'HUNT-2025-004',
      alerts: []
    },
    {
      partId: 'SKULL-015',
      trophy: 'Buffalo 015',
      species: 'Buffalo',
      stage: 'Clean & Bleach',
      timeInStage: '1 day',
      location: 'Skull Station',
      huntId: 'HUNT-2025-008',
      alerts: []
    },
    {
      partId: 'MOUNT-008',
      trophy: 'Lion 008',
      species: 'Lion',
      stage: 'Tannery',
      timeInStage: '24 days',
      location: 'External - Premier Tannery',
      huntId: 'HUNT-2025-002',
      alerts: ['Overdue return from tannery']
    },
    {
      partId: 'MOUNT-002',
      trophy: 'Kudu 002',
      species: 'Kudu',
      stage: 'Mounting',
      timeInStage: '3 days',
      location: 'Mounting Station 2',
      huntId: 'HUNT-2025-005',
      alerts: []
    },
    {
      partId: 'MOUNT-012',
      trophy: 'Impala 012',
      species: 'Impala',
      stage: 'Storage (Post)',
      timeInStage: '15 days',
      location: 'Rack R-08, Bin B-12',
      huntId: 'HUNT-2025-007',
      alerts: ['No movement in 10+ days']
    },
  ];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.partId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.trophy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.huntId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.species.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || item.stage === stageFilter;
    const matchesSpecies = speciesFilter === 'all' || item.species === speciesFilter;
    
    return matchesSearch && matchesStage && matchesSpecies;
  });

  const stages = [
    'Receiving',
    'Clean & Bleach',
    'Cleaning & Salting',
    'Storage (Pre)',
    'Storage (Post)',
    'Tannery',
    'Mounting',
    'Finishing',
    'Quality Check',
    'Packing',
    'Shipping'
  ];

  const species = ['Kudu', 'Buffalo', 'Lion', 'Impala', 'Leopard', 'Elephant'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Inventory View</h1>
        <p className="text-slate-600 dark:text-slate-400">Complete parts inventory and status</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Part ID, Trophy, Hunt ID, Species..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Species</SelectItem>
                  {species.map((sp) => (
                    <SelectItem key={sp} value={sp}>
                      {sp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Parts', value: inventory.length, color: 'bg-blue-600' },
          { label: 'Problem Jobs', value: inventory.filter(i => i.alerts.length > 0).length, color: 'bg-red-600' },
          { label: 'At Tannery', value: inventory.filter(i => i.stage === 'Tannery').length, color: 'bg-purple-600' },
          { label: 'Ready to Ship', value: 0, color: 'bg-green-600' }
        ].map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                  <p className="text-slate-900 dark:text-slate-100 mt-1">{stat.value}</p>
                </div>
                <div className={`w-2 h-12 ${stat.color} rounded-full`}></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5 text-blue-600" />
              All Parts ({filteredInventory.length})
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part ID</TableHead>
                  <TableHead>Trophy</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Time in Stage</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Hunt ID</TableHead>
                  <TableHead>Alerts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.partId} className={item.alerts.length > 0 ? 'bg-red-50 dark:bg-red-950' : ''}>
                    <TableCell className="font-mono text-sm">{item.partId}</TableCell>
                    <TableCell>{item.trophy}</TableCell>
                    <TableCell>{item.species}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.stage}</Badge>
                    </TableCell>
                    <TableCell>{item.timeInStage}</TableCell>
                    <TableCell className="text-sm">{item.location}</TableCell>
                    <TableCell className="font-mono text-sm">{item.huntId}</TableCell>
                    <TableCell>
                      {item.alerts.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-xs text-red-700 dark:text-red-400">
                            {item.alerts[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Problem Jobs Alert */}
      {inventory.filter(i => i.alerts.length > 0).length > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-900 dark:text-red-100">
                  {inventory.filter(i => i.alerts.length > 0).length} parts require attention
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  Review parts with alerts and take necessary action
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
