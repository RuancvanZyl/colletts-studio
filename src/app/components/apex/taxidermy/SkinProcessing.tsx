import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Droplet, Scan, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SkinPart {
  id: string;
  partType: string;
  trophyId: string;
  huntId: string;
  timeIn: string;
  saltingBatch: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export function SkinProcessing() {
  const [scanInput, setScanInput] = useState('');
  const [parts, setParts] = useState<SkinPart[]>([
    {
      id: 'SKIN-001',
      partType: 'Cape Skin',
      trophyId: 'KUDU-001',
      huntId: 'HUNT-2025-004',
      timeIn: '09:30 AM',
      saltingBatch: 'BATCH-A12',
      status: 'in-progress'
    },
    {
      id: 'SKIN-002',
      partType: 'Full Skin',
      trophyId: 'LION-008',
      huntId: 'HUNT-2025-006',
      timeIn: '10:15 AM',
      saltingBatch: 'BATCH-A12',
      status: 'pending'
    }
  ]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    
    toast.success(`Skin ${scanInput} loaded`);
    setScanInput('');
  };

  const handleComplete = (partId: string) => {
    setParts(prev => prev.map(part => 
      part.id === partId ? { ...part, status: 'completed' } : part
    ));
    toast.success('Skin processing completed. Moving to Pre-Tannery Storage.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Skin Cleaning & Salting</h1>
        <p className="text-slate-600 dark:text-slate-400">Process skins for tannery preparation</p>
      </div>

      {/* Scan Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-blue-600" />
            Scan Skin Tag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-3">
            <Input
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan or enter skin tag ID..."
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

      {/* Processing Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blue-600" />
              Active Skins
            </CardTitle>
            <Badge variant="secondary">{parts.length} skins</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trophy</TableHead>
                  <TableHead>Hunt ID</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Salting Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-mono text-sm">{part.id}</TableCell>
                    <TableCell>{part.partType}</TableCell>
                    <TableCell>{part.trophyId}</TableCell>
                    <TableCell className="font-mono text-sm">{part.huntId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {part.timeIn}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{part.saltingBatch}</TableCell>
                    <TableCell>
                      <Badge variant={
                        part.status === 'completed' ? 'default' :
                        part.status === 'in-progress' ? 'secondary' :
                        'outline'
                      }>
                        {part.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {part.status !== 'completed' && (
                        <Button 
                          size="sm"
                          onClick={() => handleComplete(part.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Process Info */}
      <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Processing Steps:</h3>
          <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span>
              <span>Flesh removal and cleaning</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span>
              <span>Apply salt liberally to skin side</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span>
              <span>Fold and store in drainage area</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center flex-shrink-0 text-xs">4</span>
              <span>Mark as complete when curing is finished</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
