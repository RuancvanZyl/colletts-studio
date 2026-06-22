import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/auth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, Trophy, Compass, User, Package, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface LoginScreenProps {
  onLogin: () => void;
  onBack: () => void;
  portalType?: 'admin' | 'hunter' | 'outfitter' | 'taxidermy';
  onPortalChange?: (portal: 'admin' | 'hunter' | 'outfitter' | 'taxidermy') => void;
  onRegister?: () => void;
}

export function LoginScreen({ 
  onLogin, 
  onBack, 
  portalType = 'hunter',
  onPortalChange,
  onRegister
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      onLogin();
    }
  };

  const getPortalConfig = () => {
    switch (portalType) {
      case 'outfitter':
        return {
          icon: Compass,
          title: 'Outfitter Portal',
          gradient: 'from-amber-600 to-orange-600',
          hoverGradient: 'from-amber-700 to-orange-700',
          bgGradient: 'from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950 dark:via-orange-950 dark:to-amber-900',
          borderColor: 'border-amber-200 dark:border-amber-800',
        };
      case 'hunter':
        return {
          icon: User,
          title: 'Hunter Portal',
          gradient: 'from-green-600 to-lime-600',
          hoverGradient: 'from-green-700 to-lime-700',
          bgGradient: 'from-green-50 via-lime-50 to-green-100 dark:from-green-950 dark:via-lime-950 dark:to-green-900',
          borderColor: 'border-green-200 dark:border-green-800',
        };
      case 'taxidermy':
      case 'admin':
        return {
          icon: Package,
          title: 'Taxidermy Portal',
          gradient: 'from-blue-600 to-cyan-600',
          hoverGradient: 'from-blue-700 to-cyan-700',
          bgGradient: 'from-blue-50 via-cyan-50 to-blue-100 dark:from-blue-950 dark:via-cyan-950 dark:to-blue-900',
          borderColor: 'border-blue-200 dark:border-blue-800',
        };
      default:
        return {
          icon: User,
          title: 'Hunter Portal',
          gradient: 'from-green-600 to-lime-600',
          hoverGradient: 'from-green-700 to-lime-700',
          bgGradient: 'from-green-50 via-lime-50 to-green-100 dark:from-green-950 dark:via-lime-950 dark:to-green-900',
          borderColor: 'border-green-200 dark:border-green-800',
        };
    }
  };

  const config = getPortalConfig();
  const PortalIcon = config.icon;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTItMTRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>

      <div className="relative z-10 max-w-md w-full space-y-6">
        {/* Top Actions */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
        </div>

        {/* Header */}
        <div className="text-center wildtrack-animate-fade">
          <div className={`w-20 h-20 bg-gradient-to-br ${config.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl`}>
            <PortalIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl text-slate-900 dark:text-white mb-2">
            Welcome to Apex Trophy Solutions
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Please sign in to access your portal
          </p>
        </div>
        
        {/* Login Card */}
        <Card className={`p-8 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-2 ${config.borderColor} shadow-2xl wildtrack-animate-slide wildtrack-animate-delay-1`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Portal Selector */}
            {onPortalChange && (
              <div className="space-y-2">
                <Label htmlFor="portal">Select Portal</Label>
                <Select
                  value={portalType}
                  onValueChange={(value) => onPortalChange(value as any)}
                >
                  <SelectTrigger id="portal">
                    <SelectValue placeholder="Select portal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hunter">Hunter Portal</SelectItem>
                    <SelectItem value="outfitter">Outfitter Portal</SelectItem>
                    <SelectItem value="taxidermy">Taxidermy Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="h-12"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12"
                required
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <Button variant="link" type="button" className="text-sm p-0 h-auto">
                Forgot password?
              </Button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={submitting}
              className={`w-full h-12 bg-gradient-to-r ${config.gradient} hover:${config.hoverGradient} text-white shadow-lg hover:shadow-xl transition-all`}
              size="lg"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </Button>

            {/* Register Link */}
            {onRegister && (
              <div className="text-center pt-4 border-t border-stone-200 dark:border-stone-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Don't have an account?{' '}
                  <Button 
                    variant="link" 
                    type="button" 
                    onClick={onRegister}
                    className="p-0 h-auto"
                  >
                    Register here
                  </Button>
                </p>
              </div>
            )}
          </form>
        </Card>

        {/* Footer Info */}
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Protected by Apex Trophy Solutions secure authentication
        </p>
      </div>
    </div>
  );
}
