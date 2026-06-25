import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface HuntLinkRequest {
  id: string;
  huntId: string;
  huntName: string;
  hunterName: string;
  hunterEmail: string;
  hunterPhone: string;
  hunterCountry: string;
  startDate: Date;
  endDate: Date;
  region: string;
  farmName?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'declined';
  requestDate: Date;
  idDocument?: string;
}

interface ApprovalConfirmationModalProps {
  request: HuntLinkRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ApprovalConfirmationModal({ 
  request, 
  open, 
  onOpenChange,
  onConfirm 
}: ApprovalConfirmationModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!isConfirmed) {
      toast.error('Please confirm that this hunter is registered for this hunt');
      return;
    }
    onConfirm();
    setIsConfirmed(false);
  };

  const handleCancel = () => {
    setIsConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
            </div>
            Confirm Link Approval
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary Card */}
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-900">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
              You are about to approve the following hunt link request:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">Hunt ID</span>
                <Badge variant="secondary" className="font-mono">
                  {request.huntId}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">Hunter</span>
                <span className="text-sm text-slate-900 dark:text-white">
                  {request.hunterName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">Hunt</span>
                <span className="text-sm text-slate-900 dark:text-white">
                  {request.huntName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">Location</span>
                <span className="text-sm text-slate-900 dark:text-white">
                  {request.region}
                </span>
              </div>
            </div>
          </Card>

          {/* Warning Notice */}
          <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-900 dark:text-white mb-2">
                  Important Notice
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Once approved, this hunter will be linked to your outfitter account. 
                  All hunt data and trophy records will be synchronized between both portals.
                </p>
              </div>
            </div>
          </Card>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-white dark:bg-stone-900 border-2 border-green-300 dark:border-green-800 rounded-lg">
            <Checkbox
              id="confirm"
              checked={isConfirmed}
              onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
              className="mt-0.5"
            />
            <Label 
              htmlFor="confirm" 
              className="text-sm cursor-pointer text-slate-900 dark:text-white leading-relaxed"
            >
              I confirm that <span className="font-medium">{request.hunterName}</span> is 
              registered for this hunt and all details have been verified.
            </Label>
          </div>

          {/* What Happens Next */}
          <div className="space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">What happens next:</p>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                <span>Hunter's status changes to "Linked ✅"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                <span>Automatic notification sent to hunter</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                <span>Hunt data syncs across all portals</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                <span>Trophy tracking becomes active</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm & Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
