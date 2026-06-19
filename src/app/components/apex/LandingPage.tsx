import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { AboutDialog } from './AboutDialog';
import { Trophy, User, Compass, Package, Moon, Sun, ArrowRight } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface LandingPageProps {
  onSelectPortal: (portal: 'hunter' | 'outfitter' | 'taxidermy') => void;
}

export function LandingPage({ onSelectPortal }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);

  const portals = [
    {
      id: 'hunter' as const,
      icon: User,
      emoji: '🦌',
      title: 'Hunter Portal',
      description: 'Track your trophies and manage your hunts.',
      gradient: 'from-green-600 to-lime-600',
      hoverGradient: 'from-green-700 to-lime-700',
      bgGradient: 'from-green-50/50 to-lime-50/50 dark:from-green-950/30 dark:to-lime-950/30',
    },
    {
      id: 'outfitter' as const,
      icon: Compass,
      emoji: '🎯',
      title: 'Outfitter Portal',
      description: 'Manage clients, hunts, and compliance.',
      gradient: 'from-amber-600 to-orange-600',
      hoverGradient: 'from-amber-700 to-orange-700',
      bgGradient: 'from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30',
    },
    {
      id: 'taxidermy' as const,
      icon: Package,
      emoji: '🐘',
      title: 'Taxidermy Portal',
      description: 'Track, process, and manage trophies.',
      gradient: 'from-blue-600 to-cyan-600',
      hoverGradient: 'from-blue-700 to-cyan-700',
      bgGradient: 'from-blue-50/50 to-cyan-50/50 dark:from-blue-950/30 dark:to-cyan-950/30',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-100 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTItMTRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40 dark:opacity-20"></div>

      {/* Top Navigation */}
      <nav className="relative z-10 border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-lime-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl text-slate-900 dark:text-white">Apex Trophy Solutions</span>
          </div>
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              onClick={() => setAboutOpen(true)}
              className="text-sm hidden md:block"
            >
              About
            </Button>
            <a href="#support" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors hidden md:block">
              Support
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 wildtrack-animate-fade">
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 via-lime-600 to-green-600 rounded-2xl flex items-center justify-center shadow-xl">
                <Trophy className="w-9 h-9 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl text-slate-900 dark:text-white mb-4">
              Apex Trophy Solutions
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Connecting Hunters, Outfitters, and Taxidermists
            </p>
            <Badge variant="secondary" className="mt-4">
              Secure Trophy Management System
            </Badge>
          </div>

          {/* Portal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {portals.map((portal, index) => (
              <Card
                key={portal.id}
                className={`group relative overflow-hidden border-2 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-2xl cursor-pointer wildtrack-animate-slide wildtrack-animate-delay-${index + 1}`}
                onClick={() => onSelectPortal(portal.id)}
              >
                {/* Background Gradient on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${portal.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                <div className="relative p-8">
                  {/* Icon */}
                  <div className="flex items-center justify-center mb-6">
                    <div className={`w-20 h-20 bg-gradient-to-br ${portal.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <portal.icon className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center mb-6">
                    <h3 className="text-slate-900 dark:text-white mb-3">
                      {portal.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {portal.description}
                    </p>
                  </div>

                  {/* Button */}
                  <Button
                    className={`w-full bg-gradient-to-r ${portal.gradient} hover:${portal.hoverGradient} text-white shadow-lg group-hover:shadow-xl transition-all`}
                    size="lg"
                  >
                    Enter Portal
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-center">
            <div className="wildtrack-animate-slide wildtrack-animate-delay-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-green-700 dark:text-green-500" />
              </div>
              <h4 className="text-slate-900 dark:text-white mb-2">Real-Time Tracking</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Monitor trophy status from hunt to delivery
              </p>
            </div>
            <div className="wildtrack-animate-slide wildtrack-animate-delay-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950 rounded-full flex items-center justify-center mx-auto mb-4">
                <Compass className="w-6 h-6 text-amber-700 dark:text-amber-500" />
              </div>
              <h4 className="text-slate-900 dark:text-white mb-2">Unified Platform</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Seamless communication across all portals
              </p>
            </div>
            <div className="wildtrack-animate-slide wildtrack-animate-delay-5">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-blue-700 dark:text-blue-500" />
              </div>
              <h4 className="text-slate-900 dark:text-white mb-2">Secure & Compliant</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Document management and compliance tracking
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
            <p>Apex Trophy Solutions © 2025 | Secure System</p>
            <div className="flex items-center gap-4">
              <a href="#privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="#contact" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* About Dialog */}
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
