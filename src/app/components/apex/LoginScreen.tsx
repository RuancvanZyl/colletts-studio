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
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [mkOpen, setMkOpen] = useState(false);
  const [mkPin, setMkPin] = useState('');
  const [mkError, setMkError] = useState(false);
  const mkInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // For taxidermy portal: PIN must be verified before staff can log in.
  // Once entered correctly, the PIN is remembered on this device for 30 days.
  const isStaffPortal = portalType === 'taxidermy' || portalType === 'admin';
  const PIN_KEY = 'apex_pin_verified_until';
  const [pinVerified, setPinVerified] = useState(() => {
    const until = Number(localStorage.getItem(PIN_KEY) ?? 0);
    return until > Date.now();
  });

  const handleMasterKey = () => {
    setMkOpen(true);
    setMkPin('');
    setMkError(false);
    setTimeout(() => mkInputRef.current?.focus(), 50);
  };

  const submitMasterKey = async () => {
    const correctPin = import.meta.env.VITE_MASTER_PIN;

    if (mkPin === correctPin) {
      setMkOpen(false);
      if (isStaffPortal) {
        // PIN verified — remember for 30 days on this device
        localStorage.setItem(PIN_KEY, String(Date.now() + 30 * 24 * 3600 * 1000));
        setPinVerified(true);
        setTimeout(() => emailInputRef.current?.focus(), 100);
      } else {
        onLogin();
      }
    } else {
      setMkError(true);
      setMkPin('');
      setTimeout(() => mkInputRef.current?.focus(), 50);
    }
  };
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

  // Staff portal: show PIN gate first, then individual login
  if (isStaffPortal && !pinVerified) {
    return (
      <div className="min-h-screen bg-[#080C0C] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#3AAECC]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 w-full max-w-sm space-y-8">
          <div className="text-center">
            <img src="/apex-logo.png" alt="Apex Trophy Solutions" className="w-24 h-24 object-contain mx-auto mb-5 drop-shadow-[0_0_30px_rgba(58,174,204,0.3)]" />
            <h1 className="text-xl font-bold tracking-[0.25em] text-white mb-1">STAFF ACCESS</h1>
            <p className="text-[#3AAECC] text-xs tracking-[0.3em] uppercase">Taxidermy Workshop</p>
            <p className="text-[#7AADB8] text-sm mt-3">Enter your workshop PIN to continue</p>
          </div>
          <div className="bg-[#0F1A1C] border border-[rgba(58,174,204,0.2)] rounded-2xl p-7 shadow-2xl space-y-5">
            <input
              ref={mkInputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={mkPin}
              onChange={e => { setMkPin(e.target.value.replace(/\D/g, '')); setMkError(false); }}
              onKeyDown={e => { if (e.key === 'Enter') submitMasterKey(); }}
              placeholder="• • • •"
              className={`w-full text-center text-3xl tracking-[0.8em] border-2 rounded-xl px-4 py-4 bg-[#142028] text-white outline-none transition-colors ${
                mkError ? 'border-red-500' : 'border-[rgba(58,174,204,0.3)] focus:border-[#3AAECC]'
              }`}
              autoFocus
            />
            {mkError && <p className="text-center text-xs text-red-400 font-medium">Incorrect PIN — access denied</p>}
            <button
              onClick={submitMasterKey}
              className="w-full h-11 rounded-lg bg-[#3AAECC] hover:bg-[#2E9EB8] text-[#080C0C] font-bold text-sm tracking-wider transition-all shadow-[0_0_20px_rgba(58,174,204,0.3)]"
            >
              ENTER WORKSHOP
            </button>
          </div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#7AADB8] hover:text-[#EDF6F9] text-sm transition-colors mx-auto">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>
    );
  }

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
            {isStaffPortal ? 'Sign in with your staff account' : 'Sign in to your workspace'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0F1A1C] border border-[rgba(58,174,204,0.2)] rounded-2xl p-7 shadow-2xl wildtrack-animate-slide wildtrack-animate-delay-1">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Portal Selector — hide for staff (already PIN-gated) */}
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
                <span className="text-xs text-[#3AAECC] font-medium tracking-wide">WORKSHOP STAFF LOGIN</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-[#7AADB8] text-xs uppercase tracking-wider">Email</Label>
              <input
                ref={emailInputRef}
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
              <Label className="text-[#7AADB8] text-xs uppercase tracking-wider">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-[#142028] border-[rgba(58,174,204,0.2)] text-[#EDF6F9] placeholder:text-[#4a7a8a] focus:border-[#3AAECC]"
                required
              />
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
                    if (!email) { toast.error('Enter your email first'); return; }
                    await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: window.location.origin,
                    });
                    setForgotSent(true);
                    toast.success('Password reset email sent!');
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
            onClick={isStaffPortal ? () => setPinVerified(false) : onBack}
            className="flex items-center gap-1.5 text-[#7AADB8] hover:text-[#EDF6F9] text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isStaffPortal ? 'Back to PIN' : 'Back'}
          </button>
          <p className="text-[#4a6a75] text-xs">
            Secure authentication
            {!isStaffPortal && (
              <span
                onClick={handleMasterKey}
                className="ml-1 inline-block w-1 h-1 rounded-full bg-transparent cursor-default select-none"
                aria-hidden="true"
              />
            )}
          </p>
        </div>

        {/* PIN modal — hidden admin override for non-staff portals */}
        {mkOpen && !isStaffPortal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0F1A1C] border border-[rgba(58,174,204,0.25)] rounded-2xl shadow-2xl p-8 w-80 space-y-5">
              <div className="text-center">
                <img src="/apex-logo.png" alt="" className="w-12 h-12 object-contain mx-auto mb-3 opacity-80" />
                <h3 className="font-bold text-[#EDF6F9] text-lg tracking-wide">Master Access</h3>
                <p className="text-xs text-[#7AADB8] mt-1">Authorised personnel only</p>
              </div>
              <input
                ref={mkInputRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={mkPin}
                onChange={e => { setMkPin(e.target.value.replace(/\D/g, '')); setMkError(false); }}
                onKeyDown={e => { if (e.key === 'Enter') submitMasterKey(); if (e.key === 'Escape') setMkOpen(false); }}
                placeholder="Enter PIN"
                className={`w-full text-center text-2xl tracking-[0.5em] border-2 rounded-xl px-4 py-3 bg-[#142028] text-white outline-none transition-colors ${
                  mkError ? 'border-red-500' : 'border-[rgba(58,174,204,0.3)] focus:border-[#3AAECC]'
                }`}
              />
              {mkError && <p className="text-center text-xs text-red-400 font-medium">Incorrect PIN — access denied</p>}
              <div className="flex gap-3">
                <button onClick={() => setMkOpen(false)} className="flex-1 py-2.5 rounded-xl border border-[rgba(58,174,204,0.2)] text-sm text-[#7AADB8] hover:bg-[rgba(58,174,204,0.07)] transition-colors">
                  Cancel
                </button>
                <button onClick={submitMasterKey} className="flex-1 py-2.5 rounded-xl bg-[#3AAECC] hover:bg-[#2E9EB8] text-[#080C0C] text-sm font-bold transition-colors">
                  Unlock
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
