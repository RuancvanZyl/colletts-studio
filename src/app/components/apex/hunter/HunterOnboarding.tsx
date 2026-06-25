import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Calendar } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Compass, Calendar as CalendarIcon, MapPin, User, CheckCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate as format } from '../utils/dateUtils';

interface HunterOnboardingProps {
  onComplete: (huntData: any) => void;
}

export function HunterOnboarding({ onComplete }: HunterOnboardingProps) {
  const [step, setStep] = useState<'create' | 'confirmation'>('create');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [generatedHuntId, setGeneratedHuntId] = useState('');
  
  const [huntData, setHuntData] = useState({
    huntName: '',
    outfitterName: '',
    outfitterLocation: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    region: '',
    farmName: '',
    notes: '',
  });

  const [linkStatus, setLinkStatus] = useState<'pending' | 'linked' | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setHuntData(prev => ({ ...prev, [field]: value }));
  };

  const generateHuntId = () => {
    const year = new Date().getFullYear();
    const randomId = Math.floor(1000 + Math.random() * 9000);
    return `HUNT-${year}-${randomId}`;
  };

  const handleCreateHunt = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!huntData.startDate || !huntData.endDate) {
      toast.error('Please select hunt dates');
      return;
    }

    const huntId = generateHuntId();
    setGeneratedHuntId(huntId);
    setShowConfirmation(true);
    setLinkStatus('pending');
    toast.success('Hunt created successfully!');
  };

  const handleConfirmLink = () => {
    // Simulate outfitter confirmation (in real app, this would be async)
    setTimeout(() => {
      setLinkStatus('linked');
      toast.success('Outfitter has confirmed the link!');
    }, 2000);
  };

  const handleComplete = () => {
    onComplete({
      ...huntData,
      huntId: generatedHuntId,
      status: linkStatus,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-green-50/30 to-stone-100 dark:from-stone-950 dark:via-green-950/20 dark:to-stone-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-700 to-lime-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Compass className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-slate-900 dark:text-white mb-2">Create Your Hunt</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Link your hunt to your outfitter using a unique Hunt ID
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-900 dark:text-white">Verified</span>
              </div>
              <div className="w-12 h-0.5 bg-green-600"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                  1
                </div>
                <span className="text-sm text-slate-900 dark:text-white">Create Hunt</span>
              </div>
              <div className="w-12 h-0.5 bg-stone-300 dark:bg-stone-700"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-stone-300 dark:bg-stone-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 text-sm">
                  2
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Add Trophies</span>
              </div>
            </div>
          </div>

          {/* Create Hunt Form */}
          <Card className="p-8 bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800">
            <form onSubmit={handleCreateHunt} className="space-y-6">
              {/* Hunt Name */}
              <div>
                <Label htmlFor="huntName">Hunt Name *</Label>
                <Input
                  id="huntName"
                  value={huntData.huntName}
                  onChange={(e) => handleInputChange('huntName', e.target.value)}
                  placeholder="e.g., South Africa Safari 2025"
                  required
                  className="mt-1"
                />
              </div>

              {/* Outfitter Information */}
              <div className="space-y-4">
                <h3 className="text-slate-900 dark:text-white">Outfitter Details</h3>
                <div>
                  <Label htmlFor="outfitterName">Outfitter Name *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="outfitterName"
                      value={huntData.outfitterName}
                      onChange={(e) => handleInputChange('outfitterName', e.target.value)}
                      placeholder="Search or enter outfitter name"
                      required
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Start typing to search registered outfitters
                  </p>
                </div>

                <div>
                  <Label htmlFor="outfitterLocation">Outfitter Location</Label>
                  <Input
                    id="outfitterLocation"
                    value={huntData.outfitterLocation}
                    onChange={(e) => handleInputChange('outfitterLocation', e.target.value)}
                    placeholder="Auto-filled after outfitter link"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Hunt Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Hunt Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left mt-1"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {huntData.startDate ? format(huntData.startDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={huntData.startDate}
                        onSelect={(date) => handleInputChange('startDate', date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Hunt End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left mt-1"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {huntData.endDate ? format(huntData.endDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={huntData.endDate}
                        onSelect={(date) => handleInputChange('endDate', date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Location Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region">Region *</Label>
                  <Input
                    id="region"
                    value={huntData.region}
                    onChange={(e) => handleInputChange('region', e.target.value)}
                    placeholder="e.g., Limpopo Province"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="farmName">Farm / Area Name</Label>
                  <Input
                    id="farmName"
                    value={huntData.farmName}
                    onChange={(e) => handleInputChange('farmName', e.target.value)}
                    placeholder="e.g., Bushveld Reserve"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={huntData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any special details or requirements..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-700 to-lime-600 hover:from-green-800 hover:to-lime-700 text-white"
              >
                Generate Hunt ID & Send Link Request
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hunt Created Successfully!</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Hunt ID Display */}
            <div className="text-center p-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Your Hunt ID</p>
              <p className="text-2xl text-green-700 dark:text-green-500 tracking-wider mb-2">
                {generatedHuntId}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share this ID with your outfitter
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-3">
              {linkStatus === 'pending' && (
                <>
                  <div className="animate-pulse w-3 h-3 bg-amber-500 rounded-full"></div>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                    Awaiting Outfitter Confirmation
                  </Badge>
                </>
              )}
              {linkStatus === 'linked' && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                    Linked ✅
                  </Badge>
                </>
              )}
            </div>

            {/* Info */}
            <Card className="p-4 bg-stone-50 dark:bg-stone-900/50">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                A link request has been sent to <span className="font-medium">{huntData.outfitterName}</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                You'll receive a notification once they confirm the connection. You can start adding trophies immediately.
              </p>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {linkStatus === 'pending' && (
                <Button
                  onClick={handleConfirmLink}
                  variant="outline"
                  className="flex-1"
                >
                  Simulate Outfitter Approval
                </Button>
              )}
              <Button
                onClick={handleComplete}
                className="flex-1 bg-gradient-to-r from-green-700 to-lime-600 hover:from-green-800 hover:to-lime-700 text-white"
              >
                Continue to Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
