import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
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
import { Scan, QrCode, Keyboard, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ScannedPart {
  partId: string;
  partType: string;
  trophy: string;
  huntId: string;
  species: string;
  currentStage: string;
  nextStage: string;
  selected: boolean;
}

export function PartScanningStation() {
  const [scanInput, setScanInput] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [scanMode, setScanMode] = useState<'rfid' | 'qr' | 'manual'>('manual');
  const [scannedParts, setScannedParts] = useState<ScannedPart[]>([]);

  // Mock stations
  const stations = [
    'Receiving',
    'Clean & Bleach',
    'Cleaning & Salting',
    'Storage (Pre)',
    'Storage (Post)',
    'Tannery Dispatch',
    'Tannery Return',
    'Mounting',
    'Finishing',
    'Quality Check',
    'Packing',
    'Shipping'
  ];

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scanInput.trim()) {
      toast.error('Please enter a Part ID');
      return;
    }

    // Mock scan - find part and add to table
    const mockPart: ScannedPart = {
      partId: scanInput,
      partType: 'Cape Skin',
      trophy: 'Kudu 001',
      huntId: 'HUNT-2025-004',
      species: 'Kudu',
      currentStage: 'At Tannery',
      nextStage: selectedStation || 'Arriving Storage',
      selected: true
    };

    setScannedParts(prev => [...prev, mockPart]);
    setScanInput('');
    toast.success(`Part ${scanInput} scanned successfully`);
  };

  const handleConfirmMoves = () => {
    const selectedCount = scannedParts.filter(p => p.selected).length;
    
    if (selectedCount === 0) {
      toast.error('No parts selected');
      return;
    }

    if (!selectedStation) {
      toast.error('Please select a target station');
      return;
    }

    toast.success(`${selectedCount} parts moved to ${selectedStation} successfully`);
    setScannedParts([]);
    setSelectedStation('');
  };

  const togglePartSelection = (partId: string) => {
    setScannedParts(prev => prev.map(part => 
      part.partId === partId ? { ...part, selected: !part.selected } : part
    ));
  };

  const removePart = (partId: string) => {
    setScannedParts(prev => prev.filter(part => part.partId !== partId));
    toast.info('Part removed from scan list');
  };

  const selectedCount = scannedParts.filter(p => p.selected).length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Scan & Process Parts</h1>
        <p className="text-slate-600 dark:text-slate-400">Scan parts and move them through production stages</p>
      </div>

      {/* Station Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Target Station</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Destination Station</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select station..." />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station} value={station}>
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStation && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  All scanned parts will be moved to: <strong>{selectedStation}</strong>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scan Input Area */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Scan Parts</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={scanMode === 'rfid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScanMode('rfid')}
              >
                <Scan className="w-4 h-4 mr-2" />
                RFID
              </Button>
              <Button 
                variant={scanMode === 'qr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScanMode('qr')}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
              <Button 
                variant={scanMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScanMode('manual')}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Manual
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="space-y-4">
            <div className="relative">
              <Input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder={
                  scanMode === 'rfid' ? 'Scan RFID tag...' :
                  scanMode === 'qr' ? 'Scan QR code...' :
                  'Enter Part ID manually...'
                }
                className="text-lg h-14 pl-12"
                autoFocus
              />
              {scanMode === 'rfid' && <Scan className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />}
              {scanMode === 'qr' && <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />}
              {scanMode === 'manual' && <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />}
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <Scan className="w-4 h-4 mr-2" />
              Add Part
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Scanned Parts Table */}
      {scannedParts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scanned Parts ({scannedParts.length})</CardTitle>
              <Badge variant="secondary">{selectedCount} selected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Part ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trophy</TableHead>
                    <TableHead>Hunt ID</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Current Stage</TableHead>
                    <TableHead>Next Stage</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scannedParts.map((part) => (
                    <TableRow key={part.partId}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={part.selected}
                          onChange={() => togglePartSelection(part.partId)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{part.partId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.partType}</Badge>
                      </TableCell>
                      <TableCell>{part.trophy}</TableCell>
                      <TableCell className="font-mono text-sm">{part.huntId}</TableCell>
                      <TableCell>{part.species}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{part.currentStage}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <Badge className="bg-blue-600">{part.nextStage}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePart(part.partId)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button 
                onClick={handleConfirmMoves}
                disabled={selectedCount === 0 || !selectedStation}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm {selectedCount} Update{selectedCount !== 1 ? 's' : ''}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setScannedParts([])}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {scannedParts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Scan className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-slate-100">No parts scanned yet</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Scan or enter part IDs to begin processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
