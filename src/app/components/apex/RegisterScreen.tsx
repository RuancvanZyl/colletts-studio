import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { ArrowLeft, Compass, User, Package, Upload, Loader2 } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { createClientRecord } from '../../../lib/hooks/useHunterSelfService';

interface RegisterScreenProps {
  onBack: () => void;
  onRegisterComplete: () => void;
  portalType?: 'hunter' | 'outfitter' | 'taxidermy';
}

export function RegisterScreen({ 
  onBack, 
  onRegisterComplete,
  portalType = 'hunter'
}: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    company: '',
    licenceNumber: '',
    agreeToTerms: false,
  });
  const [clientType, setClientType] = useState<'local' | 'export'>('export');
  const { theme } = useTheme();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 10) {
      toast.error('Password must be at least 10 characters');
      return;
    }

    if (!formData.agreeToTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setSubmitting(true);
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const { data: authData, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: fullName,
          phone: formData.phone,
          portal_type: portalType,
          client_type: portalType === 'hunter' ? clientType : undefined,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Create client record immediately for hunters
    if (portalType === 'hunter' && authData.user) {
      await createClientRecord(
        authData.user.id,
        fullName,
        formData.email,
        formData.phone,
        clientType,
      );
    }

    // Fire welcome email — fire-and-forget, never blocks registration
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-client-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
      }),
    }).catch(() => {});

    toast.success('Account created! Please check your email and click the confirmation link before logging in.');
    onRegisterComplete();
  };

  const getPortalConfig = () => {
    switch (portalType) {
      case 'outfitter':
        return {
          icon: Compass,
          title: 'Outfitter Registration',
          description: 'Register your outfitting business',
          gradient: 'from-amber-600 to-orange-600',
          hoverGradient: 'from-amber-700 to-orange-700',
          bgGradient: 'from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950 dark:via-orange-950 dark:to-amber-900',
          borderColor: 'border-amber-200 dark:border-amber-800',
        };
      case 'taxidermy':
        return {
          icon: Package,
          title: 'Taxidermy Workshop Registration',
          description: 'Register your taxidermy workshop',
          gradient: 'from-blue-600 to-cyan-600',
          hoverGradient: 'from-blue-700 to-cyan-700',
          bgGradient: 'from-blue-50 via-cyan-50 to-blue-100 dark:from-blue-950 dark:via-cyan-950 dark:to-blue-900',
          borderColor: 'border-blue-200 dark:border-blue-800',
        };
      default:
        return {
          icon: User,
          title: 'Hunter Registration',
          description: 'Create your hunter account',
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

      <div className="relative z-10 max-w-2xl w-full space-y-6 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Button>

        {/* Header */}
        <div className="text-center">
          <div className={`w-20 h-20 bg-gradient-to-br ${config.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl`}>
            <PortalIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl text-slate-900 dark:text-white mb-2">
            {config.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {config.description}
          </p>
        </div>
        
        {/* Registration Card */}
        <Card className={`p-8 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-2 ${config.borderColor} shadow-2xl`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hunt type — hunters only */}
            {portalType === 'hunter' && (
              <div className="space-y-3">
                <h3 className="text-slate-900 dark:text-white">Hunt Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['local', 'export'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setClientType(t)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        clientType === t
                          ? 'border-[#0073ea] bg-blue-50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 capitalize">{t}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t === 'local' ? 'Trophies stay in South Africa' : 'Trophies shipped internationally'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-slate-900 dark:text-white">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
            </div>

            {/* Business Information (for Outfitter/Taxidermy) */}
            {(portalType === 'outfitter' || portalType === 'taxidermy') && (
              <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                <h3 className="text-slate-900 dark:text-white">Business Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Your Business Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licence">Licence Number</Label>
                  <Input
                    id="licence"
                    value={formData.licenceNumber}
                    onChange={(e) => setFormData({ ...formData, licenceNumber: e.target.value })}
                    placeholder="ABC-12345"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documents">Upload Business Documents</Label>
                  <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-6 text-center hover:border-stone-400 dark:hover:border-stone-600 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      PDF, JPG, PNG up to 10MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-700">
              <h3 className="text-slate-900 dark:text-white">Security</h3>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-2 pt-4">
              <Checkbox 
                id="terms" 
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked as boolean })}
              />
              <Label 
                htmlFor="terms" 
                className="text-sm cursor-pointer leading-relaxed"
              >
                I agree to the{' '}
                <a href="#terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="#privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Privacy Policy
                </a>
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className={`w-full h-12 bg-gradient-to-r ${config.gradient} hover:${config.hoverGradient} text-white shadow-lg hover:shadow-xl transition-all`}
              size="lg"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Account…</> : 'Create Account'}
            </Button>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-stone-200 dark:border-stone-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <Button 
                  variant="link" 
                  type="button" 
                  onClick={onBack}
                  className="p-0 h-auto"
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
