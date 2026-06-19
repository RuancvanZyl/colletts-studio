import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { CheckCircle2, Scan, XCircle, Camera, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function QualityInspection() {
  const [scanInput, setScanInput] = useState('');
  const [currentTrophy, setCurrentTrophy] = useState<any>(null);
  const [inspectionChecks, setInspectionChecks] = useState({
    facialSymmetry: false,
    stitchingInspection: false,
    paintQuality: false,
    measurements: false,
    photoTaken: false
  });
  const [failureNotes, setFailureNotes] = useState('');

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

  const handlePassQC = () => {
    const allChecked = Object.values(inspectionChecks).every(v => v);
    
    if (!allChecked) {
      toast.error('Please complete all inspection checks');
      return;
    }

    toast.success('Trophy passed Quality Check. Moving to Packing.');
    resetForm();
  };

  const handleFailQC = () => {
    if (!failureNotes.trim()) {
      toast.error('Please provide failure notes');
      return;
    }

    toast.warning('Trophy failed QC. Returning to Finishing with notes.');
    resetForm();
  };

  const resetForm = () => {
    setCurrentTrophy(null);
    setInspectionChecks({
      facialSymmetry: false,
      stitchingInspection: false,
      paintQuality: false,
      measurements: false,
      photoTaken: false
    });
    setFailureNotes('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Quality Inspection</h1>
        <p className="text-slate-600 dark:text-slate-400">Final quality check before packing</p>
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

      {/* Quality Check */}
      {currentTrophy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Quality Inspection: {currentTrophy.id}
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

            {/* Inspection Checklist */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Quality Checklist</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="facialSymmetry"
                    checked={inspectionChecks.facialSymmetry}
                    onCheckedChange={(checked) => 
                      setInspectionChecks({...inspectionChecks, facialSymmetry: checked as boolean})
                    }
                  />
                  <Label htmlFor="facialSymmetry" className="flex-1 cursor-pointer">
                    Facial symmetry and proportion
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="stitchingInspection"
                    checked={inspectionChecks.stitchingInspection}
                    onCheckedChange={(checked) => 
                      setInspectionChecks({...inspectionChecks, stitchingInspection: checked as boolean})
                    }
                  />
                  <Label htmlFor="stitchingInspection" className="flex-1 cursor-pointer">
                    Stitching inspection (hidden/tight)
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="paintQuality"
                    checked={inspectionChecks.paintQuality}
                    onCheckedChange={(checked) => 
                      setInspectionChecks({...inspectionChecks, paintQuality: checked as boolean})
                    }
                  />
                  <Label htmlFor="paintQuality" className="flex-1 cursor-pointer">
                    Paint quality and color accuracy
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="measurements"
                    checked={inspectionChecks.measurements}
                    onCheckedChange={(checked) => 
                      setInspectionChecks({...inspectionChecks, measurements: checked as boolean})
                    }
                  />
                  <Label htmlFor="measurements" className="flex-1 cursor-pointer">
                    Measurements verified
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Checkbox 
                    id="photoTaken"
                    checked={inspectionChecks.photoTaken}
                    onCheckedChange={(checked) => 
                      setInspectionChecks({...inspectionChecks, photoTaken: checked as boolean})
                    }
                  />
                  <Label htmlFor="photoTaken" className="flex-1 cursor-pointer">
                    Quality photos taken
                  </Label>
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Label>Upload Quality Photos</Label>
              <div className="mt-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-slate-400 dark:hover:border-slate-600 transition-colors cursor-pointer">
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Click to upload quality inspection photos
                </p>
              </div>
            </div>

            {/* Failure Notes (conditional) */}
            <div className="space-y-2">
              <Label htmlFor="failureNotes" className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Failure Notes (if QC fails)
              </Label>
              <Textarea
                id="failureNotes"
                value={failureNotes}
                onChange={(e) => setFailureNotes(e.target.value)}
                placeholder="Describe any issues found during inspection..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={handlePassQC}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Pass QC
              </Button>
              <Button 
                onClick={handleFailQC}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Fail QC
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
                <CheckCircle2 className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-slate-100">No trophy loaded</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Scan a trophy ID to begin quality inspection</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
