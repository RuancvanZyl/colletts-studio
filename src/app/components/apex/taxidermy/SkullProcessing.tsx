import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Skull, Scan, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function SkullProcessing() {
  const [scanInput, setScanInput] = useState('');
  const [currentSkull, setCurrentSkull] = useState<any>(null);
  const [processSteps, setProcessSteps] = useState({
    pressureWash: false,
    boilCycle: false,
    whitening: false,
    degreasing: false
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    
    // Mock skull data
    setCurrentSkull({
      id: scanInput,
      species: 'Buffalo',
      trophyId: 'TROPHY-015',
      huntId: 'HUNT-2025-008'
    });
    
    toast.success(`Skull ${scanInput} loaded`);
    setScanInput('');
  };

  const handleComplete = () => {
    const allSteps = Object.values(processSteps).every(step => step);
    
    if (!allSteps) {
      toast.error('Please complete all processing steps');
      return;
    }

    toast.success('Skull processing completed. Moving to Pre-Mounting Storage.');
    setCurrentSkull(null);
    setProcessSteps({
      pressureWash: false,
      boilCycle: false,
      whitening: false,
      degreasing: false
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Skull Cleaning & Bleaching</h1>
        <p className="text-slate-600 dark:text-slate-400">Process skulls for euro mounts</p>
      </div>

      {/* Scan Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-blue-600" />
            Scan Skull Tag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-3">
            <Input
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan or enter skull tag ID..."
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

      {/* Current Skull Processing */}
      {currentSkull && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-blue-600" />
                Current Skull: {currentSkull.id}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Species</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{currentSkull.species}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Trophy ID</p>
                  <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{currentSkull.trophyId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Hunt ID</p>
                  <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{currentSkull.huntId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                  <Badge variant="secondary">Processing</Badge>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Processing Steps</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox 
                      id="pressureWash"
                      checked={processSteps.pressureWash}
                      onCheckedChange={(checked) => 
                        setProcessSteps({...processSteps, pressureWash: checked as boolean})
                      }
                    />
                    <Label htmlFor="pressureWash" className="flex-1 cursor-pointer">
                      Pressure wash to remove tissue
                    </Label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox 
                      id="boilCycle"
                      checked={processSteps.boilCycle}
                      onCheckedChange={(checked) => 
                        setProcessSteps({...processSteps, boilCycle: checked as boolean})
                      }
                    />
                    <Label htmlFor="boilCycle" className="flex-1 cursor-pointer">
                      Complete boil cycle (2-4 hours)
                    </Label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox 
                      id="whitening"
                      checked={processSteps.whitening}
                      onCheckedChange={(checked) => 
                        setProcessSteps({...processSteps, whitening: checked as boolean})
                      }
                    />
                    <Label htmlFor="whitening" className="flex-1 cursor-pointer">
                      Whitening treatment applied
                    </Label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox 
                      id="degreasing"
                      checked={processSteps.degreasing}
                      onCheckedChange={(checked) => 
                        setProcessSteps({...processSteps, degreasing: checked as boolean})
                      }
                    />
                    <Label htmlFor="degreasing" className="flex-1 cursor-pointer">
                      Degreasing completed
                    </Label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleComplete}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark as Complete
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentSkull(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!currentSkull && (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Skull className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-slate-100">No skull loaded</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Scan a skull tag to begin processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
