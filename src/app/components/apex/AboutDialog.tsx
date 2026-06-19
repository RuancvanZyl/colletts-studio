import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '../ui/dialog';
import { Trophy, Users, Package, Compass, Shield, Zap, User } from 'lucide-react';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-lime-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle>About Apex Trophy Solutions</DialogTitle>
            </div>
          </div>
          <DialogDescription>
            The complete trophy management ecosystem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mission */}
          <div>
            <h4 className="text-slate-900 dark:text-white mb-2">Our Mission</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Apex Trophy Solutions connects hunters, outfitters, and taxidermists in one seamless platform, 
              providing real-time tracking, secure communication, and comprehensive management tools 
              for the entire trophy journey from hunt to delivery.
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-slate-900 dark:text-white mb-4">Key Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-green-700 dark:text-green-500" />
                </div>
                <div>
                  <h5 className="text-sm text-slate-900 dark:text-white mb-1">Real-Time Tracking</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Monitor every stage of your trophy&apos;s journey
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Compass className="w-5 h-5 text-amber-700 dark:text-amber-500" />
                </div>
                <div>
                  <h5 className="text-sm text-slate-900 dark:text-white mb-1">Hunt Management</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Create, organize, and track all hunts
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-blue-700 dark:text-blue-500" />
                </div>
                <div>
                  <h5 className="text-sm text-slate-900 dark:text-white mb-1">Workshop Integration</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Complete taxidermy workflow management
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-purple-700 dark:text-purple-500" />
                </div>
                <div>
                  <h5 className="text-sm text-slate-900 dark:text-white mb-1">Compliance Tracking</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Manage licences and documentation
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-950 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-cyan-700 dark:text-cyan-500" />
                </div>
                <div>
                  <h5 className="text-sm text-slate-900 dark:text-white mb-1">Unified Communication</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Seamless messaging across portals
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-950 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-rose-700 dark:text-rose-500" />
                </div>
                <div>
                  <h5 className="text-sm text-slate-900 dark:text-white mb-1">AI Assistant</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Smart help and automated insights
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Portals */}
          <div>
            <h4 className="text-slate-900 dark:text-white mb-4">Three Integrated Portals</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <User className="w-5 h-5 text-green-700 dark:text-green-500 mt-0.5" />
                <div>
                  <h5 className="text-sm text-slate-900 dark:text-white mb-1">Hunter Portal</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Track trophies, manage hunts, select mount options, and communicate with outfitters and taxidermists
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
                <Compass className="w-5 h-5 text-amber-700 dark:text-amber-500 mt-0.5" />
                <div>
                  <h5 className="text-sm text-slate-900 dark:text-white mb-1">Outfitter Portal</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Manage hunts, link hunters, track compliance, view analytics, and maintain documentation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                <Package className="w-5 h-5 text-blue-700 dark:text-blue-500 mt-0.5" />
                <div>
                  <h5 className="text-sm text-slate-900 dark:text-white mb-1">Taxidermy Portal</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Process intake, track stages, manage inventory, perform quality checks, and coordinate dispatch
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-br from-stone-100 to-stone-50 dark:from-stone-900 dark:to-stone-800 rounded-lg">
            <div className="text-center">
              <div className="text-2xl text-green-700 dark:text-green-500 mb-1">150+</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-amber-700 dark:text-amber-500 mb-1">12</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Outfitters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-blue-700 dark:text-blue-500 mb-1">187</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Trophies Tracked</div>
            </div>
          </div>

          {/* Contact */}
          <div className="border-t border-stone-200 dark:border-stone-700 pt-4">
            <h4 className="text-slate-900 dark:text-white mb-2">Contact & Support</h4>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>Email: support@apextrophysolutions.com</p>
              <p>Phone: +1 (555) 123-4567</p>
              <p>Hours: Monday - Friday, 8AM - 6PM EST</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
