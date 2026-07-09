import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ResetPasswordScreenProps {
  onDone: () => void;
}

export function ResetPasswordScreen({ onDone }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password updated! You are now logged in.');
    onDone();
  };

  return (
    <div className="min-h-screen bg-[#080C0C] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src="/apex-logo.png" alt="Apex Trophy Solutions" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-[0_0_30px_rgba(58,174,204,0.3)]" />
          <h1 className="text-xl font-bold text-white tracking-widest">SET NEW PASSWORD</h1>
          <p className="text-[#7AADB8] text-sm mt-2">Choose a new password for your account</p>
        </div>

        <div className="bg-[#0F1A1C] border border-[rgba(58,174,204,0.2)] rounded-2xl p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[#7AADB8] text-xs uppercase tracking-wider">New Password</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-[#142028] border-[rgba(58,174,204,0.2)] text-[#EDF6F9] placeholder:text-[#4a7a8a] focus:border-[#3AAECC]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#7AADB8] text-xs uppercase tracking-wider">Confirm Password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-[#142028] border-[rgba(58,174,204,0.2)] text-[#EDF6F9] placeholder:text-[#4a7a8a] focus:border-[#3AAECC]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-[#3AAECC] hover:bg-[#2E9EB8] text-[#080C0C] font-bold text-sm tracking-wider transition-all disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'SET NEW PASSWORD'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
