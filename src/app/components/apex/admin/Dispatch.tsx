import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Truck, Package, Printer, Send } from 'lucide-react';
import { toast } from 'sonner';

interface DispatchItem {
  id: string;
  trophyId: string;
  species: string;
  client: string;
  parts: string[];
}

const availableItems: DispatchItem[] = [
  { id: '1', trophyId: 'TRP-004', species: 'Kudu', client: 'John Hunter', parts: ['Horns', 'Skull'] },
  { id: '2', trophyId: 'TRP-002', species: 'Buffalo', client: 'John Hunter', parts: ['Skull'] },
  { id: '3', trophyId: 'TRP-007', species: 'Impala', client: 'Sarah Williams', parts: ['Full Mount'] },
  { id: '4', trophyId: 'TRP-008', species: 'Warthog', client: 'Michael Brown', parts: ['Tusks', 'Skull'] }
];

export function Dispatch() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [carrier, setCarrier] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [gpsDevice, setGpsDevice] = useState('');

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handlePrintLabels = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to print labels');
      return;
    }
    toast.success(`Printing ${selectedItems.length} shipping labels`);
  };

  const handleDispatch = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to dispatch');
      return;
    }
    if (!carrier.trim() || !trackingNo.trim()) {
      toast.error('Please enter carrier and tracking information');
      return;
    }
    toast.success(`Shipment dispatched with ${selectedItems.length} items`);
    setSelectedItems([]);
    setCarrier('');
    setTrackingNo('');
    setGpsDevice('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Dispatch</h1>
        <p className="text-slate-600">Build shipments and manage delivery</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Items */}
        <Card>
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-slate-900">Available for Dispatch</h2>
            <p className="text-slate-600 mt-1">
              {availableItems.length} items ready
            </p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {availableItems.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`item-${item.id}`}
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => handleToggleItem(item.id)}
                    className="mt-1"
                  />
                  <Label htmlFor={`item-${item.id}`} className="cursor-pointer flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-slate-900">{item.species}</h3>
                      <Badge variant="outline">{item.trophyId}</Badge>
                    </div>
                    <p className="text-slate-600 mb-1">Client: {item.client}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.parts.map((part, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-900">
                          {part}
                        </Badge>
                      ))}
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Shipment Builder */}
        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-slate-900">Shipment Details</h2>
                <Badge className="bg-blue-600">
                  {selectedItems.length} items
                </Badge>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {selectedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-600">Select items to build shipment</p>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="carrier">Carrier *</Label>
                    <Input
                      id="carrier"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="e.g., FedEx, DHL, UPS..."
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tracking">Tracking Number *</Label>
                    <Input
                      id="tracking"
                      value={trackingNo}
                      onChange={(e) => setTrackingNo(e.target.value)}
                      placeholder="Enter tracking number..."
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="gps">GPS Device ID (Optional)</Label>
                    <Input
                      id="gps"
                      value={gpsDevice}
                      onChange={(e) => setGpsDevice(e.target.value)}
                      placeholder="Enter GPS device ID..."
                      className="mt-2"
                    />
                  </div>

                  <div className="pt-4 space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handlePrintLabels}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Shipping Labels
                    </Button>
                    <Button
                      className="w-full"
                      onClick={handleDispatch}
                      disabled={!carrier.trim() || !trackingNo.trim()}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Mark as Dispatched
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>

          {selectedItems.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-slate-900 mb-4">Shipment Summary</h3>
                <div className="space-y-2">
                  {selectedItems.map(itemId => {
                    const item = availableItems.find(i => i.id === itemId);
                    if (!item) return null;
                    return (
                      <div key={itemId} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                        <div>
                          <div className="text-slate-900">{item.species}</div>
                          <div className="text-slate-600">{item.trophyId}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleItem(itemId)}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
