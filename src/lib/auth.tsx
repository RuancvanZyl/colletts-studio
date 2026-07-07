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
  is_active: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: StaffProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(HAS_SUPABASE);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    if (!HAS_SUPABASE) return; // No credentials yet — skip auth

    const timeout = setTimeout(() => setLoading(false), 5000);
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      setLoading(false);
    }).catch(() => { clearTimeout(timeout); setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (!HAS_SUPABASE) {
      // Demo mode: accept any credentials when Supabase is not configured
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
