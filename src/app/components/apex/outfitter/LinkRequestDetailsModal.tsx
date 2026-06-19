import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { Separator } from '../../ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  MapPin, 
  FileText, 
  Download,
  CheckCircle,
  XCircle 
} from 'lucide-react';

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

interface LinkRequestDetailsModalProps {
  request: HuntLinkRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onDecline: () => void;
}

export function LinkRequestDetailsModal({ 
  request, 
  open, 
  onOpenChange,
  onApprove,
  onDecline 
}: LinkRequestDetailsModalProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hunt Request Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <h3 className="text-slate-900 dark:text-white">Request Status</h3>
            {request.status === 'pending' && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                Pending Review
              </Badge>
            )}
            {request.status === 'approved' && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                Approved
              </Badge>
            )}
            {request.status === 'declined' && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400">
                Declined
              </Badge>
            )}
          </div>

          <Separator />

          {/* Hunter Information */}
          <div>
            <h3 className="text-slate-900 dark:text-white mb-4">Hunter Information</h3>
            <Card className="p-4 bg-stone-50 dark:bg-stone-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Full Name</p>
                    <p className="text-sm text-slate-900 dark:text-white">{request.hunterName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Country</p>
                    <p className="text-sm text-slate-900 dark:text-white">{request.hunterCountry}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Email</p>
                    <p className="text-sm text-slate-900 dark:text-white break-all">{request.hunterEmail}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Phone Number</p>
                    <p className="text-sm text-slate-900 dark:text-white">{request.hunterPhone}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Separator />

          {/* Hunt Details */}
          <div>
            <h3 className="text-slate-900 dark:text-white mb-4">Hunt Details</h3>
            <div className="space-y-4">
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-900">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-slate-900 dark:text-white">{request.huntName}</h4>
                  <Badge variant="secondary" className="font-mono">
                    {request.huntId}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Requested on {formatDateShort(request.requestDate)}
                </p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-stone-50 dark:bg-stone-900/50">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Hunt Dates</p>
                      <p className="text-sm text-slate-900 dark:text-white mb-1">
                        Start: {formatDate(request.startDate)}
                      </p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        End: {formatDate(request.endDate)}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-stone-50 dark:bg-stone-900/50">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Location</p>
                      <p className="text-sm text-slate-900 dark:text-white mb-1">
                        {request.region}
                      </p>
                      {request.farmName && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {request.farmName}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {request.notes && (
                <Card className="p-4 bg-stone-50 dark:bg-stone-900/50">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Notes from Hunter</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {request.notes}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Documents */}
          {request.idDocument && (
            <>
              <Separator />
              <div>
                <h3 className="text-slate-900 dark:text-white mb-4">Uploaded Documents</h3>
                <Card className="p-4 bg-stone-50 dark:bg-stone-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-900 dark:text-white">
                          Hunter ID / Passport Copy
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {request.idDocument}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {request.status === 'pending' && (
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 md:flex-none"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1 md:flex-none text-red-600 border-red-300 hover:bg-red-50 dark:text-red-500 dark:border-red-800 dark:hover:bg-red-950/20"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Decline Request
            </Button>
            <Button
              onClick={onApprove}
              className="flex-1 md:flex-none bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Request
            </Button>
          </DialogFooter>
        )}

        {request.status !== 'pending' && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
