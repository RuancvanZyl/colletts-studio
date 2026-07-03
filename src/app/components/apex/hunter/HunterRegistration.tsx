import { CheckCircle2, Mail } from 'lucide-react';
import { useState } from 'react';
import { ClientRegistrationForm } from '../../apex/shared/ClientRegistrationForm';

interface HunterRegistrationProps {
  onComplete: () => void;
  onBack: () => void;
}

export function HunterRegistration({ onComplete, onBack }: HunterRegistrationProps) {
  const [done, setDone]     = useState(false);
  const [email, setEmail]   = useState('');

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">You're registered!</h1>
            <p className="text-slate-500 mt-2">
              Welcome to Apex Trophy Solutions. Your profile has been created and our team has been notified.
            </p>
          </div>
          {email && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300 text-left">
                A confirmation email has been sent to <strong>{email}</strong> with your registration details.
              </p>
            </div>
          )}
          <p className="text-sm text-slate-400">
            Your outfitter will link your hunt to your profile. You will receive updates as your trophies move through the workshop.
          </p>
          <button onClick={onComplete}
            className="w-full py-3 rounded-xl bg-[#0073ea] text-white font-bold hover:bg-[#0060c7] transition-colors">
            Continue to my profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-lg mx-auto mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create your client profile</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Fill in your details so Apex Trophy Solutions can manage your trophies and keep you updated.
        </p>
      </div>
      <ClientRegistrationForm
        staffMode={false}
        onBack={onBack}
        onComplete={(_clientId) => {
          setDone(true);
        }}
      />
    </div>
  );
}
