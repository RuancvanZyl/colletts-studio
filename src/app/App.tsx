import { useState, useEffect, useCallback } from 'react';
import { HunterPortal } from './components/apex/HunterPortal';
import { LocalHunterPortal } from './components/apex/LocalHunterPortal';
import { TaxidermyPortal } from './components/apex/TaxidermyPortal';
import { OutfitterPortal } from './components/apex/OutfitterPortal';
import { LandingPage } from './components/apex/LandingPage';
import { ApexDashboard } from './components/apex/ApexDashboard';
import { LoginScreen } from './components/apex/LoginScreen';
import { RegisterScreen } from './components/apex/RegisterScreen';
import { ResetPasswordScreen } from './components/apex/ResetPasswordScreen';
import { ErrorBoundary } from './components/apex/ErrorBoundary';
import { ThemeProvider } from './components/apex/ThemeProvider';
import { PortalThemeProvider, PortalType } from './components/apex/PortalThemeProvider';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from '../lib/auth';
import { supabase, AUTH_LINK, INVITE_AT_LOAD, clearInviteToken } from '../lib/supabase';
import { InviteScreen } from './components/apex/InviteScreen';
import { OutfitterInviteScreen } from './components/apex/OutfitterInviteScreen';

export type UserRole = 'hunter' | 'local-hunter' | 'admin' | 'outfitter' | 'taxidermy' | 'unified' | null;

type AppView = 'landing' | 'login' | 'register' | 'portal' | 'dashboard' | 'reset-password' | 'invite';

