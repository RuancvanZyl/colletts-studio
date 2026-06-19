import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Clock, Mail, CheckCircle2, FileText } from 'lucide-react';

interface VerificationPendingProps {
  onBackToLogin: () => void;
}

export function VerificationPending({ onBackToLogin }: VerificationPendingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-green-50/30 to-stone-100 dark:from-stone-950 dark:via-green-950/20 dark:to-stone-900 relative overflow-hidden">
      {/* Blurred Dashboard Preview Background */}
      <div className="absolute inset-0 opacity-20 blur-sm pointer-events-none">
        <div className="h-full bg-gradient-to-br from-green-100 to-lime-100 dark:from-green-900/20 dark:to-lime-900/20"></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-900 dark:text-white">Registration</span>
              </div>
              <div className="w-12 h-0.5 bg-green-600"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                  2
                </div>
                <span className="text-sm text-slate-900 dark:text-white">Verification</span>
              </div>
              <div className="w-12 h-0.5 bg-stone-300 dark:bg-stone-700"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-stone-300 dark:bg-stone-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 text-sm">
                  3
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Get Started</span>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <Card className="p-8 md:p-12 bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 text-center">
            {/* Icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Clock className="w-12 h-12 text-white animate-pulse" />
            </div>

            {/* Status Badge */}
            <Badge className="mb-4 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border-amber-300 dark:border-amber-800">
              Pending Review
            </Badge>

            {/* Message */}
            <h1 className="text-slate-900 dark:text-white mb-4">
              Your Profile is Under Verification
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Thank you for registering! Our team is reviewing your information and documents. You'll receive an email once your account is approved.
            </p>

            {/* What's Next Section */}
            <Card className="p-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 mb-6">
              <h3 className="text-slate-900 dark:text-white mb-4">What Happens Next?</h3>
              <div className="space-y-4 text-left">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">1</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 dark:text-white">Document Verification</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Our team reviews your ID and registration details</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">2</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 dark:text-white">Email Notification</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">You'll receive approval confirmation within 24-48 hours</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">3</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 dark:text-white">Access Your Portal</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Log in and start tracking your trophies</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card className="p-4 bg-stone-50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-500 mx-auto mb-2" />
                <p className="text-sm text-slate-900 dark:text-white mb-1">Check Your Email</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  We'll notify you as soon as your account is approved
                </p>
              </Card>
              <Card className="p-4 bg-stone-50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800">
                <FileText className="w-8 h-8 text-green-600 dark:text-green-500 mx-auto mb-2" />
                <p className="text-sm text-slate-900 dark:text-white mb-1">Typical Processing Time</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  24-48 hours during business days
                </p>
              </Card>
            </div>

            {/* Action Button */}
            <Button
              onClick={onBackToLogin}
              variant="outline"
              className="w-full md:w-auto"
            >
              Back to Login
            </Button>
          </Card>

          {/* Support Note */}
          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            Need help? Contact us at{' '}
            <a href="mailto:support@apextrophysolutions.com" className="text-green-600 dark:text-green-500 hover:underline">
              support@apextrophysolutions.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
