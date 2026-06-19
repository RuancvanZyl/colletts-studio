import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Warehouse, Scan, MapPin, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function StorageManagement() {
  const [scanInput, setScanInput] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [rackNumber, setRackNumber] = useState('');
  const [binNumber, setBinNumber] = useState('');
  const [currentPart, setCurrentPart] = useState<any>(null);

  const sections = ['Skulls', 'Hides', 'Tusks', 'Horns', 'Full Bodies'];

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    
    setCurrentPart({
      id: scanInput,
      type: 'Cape Skin',
      trophy: 'Kudu 001',
      huntId: 'HUNT-2025-004'
    });
    
    toast.success(`Part ${scanInput} loaded`);
    setScanInput('');
  };

  const handleAssignLocation = () => {
    if (!selectedSection || !rackNumber || !binNumber) {
      toast.error('Please fill in all location details');
      return;
    }

    toast.success(`Part assigned to ${selectedSection} - Rack ${rackNumber}, Bin ${binNumber}`);
    setCurrentPart(null);
    setSelectedSection('');
    setRackNumber('');
    setBinNumber('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Storage Management</h1>
        <p className="text-slate-600 dark:text-slate-400">Track and organize parts in storage</p>
      </div>

      {/* Scan Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-blue-600" />
            Scan Part
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-3">
            <Input
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan or enter part ID..."
              className="flex-1"
              autoFocus
            />
            <Button type="submit">
              <Scan className="w-4 h-4 mr-2" />
              Load
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Location Assignment */}
      {currentPart && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Assign Storage Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Part Info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Part ID</p>
                  <p className="text-sm font-mono text-blue-900 dark:text-blue-100">{currentPart.id}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Type</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">{currentPart.type}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Trophy</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">{currentPart.trophy}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Hunt ID</p>
                  <p className="text-sm font-mono text-blue-900 dark:text-blue-100">{currentPart.huntId}</p>
                </div>
              </div>
            </div>

            {/* Location Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-700 dark:text-slate-300">Section</label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-700 dark:text-slate-300">Rack #</label>
                <Input
                  value={rackNumber}
                  onChange={(e) => setRackNumber(e.target.value)}
                  placeholder="e.g. R-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-700 dark:text-slate-300">Bin #</label>
                <Input
                  value={binNumber}
                  onChange={(e) => setBinNumber(e.target.value)}
                  placeholder="e.g. B-05"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleAssignLocation}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Assign Location
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCurrentPart(null)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-blue-600" />
            Storage Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { section: 'Skulls', count: 23, capacity: 50 },
              { section: 'Hides', count: 34, capacity: 80 },
              { section: 'Tusks', count: 12, capacity: 30 },
              { section: 'Horns', count: 18, capacity: 60 },
              { section: 'Full Bodies', count: 5, capacity: 15 },
            ].map((item) => {
              const percentage = (item.count / item.capacity) * 100;
              return (
                <div key={item.section} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item.section}</span>
                    <Badge variant="secondary">{item.count}/{item.capacity}</Badge>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
