import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { 
  Calendar, 
  MapPin, 
  Trophy, 
  Eye, 
  Search,
  User as UserIcon,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface LinkedHunt {
  id: string;
  huntId: string;
  huntName: string;
  hunterName: string;
  hunterEmail: string;
  location: string;
  startDate: Date;
  endDate: Date;
  trophyCount: number;
  status: 'active' | 'completed';
  trophies?: {
    species: string;
    mountType: string;
    status: string;
  }[];
}

export function ActiveLinkedHunts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHunt, setSelectedHunt] = useState<LinkedHunt | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Mock data - would come from API
  const [linkedHunts] = useState<LinkedHunt[]>([
    {
      id: 'link-001',
      huntId: 'HUNT-2025-0145',
      huntName: 'Eastern Cape Safari',
      hunterName: 'Michael Roberts',
      hunterEmail: 'm.roberts@example.com',
      location: 'Eastern Cape, Addo Game Reserve',
      startDate: new Date('2025-04-10'),
      endDate: new Date('2025-04-17'),
      trophyCount: 3,
      status: 'active',
      trophies: [
        { species: 'Kudu', mountType: 'Shoulder Mount', status: 'Tannery' },
        { species: 'Springbok', mountType: 'Euro Mount', status: 'Mounting' },
        { species: 'Warthog', mountType: 'Full Body Mount', status: 'Received' }
      ]
    },
    {
      id: 'link-002',
      huntId: 'HUNT-2025-0234',
      huntName: 'Limpopo Plains Safari',
      hunterName: 'John Meyer',
      hunterEmail: 'john.meyer@example.com',
      location: 'Limpopo Province, Bushveld Reserve',
      startDate: new Date('2025-05-04'),
      endDate: new Date('2025-05-08'),
      trophyCount: 2,
      status: 'active',
      trophies: [
        { species: 'Impala', mountType: 'Shoulder Mount', status: 'QC' },
        { species: 'Zebra', mountType: 'Tan to Fur', status: 'Packed' }
      ]
    },
    {
      id: 'link-003',
      huntId: 'HUNT-2024-0876',
      huntName: 'Kalahari Winter Hunt',
      hunterName: 'Thomas Bradford',
      hunterEmail: 't.bradford@example.com',
      location: 'Northern Cape, Kalahari Desert',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-08'),
      trophyCount: 4,
      status: 'completed',
      trophies: [
        { species: 'Gemsbok', mountType: 'Shoulder Mount', status: 'Delivered' },
        { species: 'Springbok', mountType: 'Euro Mount', status: 'Delivered' },
        { species: 'Eland', mountType: 'Pedestal Mount', status: 'Delivered' },
        { species: 'Black Wildebeest', mountType: 'Shoulder Mount', status: 'Delivered' }
      ]
    }
  ]);

  const filteredHunts = linkedHunts.filter(hunt => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      hunt.hunterName.toLowerCase().includes(query) ||
      hunt.huntId.toLowerCase().includes(query) ||
      hunt.huntName.toLowerCase().includes(query) ||
      hunt.location.toLowerCase().includes(query)
    );
  });

  const activeHunts = filteredHunts.filter(h => h.status === 'active');
  const completedHunts = filteredHunts.filter(h => h.status === 'completed');

  const formatDateRange = (start: Date, end: Date) => {
    return `${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const handleViewDetails = (hunt: LinkedHunt) => {
    setSelectedHunt(hunt);
    setShowDetailsModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-900 dark:text-white mb-2">Active Linked Hunts</h2>
        <p className="text-slate-600 dark:text-slate-400">
          View and manage all hunts linked with your hunters
        </p>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by hunter name, Hunt ID, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Active Hunts Section */}
      {activeHunts.length > 0 && (
        <div>
          <h3 className="text-slate-900 dark:text-white mb-4">
            Active ({activeHunts.length})
          </h3>
          
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Hunt ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Hunter Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Trophies
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-stone-950 divide-y divide-stone-200 dark:divide-stone-800">
                    {activeHunts.map((hunt) => (
                      <tr 
                        key={hunt.id}
                        className="hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {hunt.huntId}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm">
                              {hunt.hunterName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm text-slate-900 dark:text-white">
                              {hunt.hunterName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3 h-3" />
                            {hunt.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                            <Calendar className="w-3 h-3" />
                            {formatDateRange(hunt.startDate, hunt.endDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm text-slate-900 dark:text-white">
                            <Trophy className="w-3 h-3 text-amber-600 dark:text-amber-500" />
                            {hunt.trophyCount}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                            Active
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(hunt)}
                            className="text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {activeHunts.map((hunt) => (
              <Card key={hunt.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white">
                      {hunt.hunterName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white">{hunt.hunterName}</p>
                      <Badge variant="secondary" className="font-mono text-xs mt-1">
                        {hunt.huntId}
                      </Badge>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                    Active
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-slate-900 dark:text-white">{hunt.huntName}</p>
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {hunt.location}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {formatDateRange(hunt.startDate, hunt.endDate)}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <Trophy className="w-3 h-3" />
                    {hunt.trophyCount} Trophies
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(hunt)}
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Hunt Details
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Hunts Section */}
      {completedHunts.length > 0 && (
        <div>
          <h3 className="text-slate-900 dark:text-white mb-4">
            Completed ({completedHunts.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedHunts.map((hunt) => (
              <Card key={hunt.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {hunt.huntId}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                </div>

                <p className="text-sm text-slate-900 dark:text-white mb-2">{hunt.huntName}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{hunt.hunterName}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <Trophy className="w-3 h-3" />
                    {hunt.trophyCount} Trophies Delivered
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {formatDateRange(hunt.startDate, hunt.endDate)}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(hunt)}
                  className="w-full"
                >
                  View Details
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredHunts.length === 0 && (
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-900 dark:text-white mb-2">No Linked Hunts Found</h3>
          <p className="text-slate-600 dark:text-slate-400">
            {searchQuery 
              ? 'Try adjusting your search criteria' 
              : 'You don\'t have any linked hunts yet'
            }
          </p>
        </Card>
      )}

      {/* Hunt Details Modal */}
      {selectedHunt && (
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Hunt Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Hunt Info */}
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-900">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-900 dark:text-white">{selectedHunt.huntName}</h3>
                  <Badge variant="secondary" className="font-mono">
                    {selectedHunt.huntId}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Hunter</p>
                    <p className="text-slate-900 dark:text-white">{selectedHunt.hunterName}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Location</p>
                    <p className="text-slate-900 dark:text-white">{selectedHunt.location}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Dates</p>
                    <p className="text-slate-900 dark:text-white">
                      {formatDateRange(selectedHunt.startDate, selectedHunt.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Status</p>
                    <Badge className={selectedHunt.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400'}>
                      {selectedHunt.status === 'active' ? 'Active' : 'Completed'}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Trophy List */}
              {selectedHunt.trophies && selectedHunt.trophies.length > 0 && (
                <div>
                  <h4 className="text-slate-900 dark:text-white mb-3">
                    Trophies ({selectedHunt.trophies.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedHunt.trophies.map((trophy, index) => (
                      <Card key={index} className="p-3 bg-stone-50 dark:bg-stone-900/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-900 dark:text-white mb-1">
                              {trophy.species}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {trophy.mountType}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {trophy.status}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
