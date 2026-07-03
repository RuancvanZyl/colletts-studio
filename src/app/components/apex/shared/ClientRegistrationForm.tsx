/**
 * ClientRegistrationForm — used in two places:
 *  1. Hunter Portal self-registration (public, no auth required)
 *  2. Staff "Add New Client" in ClientManagement (staff-authenticated)
 *
 * Steps:
 *  1. Personal details (name, contact, nationality, passport)
 *  2. Addresses (residential + delivery)
 *  3. Document upload (passport / ID copy)
 *  4. Profile photo
 *  5. Review & submit
 */

import { useState, useRef } from 'react';
import { useAuth } from '../../../../lib/auth';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'sonner';
import {
  User, Phone, Mail, MapPin, FileText, Camera, CheckCircle2,
  ArrowLeft, ArrowRight, Loader2, Upload, X, Globe, CreditCard,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  first_name:          string;
  last_name:           string;
  email:               string;
  cell:                string;
  country:             string;
  nationality:         string;
  passport_number:     string;
  passport_expiry:     string;
  residential_address: string;
  delivery_address:    string;
  delivery_same:       boolean;
  client_type:         'export' | 'local';
  notes:               string;
}

const EMPTY: FormData = {
  first_name:          '',
  last_name:           '',
  email:               '',
  cell:                '',
  country:             '',
  nationality:         '',
  passport_number:     '',
  passport_expiry:     '',
  residential_address: '',
  delivery_address:    '',
  delivery_same:       true,
  client_type:         'export',
  notes:               '',
};

export interface ClientRegistrationFormProps {
  onComplete: (clientId: string) => void;
  onBack?: () => void;
  staffMode?: boolean;      // true = staff creating client, false = hunter self-registering
  initialData?: Partial<FormData>;
}

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 'personal',  label: 'Personal',  icon: User },
  { id: 'address',   label: 'Address',   icon: MapPin },
  { id: 'passport',  label: 'Passport',  icon: FileText },
  { id: 'photo',     label: 'Photo',     icon: Camera },
  { id: 'review',    label: 'Confirm',   icon: CheckCircle2 },
];

// ── Main component ────────────────────────────────────────────────────────────

