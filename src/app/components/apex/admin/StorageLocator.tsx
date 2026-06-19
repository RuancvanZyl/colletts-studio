import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Search, MapPin, Package } from 'lucide-react';

interface StorageItem {
  id: string;
  trophyId: string;
  species: string;
  part: string;
  rack: string;
  zone: string;
}

const mockStorageItems: StorageItem[] = [
  { id: '1', trophyId: 'TRP-001', species: 'Lion', part: 'Cape Skin', rack: 'R-12', zone: 'Tannery' },
  { id: '2', trophyId: 'TRP-002', species: 'Buffalo', part: 'Skull', rack: 'R-05', zone: 'Storage A' },
  { id: '3', trophyId: 'TRP-003', species: 'Leopard', part: 'Full Skin', rack: 'R-18', zone: 'Tannery' },
  { id: '4', trophyId: 'TRP-004', species: 'Kudu', part: 'Horns', rack: 'R-23', zone: 'Storage B' },
  { id: '5', trophyId: 'TRP-005', species: 'Elephant', part: 'Tusks', rack: 'R-01', zone: 'Storage A' }
];

export function StorageLocator() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState<'list' | 'map'>('list');

  const filteredItems = mockStorageItems.filter(item =>
    item.trophyId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.part.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.rack.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Storage Locator</h1>
        <p className="text-slate-600">Find and manage trophy storage locations</p>
      </div>

      {/* Search and View Toggle */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Trophy ID, Species, Part, or Rack..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedView === 'list' ? 'default' : 'outline'}
              onClick={() => setSelectedView('list')}
            >
              List View
            </Button>
            <Button
              variant={selectedView === 'map' ? 'default' : 'outline'}
              onClick={() => setSelectedView('map')}
            >
              Map View
            </Button>
          </div>
        </div>
      </Card>

      {selectedView === 'list' ? (
        <Card>
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-slate-900">Storage Items</h2>
            <p className="text-slate-600 mt-1">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-slate-900 mb-2">No items found</h3>
              <p className="text-slate-600">Try adjusting your search</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-slate-900">{item.species}</h3>
                        <Badge variant="outline">{item.part}</Badge>
                      </div>
                      <p className="text-slate-600 mb-2">Trophy ID: {item.trophyId}</p>
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span>Rack {item.rack} • {item.zone}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Location
                      </Button>
                      <Button size="sm">
                        Reassign
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-slate-900 mb-2">Storage Map</h3>
            <p className="text-slate-600 mb-4">
              Visual representation of storage racks and zones
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mt-8">
              {['Storage A', 'Storage B', 'Tannery', 'Workshop'].map((zone) => (
                <Card key={zone} className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="text-slate-900 mb-2">{zone}</div>
                  <div className="text-slate-600">
                    {mockStorageItems.filter(i => i.zone === zone).length} items
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
