import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Scan, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { TrophyStatus } from '../types';

interface ScannedItem {
  tagId: string;
  species: string;
  trophyId: string;
  newStatus: TrophyStatus;
  timestamp: string;
  operator: string;
}

export function ScanStation() {
  const [currentZone, setCurrentZone] = useState<string>('tannery');
  const [rfidInput, setRfidInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

  const handleScan = () => {
    if (!rfidInput.trim()) return;

    const newItem: ScannedItem = {
      tagId: rfidInput,
      species: ['Lion', 'Buffalo', 'Leopard', 'Kudu'][Math.floor(Math.random() * 4)],
      trophyId: `TRP-${Math.floor(Math.random() * 1000)}`,
      newStatus: currentZone as TrophyStatus,
      timestamp: new Date().toISOString(),
      operator: 'Current User'
    };

    setScannedItems([newItem, ...scannedItems]);
    setRfidInput('');
    toast.success('Item scanned successfully');
  };

  const handleConfirm = () => {
    toast.success(`${scannedItems.length} items updated successfully`);
    setScannedItems([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Scan Station</h1>
        <p className="text-slate-600">Track trophy parts through processing</p>
      </div>

      {/* Zone Selection */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="zone">Current Zone *</Label>
            <Select value={currentZone} onValueChange={setCurrentZone}>
              <SelectTrigger className="mt-2" id="zone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received">Reception</SelectItem>
                <SelectItem value="cleaning">Cleaning Station</SelectItem>
                <SelectItem value="tannery">Tannery</SelectItem>
                <SelectItem value="boiling">Boiling Room</SelectItem>
                <SelectItem value="mounting">Mounting Room</SelectItem>
                <SelectItem value="qc">QC Station</SelectItem>
                <SelectItem value="packed">Packing</SelectItem>
                <SelectItem value="dispatched">Dispatch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rfid">RFID / Barcode Scanner</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="rfid"
                value={rfidInput}
                onChange={(e) => setRfidInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Scan or enter tag ID..."
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleScan}>
                <Scan className="w-4 h-4 mr-2" />
                Scan
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Scanned Items Table */}
      <Card>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-slate-900">Scanned Items</h2>
            <p className="text-slate-600 mt-1">
              {scannedItems.length} item{scannedItems.length !== 1 ? 's' : ''} ready to confirm
            </p>
          </div>
          {scannedItems.length > 0 && (
            <Button onClick={handleConfirm}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm {scannedItems.length} Updates
            </Button>
          )}
        </div>

        {scannedItems.length === 0 ? (
          <div className="p-12 text-center">
            <Scan className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-slate-900 mb-2">No items scanned</h3>
            <p className="text-slate-600">Scan RFID tags to begin tracking</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left p-4 text-slate-700">Tag ID</th>
                  <th className="text-left p-4 text-slate-700">Species</th>
                  <th className="text-left p-4 text-slate-700">Trophy</th>
                  <th className="text-left p-4 text-slate-700">New Status</th>
                  <th className="text-left p-4 text-slate-700">Timestamp</th>
                  <th className="text-left p-4 text-slate-700">Operator</th>
                </tr>
              </thead>
              <tbody>
                {scannedItems.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="p-4">
                      <Badge variant="outline">{item.tagId}</Badge>
                    </td>
                    <td className="p-4 text-slate-900">{item.species}</td>
                    <td className="p-4 text-slate-900">{item.trophyId}</td>
                    <td className="p-4">
                      <Badge className="bg-blue-100 text-blue-900">
                        {currentZone.charAt(0).toUpperCase() + currentZone.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-600">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-4 text-slate-600">{item.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