function AppInner() {
  const { user, profile, profileResolved, loading, signOut } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void profile; // used in useEffect below
  const [inviteToken, setInviteToken] = useState<string | null>(INVITE_AT_LOAD);
  const [signedUpHere, setSignedUpHere] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(AUTH_LINK.recovery ? 'reset-password' : INVITE_AT_LOAD ? 'invite' : 'landing');
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(
    () => (localStorage.getItem('apex_portal') as PortalType | null)
  );

  // Persist portal selection so refresh sends user back to the right portal
  const setPortalAndPersist = useCallback((portal: PortalType | null) => {
    if (portal) localStorage.setItem('apex_portal', portal);
    else localStorage.removeItem('apex_portal');
    setSelectedPortal(portal);
  }, []);

  // An expired / already-used email link used to fail silently — tell the person what happened
  useEffect(() => {
    if (AUTH_LINK.error) {
      toast.error(
        /expired|invalid/i.test(AUTH_LINK.error)
          ? 'That email link has expired or was already used. Request a new password reset and open the newest email straight away.'
          : AUTH_LINK.error,
        { duration: 15000 }
      );
    }
  }, []);

  // Detect PASSWORD_RECOVERY event (user clicked reset link in email)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('reset-password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Someone already signed in opened an invitation link → skip the sign-up page, go to their portal and claim it
  useEffect(() => {
    if (currentView === 'invite' && user && profileResolved && !signedUpHere) setCurrentView('landing');
  }, [currentView, user, profileResolved, signedUpHere]);

  // A signed-in hunter who opened their invitation link: attach the workshop's profile to this account
  useEffect(() => {
    if (!user || !profileResolved || profile || !inviteToken || currentView === 'invite') return;
    if (inviteToken.startsWith('o_')) { clearInviteToken(); setInviteToken(null); return; }
    (async () => {
      const { error } = await (supabase as any).rpc('claim_client_invite', { p_token: inviteToken });
      if (error) toast.error(error.message);
      clearInviteToken(); setInviteToken(null);
    })();
  }, [user, profile, profileResolved, inviteToken, currentView]);

  // Auto-redirect authenticated users to their portal
  useEffect(() => {
    // DEV-ONLY: profile without a session means the local admin preview is on
    if (import.meta.env.DEV && !user && profile && currentView === 'landing') {
      setPortalAndPersist('admin');
      setCurrentView('portal');
      return;
    }
    // Wait until we know whether this user is staff — routing before the
    // profile lands sends staff to the hunter portal, which spins forever.
    if (user && !profileResolved) return;

    if (user && currentView === 'landing') {
      if (profile) {
        setPortalAndPersist('admin');
        setCurrentView('portal');
      } else {
        const portalType = user.user_metadata?.portal_type;
        if (portalType === 'outfitter') {
          setPortalAndPersist('outfitter');
          setCurrentView('portal');
        } else {
          setPortalAndPersist('hunter');
          setCurrentView('portal');
        }
      }
    }
    // On refresh: user is already logged in and portal is persisted → go straight to portal
    if (user && currentView === 'landing' && selectedPortal) {
      setCurrentView('portal');
    }
  }, [user, profile, profileResolved, currentView, selectedPortal, setPortalAndPersist]);

  const handleSelectPortal = (portal: 'hunter' | 'outfitter' | 'taxidermy') => {
    const mappedPortal = portal === 'taxidermy' ? 'admin' : portal;
    setPortalAndPersist(mappedPortal as PortalType);
    setCurrentView('login');
  };

  const handleLogin = useCallback(async () => {
    // For hunter portals, check client_type to route local vs export
    if (selectedPortal === 'hunter') {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data: client } = await (supabase as any)
          .from('clients')
          .select('client_type')
          .eq('auth_user_id', u.id)
          .maybeSingle();
        if (client?.client_type === 'local') {
          setPortalAndPersist('local-hunter' as any);
        }
      }
    }
    setCurrentView('portal');
  }, [selectedPortal, setPortalAndPersist]);

  const handleLogout = async () => {
    await signOut();
    setPortalAndPersist(null);
    setCurrentView('landing');
  };

  const handleBackToLanding = () => {
    setPortalAndPersist(null);
    setCurrentView('landing');
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
  };

  const handleGoToRegister = () => {
    setCurrentView('register');
  };

  const handleRegisterComplete = () => {
    setCurrentView('login');
  };

  const handleRegisteredAndLoggedIn = useCallback(async () => {
    // Email confirmation OFF — user is already logged in after signUp
    // Route to correct portal based on selectedPortal
    if (selectedPortal === 'hunter') {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data: client } = await (supabase as any)
          .from('clients')
          .select('client_type')
          .eq('auth_user_id', u.id)
          .maybeSingle();
        if (client?.client_type === 'local') {
          setPortalAndPersist('local-hunter' as any);
        }
      }
    }
    setCurrentView('portal');
  }, [selectedPortal, setPortalAndPersist]);

  const handleGoToDashboard = () => {
    setPortalAndPersist('unified');
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Invitation from the workshop's welcome message (hunters) or to an outfitter (link starts with o_)
  if (currentView === 'invite' && inviteToken && (!user || signedUpHere)) {
    const outfitter = inviteToken.startsWith('o_');
    return (
      <ErrorBoundary>
        <ThemeProvider>
          {outfitter ? (
            <OutfitterInviteScreen
              token={inviteToken.slice(2)}
              onDone={() => { setInviteToken(null); setPortalAndPersist('outfitter'); setCurrentView('portal'); }}
              onSignIn={() => { setPortalAndPersist('outfitter'); setCurrentView('login'); }}
            />
          ) : (
            <InviteScreen
              token={inviteToken}
              onAccountCreated={() => setSignedUpHere(true)}
              onDone={() => { setInviteToken(null); setPortalAndPersist('hunter'); setCurrentView('portal'); }}
              onSignIn={() => { setPortalAndPersist('hunter'); setCurrentView('login'); }}
            />
          )}
          <Toaster closeButton toastOptions={{ duration: 9000 }} />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Password Reset (arrived via email link)
  if (currentView === 'reset-password') {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <ResetPasswordScreen onDone={() => setCurrentView('landing')} onBack={() => setCurrentView('landing')} />
          <Toaster closeButton toastOptions={{ duration: 9000 }} />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Landing Page
  if (currentView === 'landing') {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <PortalThemeProvider portalType="unified">
            <LandingPage onSelectPortal={handleSelectPortal} />
            <Toaster closeButton toastOptions={{ duration: 9000 }} />
          </PortalThemeProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Unified Dashboard (alternative entry)
  if (currentView === 'dashboard' && selectedPortal === 'unified') {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <PortalThemeProvider portalType="unified">
            <ApexDashboard onSelectPortal={(portal) => {
              setPortalAndPersist(portal as PortalType);
              setCurrentView('login');
            }} />
            <Toaster closeButton toastOptions={{ duration: 9000 }} />
          </PortalThemeProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Login Screen
  if (currentView === 'login' && selectedPortal) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <PortalThemeProvider portalType={selectedPortal}>
            <LoginScreen 
              onLogin={handleLogin}
              onBack={handleBackToLanding}
              portalType={selectedPortal === 'admin' ? 'taxidermy' : selectedPortal === 'outfitter' ? 'outfitter' : 'hunter'}
              onPortalChange={(portal) => {
                const mappedPortal = portal === 'taxidermy' ? 'admin' : portal;
                setPortalAndPersist(mappedPortal as PortalType);
              }}
              onRegister={handleGoToRegister}
            />
            <Toaster closeButton toastOptions={{ duration: 9000 }} />
          </PortalThemeProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Registration Screen
  if (currentView === 'register' && selectedPortal) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <PortalThemeProvider portalType={selectedPortal}>
            <RegisterScreen
              onBack={handleBackToLogin}
              onRegisterComplete={handleRegisterComplete}
              onRegisteredAndLoggedIn={handleRegisteredAndLoggedIn}
              portalType={selectedPortal === 'admin' ? 'taxidermy' : selectedPortal === 'outfitter' ? 'outfitter' : 'hunter'}
            />
            <Toaster closeButton toastOptions={{ duration: 9000 }} />
          </PortalThemeProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Portal Views (after login)
  if (currentView === 'portal' && selectedPortal) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <PortalThemeProvider 
            portalType={selectedPortal}
            onPortalChange={(type) => {
              setPortalAndPersist(type);
              setCurrentView('login');
            }}
          >
            {selectedPortal === 'hunter' && <HunterPortal onLogout={handleLogout} />}
            {selectedPortal === ('local-hunter' as any) && <LocalHunterPortal onLogout={handleLogout} />}
            {selectedPortal === 'outfitter' && <OutfitterPortal onLogout={handleLogout} />}
            {selectedPortal === 'admin' && <TaxidermyPortal onLogout={handleLogout} />}
            <Toaster closeButton toastOptions={{ duration: 9000 }} />
          </PortalThemeProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Fallback to landing
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PortalThemeProvider portalType="unified">
          <LandingPage onSelectPortal={handleSelectPortal} />
          <Toaster closeButton toastOptions={{ duration: 9000 }} />
        </PortalThemeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;