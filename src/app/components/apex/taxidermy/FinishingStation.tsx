import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Paintbrush, Scan, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function FinishingStation() {
  const [scanInput, setScanInput] = useState('');
  const [currentTrophy, setCurrentTrophy] = useState<any>(null);
  const [finishingTasks, setFinishingTasks] = useState({
    paintEyes: false,
    noseDetail: false,
    lipWork: false,
    habitatBase: false,
    artificialGrass: false,
    accessories: false
  });
  const [notes, setNotes] = useState('');

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    
    setCurrentTrophy({
      id: scanInput,
      species: 'Kudu',
      huntId: 'HUNT-2025-004'
    });
    
    toast.success(`Trophy ${scanInput} loaded`);
    setScanInput('');
  };

  const handleFinish = () => {
    const allCompleted = Object.values(finishingTasks).every(v => v);
    
    if (!allCompleted) {
      toast.error('Please complete all finishing tasks');
      return;
    }

    toast.success('Trophy finishing completed. Moving to Quality Check.');
    setCurrentTrophy(null);
    setFinishingTasks({
      paintEyes: false,
      noseDetail: false,
      lipWork: false,
      habitatBase: false,
      artificialGrass: false,
      accessories: false
    });
    setNotes('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Finishing & Habitat</h1>
        <p className="text-slate-600 dark:text-slate-400">Final detailing and habitat creation</p>
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

      {/* Finishing Work */}
      {currentTrophy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-blue-600" />
              Trophy: {currentTrophy.id}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trophy Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Species</p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{currentTrophy.species}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Trophy ID</p>
                <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{currentTrophy.id}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hunt ID</p>
                <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{currentTrophy.huntId}</p>
              </div>
            </div>

            {/* Finishing Tasks */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Finishing Checklist</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="paintEyes"
                    checked={finishingTasks.paintEyes}
                    onCheckedChange={(checked) => 
                      setFinishingTasks({...finishingTasks, paintEyes: checked as boolean})
                    }
                  />
                  <Label htmlFor="paintEyes" className="flex-1 cursor-pointer">
                    Paint eyes and eye area
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="noseDetail"
                    checked={finishingTasks.noseDetail}
                    onCheckedChange={(checked) => 
                      setFinishingTasks({...finishingTasks, noseDetail: checked as boolean})
                    }
                  />
                  <Label htmlFor="noseDetail" className="flex-1 cursor-pointer">
                    Nose detail and texturing
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="lipWork"
                    checked={finishingTasks.lipWork}
                    onCheckedChange={(checked) => 
                      setFinishingTasks({...finishingTasks, lipWork: checked as boolean})
                    }
                  />
                  <Label htmlFor="lipWork" className="flex-1 cursor-pointer">
                    Lip work and mouth detail
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="habitatBase"
                    checked={finishingTasks.habitatBase}
                    onCheckedChange={(checked) => 
                      setFinishingTasks({...finishingTasks, habitatBase: checked as boolean})
                    }
                  />
                  <Label htmlFor="habitatBase" className="flex-1 cursor-pointer">
                    Habitat base prepared
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="artificialGrass"
                    checked={finishingTasks.artificialGrass}
                    onCheckedChange={(checked) => 
                      setFinishingTasks({...finishingTasks, artificialGrass: checked as boolean})
                    }
                  />
                  <Label htmlFor="artificialGrass" className="flex-1 cursor-pointer">
                    Artificial grass / wood base added
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="accessories"
                    checked={finishingTasks.accessories}
                    onCheckedChange={(checked) => 
                      setFinishingTasks({...finishingTasks, accessories: checked as boolean})
                    }
                  />
                  <Label htmlFor="accessories" className="flex-1 cursor-pointer">
                    Accessories (tusks/pedestal) installed
                  </Label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Finishing Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special details or custom work performed..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleFinish}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Finish Trophy
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCurrentTrophy(null)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!currentTrophy && (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Paintbrush className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-slate-100">No trophy loaded</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Scan a trophy ID to begin finishing work</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
