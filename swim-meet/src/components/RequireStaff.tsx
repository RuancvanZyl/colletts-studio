import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { HAS_SUPABASE } from '@/lib/supabase';

export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (!HAS_SUPABASE) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-lg font-semibold text-white">Backend not configured</p>
          <p className="text-sm text-white/50 mt-2 max-w-sm">
            Copy .env.example to .env with your swim-meet Supabase project details to enable staff access.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-ocean-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/staff/login" replace />;
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-lg font-semibold text-white">No staff profile found</p>
          <p className="text-sm text-white/50 mt-2 max-w-sm">
            This account isn't linked to a staff_profiles row yet. Ask a meet admin to add you.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
