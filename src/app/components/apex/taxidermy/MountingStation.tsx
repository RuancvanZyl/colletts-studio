import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Scissors, Scan, CheckCircle2, Package } from 'lucide-react';
import { toast } from 'sonner';

export function MountingStation() {
  const [scanInput, setScanInput] = useState('');
  const [currentMount, setCurrentMount] = useState<any>(null);
  const [checklist, setChecklist] = useState({
    skullReceived: false,
    hideTanned: false,
    formSelected: false,
    sewingCompleted: false
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    
    setCurrentMount({
      trophyId: scanInput,
      species: 'Kudu',
      huntId: 'HUNT-2025-004',
      parts: [
        { id: 'SKULL-001', type: 'Skull', status: 'ready' },
        { id: 'HIDE-001', type: 'Cape Skin', status: 'ready' }
      ]
    });
    
    toast.success(`Trophy ${scanInput} loaded`);
    setScanInput('');
  };

  const handleMarkMounted = () => {
    const allChecked = Object.values(checklist).every(v => v);
    
    if (!allChecked) {
      toast.error('Please complete all checklist items');
      return;
    }

    toast.success('Trophy marked as mounted. Moving to Finishing stage.');
    setCurrentMount(null);
    setChecklist({
      skullReceived: false,
      hideTanned: false,
      formSelected: false,
      sewingCompleted: false
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Mounting Station</h1>
        <p className="text-slate-600 dark:text-slate-400">Assemble and mount trophies</p>
      </div>

      {/* Scan Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-blue-600" />
            Scan Trophy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-3">
            <Input
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan or enter trophy ID..."
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

      {/* Mounting Work */}
      {currentMount && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-blue-600" />
                Trophy: {currentMount.trophyId}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trophy Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Species</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{currentMount.species}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Trophy ID</p>
                  <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{currentMount.trophyId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Hunt ID</p>
                  <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{currentMount.huntId}</p>
                </div>
              </div>

              {/* Related Parts */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Related Parts</h3>
                <div className="space-y-2">
                  {currentMount.parts.map((part: any) => (
                    <div key={part.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-900 dark:text-slate-100">{part.type}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{part.id}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{part.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mounting Checklist */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Mounting Checklist</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox 
                      id="skullReceived"
                      checked={checklist.skullReceived}
                      onCheckedChange={(checked) => 
                        setChecklist({...checklist, skullReceived: checked as boolean})
                      }
                    />
                    <Label htmlFor="skullReceived" className="flex-1 cursor-pointer">
                      Skull received and prepared
                    </Label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox 
                      id="hideTanned"
                      checked={checklist.hideTanned}
                      onCheckedChange={(checked) => 
                        setChecklist({...checklist, hideTanned: checked as boolean})
                      }
                    />
                    <Label htmlFor="hideTanned" className="flex-1 cursor-pointer">
                      Hide tanned and softened
                    </Label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox 
                      id="formSelected"
                      checked={checklist.formSelected}
                      onCheckedChange={(checked) => 
                        setChecklist({...checklist, formSelected: checked as boolean})
                      }
                    />
                    <Label htmlFor="formSelected" className="flex-1 cursor-pointer">
                      Mannequin form selected and fitted
                    </Label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox 
                      id="sewingCompleted"
                      checked={checklist.sewingCompleted}
                      onCheckedChange={(checked) => 
                        setChecklist({...checklist, sewingCompleted: checked as boolean})
                      }
                    />
                    <Label htmlFor="sewingCompleted" className="flex-1 cursor-pointer">
                      Sewing and mounting completed
                    </Label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleMarkMounted}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Mounted
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setCurrentMount(null)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!currentMount && (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Scissors className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-slate-100">No trophy loaded</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Scan a trophy ID to begin mounting</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
