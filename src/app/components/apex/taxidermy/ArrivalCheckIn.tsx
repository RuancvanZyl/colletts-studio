import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { ClipboardCheck, Upload, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ArrivalCheckInProps {
  onComplete: () => void;
}

export function ArrivalCheckIn({ onComplete }: ArrivalCheckInProps) {
  const [formData, setFormData] = useState({
    hunterName: '',
    outfitter: '',
    huntId: '',
    trophyId: '',
    partType: '',
    zone: 'Receiving',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.hunterName || !formData.huntId || !formData.trophyId || !formData.partType) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success('Trophy arrival checked in successfully!');
    toast.info('Hunter has been notified');
    
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  const partTypes = [
    'Skull',
    'Horns',
    'Cape Skin',
    'Full Skin',
    'Tusks',
    'Antlers',
    'Full Body'
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onComplete}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Trophy Arrival Check-In</h1>
          <p className="text-slate-600 dark:text-slate-400">Register new trophy arrivals</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Arrival Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="hunterName">Hunter Name *</Label>
                <Input
                  id="hunterName"
                  value={formData.hunterName}
                  onChange={(e) => setFormData({...formData, hunterName: e.target.value})}
                  placeholder="John Smith"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outfitter">Outfitter</Label>
                <Input
                  id="outfitter"
                  value={formData.outfitter}
                  onChange={(e) => setFormData({...formData, outfitter: e.target.value})}
                  placeholder="Safari Adventures Inc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="huntId">Hunt ID *</Label>
                <Input
                  id="huntId"
                  value={formData.huntId}
                  onChange={(e) => setFormData({...formData, huntId: e.target.value})}
                  placeholder="HUNT-2025-004"
                  className="font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trophyId">Trophy ID *</Label>
                <Input
                  id="trophyId"
                  value={formData.trophyId}
                  onChange={(e) => setFormData({...formData, trophyId: e.target.value})}
                  placeholder="TROPHY-001"
                  className="font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partType">Part Type *</Label>
                <Select 
                  value={formData.partType} 
                  onValueChange={(value) => setFormData({...formData, partType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select part type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {partTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone">Assign Zone</Label>
                <Select 
                  value={formData.zone} 
                  onValueChange={(value) => setFormData({...formData, zone: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receiving">Receiving</SelectItem>
                    <SelectItem value="Quarantine">Quarantine</SelectItem>
                    <SelectItem value="Inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any additional notes or special instructions..."
                rows={3}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Upload Photos (Optional)</Label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center hover:border-slate-400 dark:hover:border-slate-600 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  PNG, JPG up to 10MB
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Check-In
              </Button>
              <Button type="button" variant="outline" onClick={onComplete}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Information Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Upon completion, the trophy will automatically appear in the Part Processing stage, and the hunter will receive an instant notification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
