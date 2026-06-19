import { useState } from 'react';
import { HunterPortal } from './components/apex/HunterPortal';
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

export type UserRole = 'hunter' | 'admin' | 'outfitter' | 'taxidermy' | 'unified' | null;

type AppView = 'landing' | 'login' | 'register' | 'portal' | 'dashboard';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSelectPortal = (portal: 'hunter' | 'outfitter' | 'taxidermy') => {
    // Map taxidermy to admin portal
    const mappedPortal = portal === 'taxidermy' ? 'admin' : portal;
    setSelectedPortal(mappedPortal as PortalType);
    setCurrentView('login');
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentView('portal');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
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
  if (currentView === 'portal' && selectedPortal && isLoggedIn) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <PortalThemeProvider 
            portalType={selectedPortal}
            onPortalChange={(type) => {
              setSelectedPortal(type);
              setIsLoggedIn(false);
              setCurrentView('login');
            }}
          >
            {selectedPortal === 'hunter' && <HunterPortal onLogout={handleLogout} />}
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

export default App;