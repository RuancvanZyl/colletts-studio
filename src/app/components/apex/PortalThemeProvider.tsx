import { createContext, useContext, ReactNode } from 'react';

export type PortalType = 'hunter' | 'outfitter' | 'taxidermy' | 'admin' | 'unified';

interface PortalTheme {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  gradient: string;
  gradientHover: string;
  borderLight: string;
  borderDark: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  icon: any;
  label: string;
}

const portalThemes: Record<PortalType, PortalTheme> = {
  hunter: {
    primary: '#15803d',
    primaryDark: '#166534',
    primaryLight: '#16a34a',
    gradient: 'from-green-700 via-green-600 to-lime-600',
    gradientHover: 'from-green-800 via-green-700 to-lime-700',
    borderLight: 'border-green-300 dark:border-green-800',
    borderDark: 'border-green-800',
    bgLight: 'from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50',
    bgDark: 'from-green-950/50 to-lime-950/50',
    textLight: 'text-green-800 dark:text-green-400',
    textDark: 'text-green-400',
    icon: null,
    label: 'Hunter Portal',
  },
  outfitter: {
    primary: '#d97706',
    primaryDark: '#b45309',
    primaryLight: '#f59e0b',
    gradient: 'from-amber-700 via-amber-600 to-orange-600',
    gradientHover: 'from-amber-800 via-amber-700 to-orange-700',
    borderLight: 'border-amber-300 dark:border-amber-800',
    borderDark: 'border-amber-800',
    bgLight: 'from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50',
    bgDark: 'from-amber-950/50 to-orange-950/50',
    textLight: 'text-amber-800 dark:text-amber-400',
    textDark: 'text-amber-400',
    icon: null,
    label: 'Outfitter Portal',
  },
  taxidermy: {
    primary: '#1d4ed8',
    primaryDark: '#1e40af',
    primaryLight: '#2563eb',
    gradient: 'from-blue-700 via-blue-600 to-cyan-600',
    gradientHover: 'from-blue-800 via-blue-700 to-cyan-700',
    borderLight: 'border-blue-300 dark:border-blue-800',
    borderDark: 'border-blue-800',
    bgLight: 'from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50',
    bgDark: 'from-blue-950/50 to-cyan-950/50',
    textLight: 'text-blue-800 dark:text-blue-400',
    textDark: 'text-blue-400',
    icon: null,
    label: 'Taxidermy Portal',
  },
  admin: {
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    primaryLight: '#8b5cf6',
    gradient: 'from-purple-700 via-purple-600 to-violet-600',
    gradientHover: 'from-purple-800 via-purple-700 to-violet-700',
    borderLight: 'border-purple-300 dark:border-purple-800',
    borderDark: 'border-purple-800',
    bgLight: 'from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50',
    bgDark: 'from-purple-950/50 to-violet-950/50',
    textLight: 'text-purple-800 dark:text-purple-400',
    textDark: 'text-purple-400',
    icon: null,
    label: 'Admin Portal',
  },
  unified: {
    primary: '#15803d',
    primaryDark: '#166534',
    primaryLight: '#16a34a',
    gradient: 'from-green-700 via-green-600 to-lime-600',
    gradientHover: 'from-green-800 via-green-700 to-lime-700',
    borderLight: 'border-green-300 dark:border-green-800',
    borderDark: 'border-green-800',
    bgLight: 'from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50',
    bgDark: 'from-green-950/50 to-lime-950/50',
    textLight: 'text-green-800 dark:text-green-400',
    textDark: 'text-green-400',
    icon: null,
    label: "Apex Trophy Solutions",
  },
};

interface PortalThemeContextType {
  portalType: PortalType;
  theme: PortalTheme;
  setPortalType: (type: PortalType) => void;
}

const PortalThemeContext = createContext<PortalThemeContextType | undefined>(undefined);

export function usePortalTheme() {
  const context = useContext(PortalThemeContext);
  if (!context) {
    throw new Error('usePortalTheme must be used within PortalThemeProvider');
  }
  return context;
}

interface PortalThemeProviderProps {
  children: ReactNode;
  portalType: PortalType;
  onPortalChange?: (type: PortalType) => void;
}

export function PortalThemeProvider({ 
  children, 
  portalType,
  onPortalChange 
}: PortalThemeProviderProps) {
  const theme = portalThemes[portalType];

  const setPortalType = (type: PortalType) => {
    if (onPortalChange) {
      onPortalChange(type);
    }
  };

  return (
    <PortalThemeContext.Provider value={{ portalType, theme, setPortalType }}>
      {children}
    </PortalThemeContext.Provider>
  );
}

export { portalThemes };