export function ClientRegistrationForm({ onComplete, onBack, staffMode = false, initialData }: ClientRegistrationFormProps) {
  const { user } = useAuth();
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState<FormData>({ ...EMPTY, ...initialData });
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [profileFile, setProfileFile]   = useState<File | null>(null);
  const [profilePreview, setProfilePreview]   = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<Partial<Record<keyof FormData, string>>>({});

  const passportRef = useRef<HTMLInputElement>(null);
  const profileRef  = useRef<HTMLInputElement>(null);

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateStep(s: number): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (s === 0) {
      if (!form.first_name.trim()) errs.first_name = 'Required';
      if (!form.last_name.trim())  errs.last_name  = 'Required';
      if (!form.email.trim())      errs.email = 'Required';
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
      if (!form.cell.trim())       errs.cell = 'Required';
    }
    if (s === 1) {
      if (!form.residential_address.trim()) errs.residential_address = 'Required';
      if (!form.delivery_same && !form.delivery_address.trim()) errs.delivery_address = 'Required';
    }
    if (s === 2) {
      if (!form.passport_number.trim()) errs.passport_number = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1));
  }
  function prev() { setStep(s => Math.max(s - 1, 0)); }

  // ── File handlers ───────────────────────────────────────────────────────────

  function pickPassport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPassportFile(file);
    setPassportPreview(URL.createObjectURL(file));
  }

  function pickProfile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function submit() {
    setSaving(true);
    try {
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();

      // 1. Insert client record
      const { data: client, error: clientErr } = await (supabase as any)
        .from('clients')
        .insert({
          first_name:           form.first_name.trim(),
          last_name:            form.last_name.trim(),
          full_name:            fullName,
          email:                form.email.trim() || null,
          phone:                form.cell.trim() || null,
          cell:                 form.cell.trim() || null,
          country:              form.country.trim() || null,
          nationality:          form.nationality.trim() || null,
          passport_number:      form.passport_number.trim() || null,
          passport_expiry:      form.passport_expiry || null,
          address:              form.residential_address.trim() || null,
          residential_address:  form.residential_address.trim() || null,
          delivery_address:     form.delivery_same
                                  ? form.residential_address.trim()
                                  : form.delivery_address.trim(),
          client_type:          form.client_type,
          notes:                form.notes.trim() || null,
          registration_complete: true,
          registered_at:         new Date().toISOString(),
          onboarding_status:    'in_progress',
          // Link to Supabase auth user when hunter self-registers
          auth_user_id:         !staffMode && user?.id ? user.id : undefined,
        })
        .select()
        .single();

      if (clientErr) throw new Error(clientErr.message);

      const clientId = client.id;

      // 2. Upload passport copy
      if (passportFile) {
        const ext  = passportFile.name.split('.').pop();
        const path = `passports/${clientId}/passport.${ext}`;
        const { error: upErr } = await (supabase as any).storage
          .from('client-documents')
          .upload(path, passportFile, { upsert: true });
        if (!upErr) {
          await (supabase as any).from('clients').update({ passport_copy_path: path }).eq('id', clientId);
        }
      }

      // 3. Upload profile photo
      if (profileFile) {
        const ext  = profileFile.name.split('.').pop();
        const path = `profiles/${clientId}/profile.${ext}`;
        const { error: upErr } = await (supabase as any).storage
          .from('client-photos')
          .upload(path, profileFile, { upsert: true });
        if (!upErr) {
          await (supabase as any).from('clients').update({ profile_photo_path: path }).eq('id', clientId);
        }
      }

      // 4. Send confirmation email via Supabase Edge Function (if available)
      if (form.email) {
        await (supabase as any).functions.invoke('send-client-welcome', {
          body: { clientId, email: form.email, name: form.first_name },
        }).catch(() => null); // non-fatal — email is nice-to-have
      }

      toast.success(`${fullName} registered successfully`);
      onComplete(clientId);
    } catch (err: any) {
      toast.error('Registration failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const currentStep = STEPS[step];

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const curr = i === step;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex flex-col items-center gap-1 flex-1 ${i === 0 ? '' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  done ? 'bg-green-500 text-white' :
                  curr ? 'bg-[#0073ea] text-white ring-4 ring-[#0073ea]/20' :
                         'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-medium ${curr ? 'text-[#0073ea]' : done ? 'text-green-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-4 rounded ${i < step ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4">

        {/* ── Step 0: Personal ── */}
        {step === 0 && (
          <>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0073ea]" /> Personal Details
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name *" error={errors.first_name}>
                <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
              </Field>
              <Field label="Last Name *" error={errors.last_name}>
                <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
              </Field>
            </div>

            <Field label="Email Address *" error={errors.email} icon={<Mail className="w-3.5 h-3.5" />}>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
            </Field>

            <Field label="Cell / WhatsApp *" error={errors.cell} icon={<Phone className="w-3.5 h-3.5" />}>
              <Input type="tel" value={form.cell} onChange={e => set('cell', e.target.value)} placeholder="+27 82 123 4567" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Country" icon={<Globe className="w-3.5 h-3.5" />}>
                <Input value={form.country} onChange={e => set('country', e.target.value)} placeholder="United States" />
              </Field>
              <Field label="Nationality">
                <Input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="American" />
              </Field>
            </div>

            {/* Client type — only staff sets this */}
            {staffMode && (
              <Field label="Client Type">
                <div className="flex gap-2">
                  {(['export','local'] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => set('client_type', t)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                        form.client_type === t
                          ? 'bg-[#0073ea] text-white border-[#0073ea]'
                          : 'border-slate-200 text-slate-600 hover:border-[#0073ea]'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}

        {/* ── Step 1: Addresses ── */}
        {step === 1 && (
          <>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0073ea]" /> Addresses
            </h2>

            <Field label="Residential Address *" error={errors.residential_address}>
              <Textarea
                value={form.residential_address}
                onChange={e => set('residential_address', e.target.value)}
                placeholder="Street, City, Province, Postal Code, Country"
                className="h-20 resize-none"
              />
            </Field>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => set('delivery_same', !form.delivery_same)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  form.delivery_same ? 'bg-[#0073ea] border-[#0073ea]' : 'border-slate-300'
                }`}>
                {form.delivery_same && <CheckCircle2 className="w-3 h-3 text-white" />}
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">Delivery address is the same as residential</span>
            </div>

            {!form.delivery_same && (
              <Field label="Delivery Address *" error={errors.delivery_address}>
                <Textarea
                  value={form.delivery_address}
                  onChange={e => set('delivery_address', e.target.value)}
                  placeholder="Where should finished trophies be delivered?"
                  className="h-20 resize-none"
                />
              </Field>
            )}

            <Field label="Notes / Special Requirements">
              <Textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any special instructions for delivery or handling…"
                className="h-16 resize-none"
              />
            </Field>
          </>
        )}

        {/* ── Step 2: Passport / ID ── */}
        {step === 2 && (
          <>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0073ea]" /> Passport / ID
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Passport / ID Number *" error={errors.passport_number}>
                <Input value={form.passport_number} onChange={e => set('passport_number', e.target.value)} placeholder="AA123456" />
              </Field>
              <Field label="Expiry Date">
                <Input type="date" value={form.passport_expiry} onChange={e => set('passport_expiry', e.target.value)} />
              </Field>
            </div>

            <Field label="Upload Passport / ID Copy">
              {passportPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={passportPreview} alt="Passport" className="w-full h-40 object-cover" />
                  <button onClick={() => { setPassportFile(null); setPassportPreview(null); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Uploaded
                  </div>
                </div>
              ) : (
                <button onClick={() => passportRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-[#0073ea] hover:text-[#0073ea] transition-colors">
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Tap to upload passport or ID</span>
                  <span className="text-xs">JPG, PNG or PDF</span>
                </button>
              )}
              <input ref={passportRef} type="file" accept="image/*,.pdf" capture="environment"
                className="hidden" onChange={pickPassport} />
            </Field>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Your passport copy is required for CITES documentation and export permits. It is stored securely and never shared without your consent.
              </p>
            </div>
          </>
        )}

        {/* ── Step 3: Profile Photo ── */}
        {step === 3 && (
          <>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#0073ea]" /> Profile Photo
            </h2>
            <p className="text-sm text-slate-500">Optional — helps staff identify you on arrival at the farm.</p>

            <div className="flex flex-col items-center gap-4 py-4">
              {profilePreview ? (
                <div className="relative">
                  <img src={profilePreview} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-[#0073ea]/30" />
                  <button onClick={() => { setProfileFile(null); setProfilePreview(null); }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <User className="w-16 h-16 text-slate-300" />
                </div>
              )}
              <button onClick={() => profileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#0073ea] text-[#0073ea] text-sm font-medium hover:bg-[#0073ea]/10 transition-colors">
                <Camera className="w-4 h-4" />
                {profilePreview ? 'Change photo' : 'Take / upload photo'}
              </button>
              <input ref={profileRef} type="file" accept="image/*" capture="user"
                className="hidden" onChange={pickProfile} />
            </div>
          </>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0073ea]" /> Review & Confirm
            </h2>

            <div className="space-y-3 text-sm">
              {/* Profile photo preview */}
              {profilePreview && (
                <div className="flex justify-center mb-2">
                  <img src={profilePreview} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-[#0073ea]/30" />
                </div>
              )}

              <ReviewRow label="Name"     value={`${form.first_name} ${form.last_name}`} />
              <ReviewRow label="Email"    value={form.email} />
              <ReviewRow label="Cell"     value={form.cell} />
              <ReviewRow label="Country"  value={form.country} />
              <ReviewRow label="Passport" value={`${form.passport_number}${form.passport_expiry ? ` (exp. ${form.passport_expiry})` : ''}`} />
              <ReviewRow label="Residential" value={form.residential_address} />
              <ReviewRow label="Delivery"    value={form.delivery_same ? 'Same as residential' : form.delivery_address} />
              {passportFile && (
                <ReviewRow label="Passport Doc" value={passportFile.name} ok />
              )}
              {form.notes && <ReviewRow label="Notes" value={form.notes} />}
            </div>

            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-3">
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                By submitting you confirm all details are correct. A confirmation email will be sent to {form.email || 'your email address'}.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 ? (
          <Button variant="outline" onClick={prev} className="flex-1 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        ) : onBack ? (
          <Button variant="outline" onClick={onBack} className="flex-1 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        ) : null}

        {step < STEPS.length - 1 ? (
          <Button onClick={next} className="flex-1 bg-[#0073ea] hover:bg-[#0060c7] text-white gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Registering…</> :
              <><CheckCircle2 className="w-4 h-4" />Complete Registration</>}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Field({ label, error, icon, children }: {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className={`text-xs font-semibold ${error ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'} flex items-center gap-1`}>
        {icon} {label}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ReviewRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-slate-400 w-24 shrink-0 text-xs font-medium">{label}</span>
      <span className={`flex-1 text-slate-800 dark:text-slate-200 text-sm ${ok ? 'text-green-600 flex items-center gap-1' : ''}`}>
        {ok && <CheckCircle2 className="w-3.5 h-3.5" />}
        {value || <span className="text-slate-300">—</span>}
      </span>
    </div>
  );
}
