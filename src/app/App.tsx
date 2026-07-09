import { useState, useEffect, useCallback } from 'react';
import { HunterPortal } from './components/apex/HunterPortal';
import { LocalHunterPortal } from './components/apex/LocalHunterPortal';
import { TaxidermyPortal } from './components/apex/TaxidermyPortal';
import { OutfitterPortal } from './components/apex/OutfitterPortal';
import { LandingPage } from './components/apex/LandingPage';
import { ApexDashboard } from './components/apex/ApexDashboard';
import { LoginScreen } from './components/apex/LoginScreen';
import { RegisterScreen } from './components/apex/RegisterScreen';
import { ErrorBoundary } from './components/apex/ErrorBoundary';
import { ThemeProvider } from './components/apex/ThemeProvider';
import { PortalThemeProvider, PortalType } from './components/apex/PortalThemeProvider';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export type UserRole = 'hunter' | 'local-hunter' | 'admin' | 'outfitter' | 'taxidermy' | 'unified' | null;

type AppView = 'landing' | 'login' | 'register' | 'portal' | 'dashboard';

function AppInner() {
  const { user, profile, loading, signOut } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void profile; // used in useEffect below
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null);

  // Auto-redirect authenticated users to their portal
  useEffect(() => {
    if (user && currentView === 'landing') {
      if (profile) {
        // Staff → taxidermy portal
        setSelectedPortal('admin');
        setCurrentView('portal');
      } else {
        // Hunter / outfitter — route by portal_type stored in user metadata
        const portalType = user.user_metadata?.portal_type;
        if (portalType === 'outfitter') {
          setSelectedPortal('outfitter');
          setCurrentView('portal');
        } else {
          // Default non-staff users to hunter portal
          setSelectedPortal('hunter');
          setCurrentView('portal');
        }
      }
    }
  }, [user, profile, currentView]);

  const handleSelectPortal = (portal: 'hunter' | 'outfitter' | 'taxidermy') => {
    const mappedPortal = portal === 'taxidermy' ? 'admin' : portal;
    setSelectedPortal(mappedPortal as PortalType);
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
          setSelectedPortal('local-hunter' as any);
        }
      }
    }
    setCurrentView('portal');
  }, [selectedPortal]);

  const handleLogout = async () => {
    await signOut();
    setSelectedPortal(null);
    setCurrentView('landing');
  };

  const handleBackToLanding = () => {
    setSelectedPortal(null);
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

  const handleGoToDashboard = () => {
    setSelectedPortal('unified');
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Landing Page
  if (currentView === 'landing') {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <PortalThemeProvider portalType="unified">
            <LandingPage onSelectPortal={handleSelectPortal} />
            <Toaster />
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
              setSelectedPortal(portal as PortalType);
              setCurrentView('login');
            }} />
            <Toaster />
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
                setSelectedPortal(mappedPortal as PortalType);
              }}
              onRegister={handleGoToRegister}
            />
            <Toaster />
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
              portalType={selectedPortal === 'admin' ? 'taxidermy' : selectedPortal === 'outfitter' ? 'outfitter' : 'hunter'}
            />
            <Toaster />
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
              setSelectedPortal(type);
              setCurrentView('login');
            }}
          >
            {selectedPortal === 'hunter' && <HunterPortal onLogout={handleLogout} />}
            {selectedPortal === ('local-hunter' as any) && <LocalHunterPortal onLogout={handleLogout} />}
            {selectedPortal === 'outfitter' && <OutfitterPortal onLogout={handleLogout} />}
            {selectedPortal === 'admin' && <TaxidermyPortal onLogout={handleLogout} />}
            <Toaster />
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
          <Toaster />
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