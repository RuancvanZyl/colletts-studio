import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
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
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Staff sign in with their own email + password — no workshop PIN.
  const isStaffPortal = portalType === 'taxidermy' || portalType === 'admin';

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
    <div className="min-h-screen bg-[#080C0C] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Subtle teal glow behind logo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#3AAECC]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-[#1E7A96]/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm space-y-8">

        {/* Logo + wordmark */}
        <div className="text-center wildtrack-animate-fade">
          <img
            src="/apex-logo.png"
            alt="Apex Trophy Solutions"
            className="w-28 h-28 object-contain mx-auto mb-5 drop-shadow-[0_0_30px_rgba(58,174,204,0.3)]"
          />
          <h1 className="text-2xl font-bold tracking-[0.25em] text-white mb-1">APEX</h1>
          <p className="text-[#3AAECC] text-xs tracking-[0.3em] uppercase">Trophy Solutions</p>
          <p className="text-[#7AADB8] text-sm mt-3">
            {isStaffPortal ? 'Sign in to the workshop' : 'Sign in to your workspace'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0F1A1C] border border-[rgba(58,174,204,0.2)] rounded-2xl p-7 shadow-2xl wildtrack-animate-slide wildtrack-animate-delay-1">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Portal Selector */}
            {onPortalChange && !isStaffPortal && (
              <div className="space-y-1.5">
                <Label className="text-[#7AADB8] text-xs uppercase tracking-wider">Portal</Label>
                <Select value={portalType} onValueChange={(value) => onPortalChange(value as any)}>
                  <SelectTrigger className="bg-[#142028] border-[rgba(58,174,204,0.2)] text-[#EDF6F9] h-11">
                    <SelectValue placeholder="Select portal" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F1A1C] border-[rgba(58,174,204,0.2)]">
                    <SelectItem value="hunter">Hunter Portal</SelectItem>
                    <SelectItem value="outfitter">Outfitter Portal</SelectItem>
                    <SelectItem value="taxidermy">Staff / Taxidermy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Staff badge */}
            {isStaffPortal && (
              <div className="flex items-center gap-2 bg-[#3AAECC]/10 border border-[#3AAECC]/20 rounded-lg px-3 py-2">
                <Package className="w-4 h-4 text-[#3AAECC]" />
                <span className="text-xs text-[#3AAECC] font-medium tracking-wide">MANAGEMENT &amp; WORKSHOP</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#7AADB8] text-xs uppercase tracking-wider">Email</Label>
              <input
                ref={emailInputRef}
                autoComplete="email"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-11 w-full rounded-lg border bg-[#142028] border-[rgba(58,174,204,0.2)] text-[#EDF6F9] placeholder:text-[#4a7a8a] focus:border-[#3AAECC] focus:outline-none px-3 text-sm"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#7AADB8] text-xs uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className="h-11 pr-16 bg-[#142028] border-[rgba(58,174,204,0.2)] text-[#EDF6F9] placeholder:text-[#4a7a8a] focus:border-[#3AAECC]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 px-3 text-sm font-semibold text-[#3AAECC]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-[#3AAECC] hover:bg-[#2E9EB8] text-[#080C0C] font-bold text-sm tracking-wider transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(58,174,204,0.3)] hover:shadow-[0_0_30px_rgba(58,174,204,0.4)]"
            >
              {submitting ? 'Signing in…' : 'SIGN IN'}
            </button>

            {/* Forgot Password */}
            <p className="text-center text-xs text-[#7AADB8]">
              {forgotSent ? (
                <span className="text-green-400">Reset email sent — check your inbox</span>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const addr = email.trim();
                    if (!addr) { toast.error('Enter your email first'); return; }
                    const { error } = await supabase.auth.resetPasswordForEmail(addr, {
                      redirectTo: window.location.origin,
                    });
                    if (error) {
                      // Do not claim success when the email was not sent
                      toast.error(
                        /rate|limit|seconds/i.test(error.message)
                          ? 'Too many reset emails were sent recently. Wait about an hour, or ask the admin to reset your password.'
                          : `Could not send the reset email: ${error.message}`,
                        { duration: 12000 }
                      );
                      return;
                    }
                    setForgotSent(true);
                    toast.success('If that email has an account, a reset link is on its way. Open the newest email straight away.');
                  }}
                  className="text-[#3AAECC] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </p>

            {/* Register Link — hunters only */}
            {onRegister && !isStaffPortal && (
              <p className="text-center text-xs text-[#7AADB8]">
                Don't have an account?{' '}
                <button type="button" onClick={onRegister} className="text-[#3AAECC] hover:underline font-medium">
                  Register here
                </button>
              </p>
            )}
          </form>
        </div>

        {/* Back + footer */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#7AADB8] hover:text-[#EDF6F9] text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <p className="text-[#4a6a75] text-xs">
            Secure authentication
          </p>
        </div>

      </div>
    </div>
  );
}
