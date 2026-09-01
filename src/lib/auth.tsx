import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { StaffRole } from './database.types';

const HAS_SUPABASE = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface StaffProfile {
  id: string;
  full_name: string;
  role: StaffRole;
  department_id: string | null;
  department_name?: string | null;
  is_active: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: StaffProfile | null;
  profileError: string | null;
  profileResolved: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// DEV-ONLY preview: lets you walk the management UI locally without signing in.
// import.meta.env.DEV is false in every production build, so this cannot ship.
const DEV_ADMIN_PREVIEW: StaffProfile | null =
  import.meta.env.DEV && localStorage.getItem('apex_dev_admin') === '1'
    ? {
        id: 'dev-preview',
        full_name: 'Preview Admin',
        role: 'admin' as StaffRole,
        department_id: null,
        department_name: null,
        is_active: true,
      }
    : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(DEV_ADMIN_PREVIEW);
  const [profileError, setProfileError] = useState<string | null>(null);
  // False until we know whether this user is staff — routing must wait for it
  const [profileResolved, setProfileResolved] = useState(!!DEV_ADMIN_PREVIEW);
  // Never block the UI — start false, update in background
  const [loading, setLoading] = useState(false);

  async function loadProfile(userId: string) {
    // Try with the department join first
    const joined = await (supabase as any)
      .from('staff_profiles')
      .select('*, departments(name)')
      .eq('id', userId)
      .maybeSingle();

    if (joined.data) {
      setProfile({ ...joined.data, department_name: joined.data.departments?.name ?? null });
      setProfileResolved(true);
      return;
    }

    // The join can fail on its own (RLS on departments) — retry without it
    const plain = await (supabase as any)
      .from('staff_profiles')
      .select('id, full_name, email, role, department_id, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (plain.data) {
      setProfile({ ...plain.data, department_name: null });
      setProfileResolved(true);
      return;
    }

    // Genuinely no profile — surface why instead of silently downgrading access
    const err = plain.error ?? joined.error;
    if (err) {
      console.error('[auth] Could not load staff profile:', err.message);
      setProfileError(err.message);
    }
    setProfile(null);
    setProfileResolved(true);
  }

  useEffect(() => {
    if (!HAS_SUPABASE) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setProfileResolved(true);
    }).catch(() => setProfileResolved(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) { setProfileResolved(false); loadProfile(session.user.id); }
      else { setProfile(DEV_ADMIN_PREVIEW); setProfileResolved(true); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (!HAS_SUPABASE) {
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { error: null };
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'Please confirm your email first — check your inbox and click the verification link.' };
    }
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { error: 'Incorrect email or password. Please try again.' };
    }
    return { error: error.message };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, profileError, profileResolved, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
