import { useState } from 'react';
import { mockOutfitter } from '../mockOutfitterData';
import { OutfitterDocument, DocumentStatus } from '../types';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Upload, FileText, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const documentTypeLabels = {
  'id-copy': 'ID Copy',
  'outfitter-licence': 'Professional Hunter Licence',
  'hunting-permit': 'Hunting Permit',
  'insurance-certificate': 'Insurance Certificate',
};

export function DocumentsCompliance() {
  const [documents] = useState(mockOutfitter.documents);

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'expiring-soon':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <AlertTriangle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-600">Valid</Badge>;
      case 'expiring-soon':
        return <Badge className="bg-amber-600">Expiring Soon</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleUpload = (docType: string) => {
    toast.success('Document uploaded successfully!', {
      description: `${documentTypeLabels[docType as keyof typeof documentTypeLabels]} has been submitted for review`,
    });
  };

  const expiringCount = documents.filter(
    d => d.status === 'expiring-soon' || d.status === 'expired'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-900 dark:text-slate-100 mb-2">Licences & Permits</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage your professional documents and compliance status
        </p>
      </div>

      {/* Alert Banner */}
      {expiringCount > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-amber-900 dark:text-amber-400 mb-1">
                Action Required
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-500">
                You have {expiringCount} document{expiringCount > 1 ? 's' : ''} that require attention.
                Please upload renewals to maintain compliance.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => {
          const daysUntilExpiry = getDaysUntilExpiry(doc.expiryDate);
          
          return (
            <Card key={doc.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(doc.status)}
                  <div>
                    <h3 className="text-slate-900 dark:text-slate-100 mb-1">
                      {documentTypeLabels[doc.type as keyof typeof documentTypeLabels]}
                    </h3>
                    {getStatusBadge(doc.status)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">File Name:</span>
                  <span className="text-slate-900 dark:text-slate-100">{doc.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Upload Date:</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {new Date(doc.uploadDate).toLocaleDateString()}
                  </span>
                </div>
                {doc.expiryDate && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Expiry Date:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {new Date(doc.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                    {daysUntilExpiry !== null && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Days Remaining:</span>
                        <span className={`${
                          daysUntilExpiry < 30 ? 'text-amber-600' : 'text-green-600'
                        }`}>
                          {daysUntilExpiry > 0 ? daysUntilExpiry : 'Expired'}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button 
                  variant={doc.status === 'expired' || doc.status === 'expiring-soon' ? 'default' : 'outline'}
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleUpload(doc.type)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Replace
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Upload New Document */}
      <Card className="p-6">
        <h3 className="text-slate-900 dark:text-slate-100 mb-4">Upload New Document</h3>
        <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-8 text-center hover:border-green-500 dark:hover:border-green-600 transition-colors cursor-pointer">
          <Upload className="w-8 h-8 mx-auto mb-2 text-stone-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            PDF files up to 10MB
          </p>
        </div>
      </Card>

      {/* Compliance Info */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-blue-900 dark:text-blue-400 mb-1">
              Compliance Notifications
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-500">
              You will receive automatic alerts 30 days before any document expires.
              Keep your documents up to date to maintain your professional hunter status.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
