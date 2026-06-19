import { useState, useMemo } from 'react';
import { mockHunts, mockHuntStatistics } from '../mockOutfitterData';
import { Hunt } from '../types';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Plus, Search, Eye, Edit2, Upload, Filter } from 'lucide-react';

interface HuntDashboardProps {
  onCreateHunt: () => void;
  onEditHunt: (hunt: Hunt) => void;
}

export function HuntDashboard({ onCreateHunt, onEditHunt }: HuntDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  const filteredHunts = useMemo(() => {
    return mockHunts.filter(hunt => {
      const matchesSearch =
        hunt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hunt.hunterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hunt.region.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || hunt.status === statusFilter;
      const matchesRegion = regionFilter === 'all' || hunt.region === regionFilter;

      return matchesSearch && matchesStatus && matchesRegion;
    });
  }, [searchQuery, statusFilter, regionFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'planned':
        return <Badge variant="outline">Planned</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 mb-2">Hunt Management</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your hunts and track hunter activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Register
          </Button>
          <Button onClick={onCreateHunt} className="gap-2">
            <Plus className="w-5 h-5" />
            New Hunt
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Total Hunts This Year</div>
          <div className="text-green-800 dark:text-green-400">
            {mockHuntStatistics.totalHuntsThisYear}
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/50 dark:to-green-950/50 border-lime-300 dark:border-lime-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Total Hunters Guided</div>
          <div className="text-lime-800 dark:text-lime-400">
            {mockHuntStatistics.totalHuntersGuided}
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Total Animals Harvested</div>
          <div className="text-green-900 dark:text-green-300">
            {mockHuntStatistics.totalAnimalsHarvested}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700 dark:text-green-500" />
            <Input
              placeholder="Search by hunt name, hunter, or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="Northern Province">Northern Province</SelectItem>
                <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                <SelectItem value="Western Cape">Western Cape</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Hunts Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hunt Name</TableHead>
                <TableHead>Hunter</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Animals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHunts.map((hunt) => (
                <TableRow key={hunt.id}>
                  <TableCell>
                    <div>
                      <div className="text-slate-900 dark:text-slate-100">{hunt.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{hunt.id}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    {hunt.hunterName}
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    <div>{hunt.region}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{hunt.farm}</div>
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    <div className="text-sm">
                      {new Date(hunt.startDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      to {new Date(hunt.endDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-900 dark:text-slate-100">{hunt.animalCount}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {hunt.animals.slice(0, 2).join(', ')}
                      {hunt.animals.length > 2 && '...'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(hunt.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEditHunt(hunt)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEditHunt(hunt)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {filteredHunts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">No hunts found matching your filters</p>
        </div>
      )}
    </div>
  );
}
