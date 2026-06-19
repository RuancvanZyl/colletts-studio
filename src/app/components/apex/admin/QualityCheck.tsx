import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Checkbox } from '../../ui/checkbox';
import { Badge } from '../../ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface QCItem {
  id: string;
  trophyId: string;
  species: string;
  part: string;
  stage: string;
}

const mockQCQueue: QCItem[] = [
  { id: '1', trophyId: 'TRP-004', species: 'Kudu', part: 'Horns + Skull', stage: 'Mounting Complete' },
  { id: '2', trophyId: 'TRP-002', species: 'Buffalo', part: 'Skull', stage: 'Mounting Complete' },
  { id: '3', trophyId: 'TRP-006', species: 'Zebra', part: 'Full Skin', stage: 'Tannery Complete' }
];

export function QualityCheck() {
  const [selectedItem, setSelectedItem] = useState<QCItem | null>(null);
  const [showFailDialog, setShowFailDialog] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [checklist, setChecklist] = useState({
    condition: false,
    measurements: false,
    photos: false
  });

  const handlePass = () => {
    if (!selectedItem) return;
    toast.success(`${selectedItem.species} passed QC - routing to Packing`);
    setSelectedItem(null);
    setChecklist({ condition: false, measurements: false, photos: false });
  };

  const handleFail = () => {
    if (!selectedItem || !failReason.trim()) return;
    toast.error(`${selectedItem.species} failed QC - returning to Workshop`);
    setShowFailDialog(false);
    setSelectedItem(null);
    setFailReason('');
    setChecklist({ condition: false, measurements: false, photos: false });
  };

  const allChecked = Object.values(checklist).every(v => v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Quality Check</h1>
        <p className="text-slate-600">Inspect trophies before final packing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <Card className="lg:col-span-1">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-slate-900">QC Queue</h2>
            <p className="text-slate-600 mt-1">{mockQCQueue.length} items pending</p>
          </div>
          <div className="divide-y divide-slate-100">
            {mockQCQueue.map((item) => (
              <div
                key={item.id}
                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                  selectedItem?.id === item.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-slate-900">{item.species}</h3>
                  {selectedItem?.id === item.id && (
                    <Badge className="bg-blue-600">Selected</Badge>
                  )}
                </div>
                <p className="text-slate-600">{item.part}</p>
                <p className="text-slate-600 mt-1">{item.trophyId}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* QC Form */}
        <Card className="lg:col-span-2">
          {!selectedItem ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-slate-900 mb-2">No Item Selected</h3>
              <p className="text-slate-600">Select an item from the queue to begin QC</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-slate-900 mb-2">Inspecting: {selectedItem.species}</h2>
                <p className="text-slate-600">Trophy ID: {selectedItem.trophyId}</p>
                <Badge variant="outline" className="mt-2">{selectedItem.stage}</Badge>
              </div>

              <div className="space-y-4">
                <h3 className="text-slate-900">Quality Checklist</h3>
                
                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                  <Checkbox
                    id="condition"
                    checked={checklist.condition}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, condition: checked as boolean })
                    }
                  />
                  <Label htmlFor="condition" className="cursor-pointer flex-1">
                    <div className="text-slate-900">Condition Check</div>
                    <div className="text-slate-600">No visible damage or defects</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                  <Checkbox
                    id="measurements"
                    checked={checklist.measurements}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, measurements: checked as boolean })
                    }
                  />
                  <Label htmlFor="measurements" className="cursor-pointer flex-1">
                    <div className="text-slate-900">Measurements Verified</div>
                    <div className="text-slate-600">All dimensions match specifications</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                  <Checkbox
                    id="photos"
                    checked={checklist.photos}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, photos: checked as boolean })
                    }
                  />
                  <Label htmlFor="photos" className="cursor-pointer flex-1">
                    <div className="text-slate-900">Photos Taken</div>
                    <div className="text-slate-600">Documentation complete</div>
                  </Label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setShowFailDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Fail QC
                </Button>
                <Button
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white"
                  onClick={handlePass}
                  disabled={!allChecked}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Pass QC
                </Button>
              </div>

              {!allChecked && (
                <p className="text-amber-600 text-center">
                  Complete all checklist items to pass QC
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Fail Dialog */}
      <Dialog open={showFailDialog} onOpenChange={setShowFailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fail Quality Check</DialogTitle>
            <DialogDescription>
              Provide a reason for failing this item. It will be returned to the workshop.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Failure Reason *</Label>
              <Textarea
                id="reason"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="Describe the issue..."
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFailDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFail}
              disabled={!failReason.trim()}
            >
              Fail & Return to Workshop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
