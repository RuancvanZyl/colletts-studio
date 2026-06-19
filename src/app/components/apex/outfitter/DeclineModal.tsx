import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { XCircle, AlertTriangle } from 'lucide-react';

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

interface DeclineModalProps {
  request: HuntLinkRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => void;
}

export function DeclineModal({ 
  request, 
  open, 
  onOpenChange,
  onConfirm 
}: DeclineModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason || undefined);
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-500" />
            </div>
            Decline Link Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary Card */}
          <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-2 border-red-200 dark:border-red-900">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
              You are about to decline this hunt link request:
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
            </div>
          </Card>

          {/* Warning Notice */}
          <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-900 dark:text-white mb-2">
                  This action will notify the hunter
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  The hunter will receive a notification that their link request has been declined. 
                  Consider providing a reason to help them understand.
                </p>
              </div>
            </div>
          </Card>

          {/* Reason Text Area */}
          <div>
            <Label htmlFor="decline-reason">Reason for Declining (Optional)</Label>
            <Textarea
              id="decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Hunt dates don't match our availability, Invalid hunter details, etc."
              rows={4}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This message will be sent to the hunter along with the decline notification
            </p>
          </div>

          {/* What Happens */}
          <div className="space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">What happens next:</p>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <XCircle className="w-3 h-3 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
                <span>Request status changes to "Declined"</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-3 h-3 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
                <span>Hunter receives decline notification via email</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-3 h-3 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
                <span>Request remains visible in "Declined" tab for 30 days</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-3 h-3 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
                <span>Hunter can submit a new request if needed</span>
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
            variant="destructive"
            className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Confirm Decline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
