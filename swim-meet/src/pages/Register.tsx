import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, Waves } from 'lucide-react';
import { useEventCategories } from '@/lib/hooks/useEvents';
import { useRegisterSwimmer } from '@/lib/hooks/useRegistration';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea, FieldError } from '@/components/ui/input';

const schema = z.object({
  fullName: z.string().min(2, 'Enter the swimmer\'s full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female']),
  club: z.string().optional(),
  emergencyContactName: z.string().min(2, 'Required for race-day safety'),
  emergencyContactPhone: z.string().min(6, 'Required for race-day safety'),
  medicalNotes: z.string().optional(),
  waiverSigned: z.literal(true, { errorMap: () => ({ message: 'You must accept the waiver to register' }) }),
});

type FormValues = z.infer<typeof schema>;

export function Register() {
  const { eventId, categoryId } = useParams();
  const navigate = useNavigate();
  const { categories, loading } = useEventCategories(eventId);
  const { register: submitRegistration, submitting, error } = useRegisterSwimmer();
  const [serverError, setServerError] = useState<string | null>(null);

  const category = categories.find((c) => c.id === categoryId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'male' },
  });

  async function onSubmit(values: FormValues) {
    if (!eventId || !categoryId) return;
    setServerError(null);
    const result = await submitRegistration({
      eventId,
      categoryId,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      club: values.club ?? '',
      emergencyContactName: values.emergencyContactName,
      emergencyContactPhone: values.emergencyContactPhone,
      medicalNotes: values.medicalNotes ?? '',
      waiverSigned: values.waiverSigned,
    });
    if (result) {
      navigate(`/confirmation/${result.registration_id}`);
    } else if (error) {
      setServerError(error);
    }
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/90 mb-6">
          <ChevronLeft className="size-4" /> Back to events
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-ocean-400 mb-1">
              <Waves className="size-5" />
              <span className="text-xs font-medium uppercase tracking-wide">Race entry</span>
            </div>
            <CardTitle className="text-2xl">{loading ? 'Loading…' : category?.name ?? 'Race not found'}</CardTitle>
            {category && (
              <CardDescription>
                {category.distance_m >= 1000 ? `${category.distance_m / 1000}km` : `${category.distance_m}m`} open water
                {category.gender_restriction ? ` · ${category.gender_restriction} only` : ''}
                {category.entry_fee > 0 ? ` · R${category.entry_fee.toFixed(0)} entry fee` : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {category && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" {...register('fullName')} placeholder="Jane Swimmer" />
                  <FieldError>{errors.fullName?.message}</FieldError>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register('email')} placeholder="jane@example.com" />
                    <FieldError>{errors.email?.message}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...register('phone')} placeholder="082 000 0000" />
                    <FieldError>{errors.phone?.message}</FieldError>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="dateOfBirth">Date of birth</Label>
                    <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                    <FieldError>{errors.dateOfBirth?.message}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select id="gender" {...register('gender')}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="club">Club / team (optional)</Label>
                  <Input id="club" {...register('club')} placeholder="e.g. Seal Point Masters" />
                </div>

                <div className="pt-2 border-t border-white/[0.07]">
                  <p className="text-sm font-medium text-white/80 mb-3">Emergency contact — required for open water</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="emergencyContactName">Name</Label>
                      <Input id="emergencyContactName" {...register('emergencyContactName')} />
                      <FieldError>{errors.emergencyContactName?.message}</FieldError>
                    </div>
                    <div>
                      <Label htmlFor="emergencyContactPhone">Phone</Label>
                      <Input id="emergencyContactPhone" {...register('emergencyContactPhone')} />
                      <FieldError>{errors.emergencyContactPhone?.message}</FieldError>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="medicalNotes">Medical notes (optional)</Label>
                  <Textarea id="medicalNotes" rows={2} {...register('medicalNotes')} placeholder="Allergies, conditions, medication…" />
                </div>

                <label className="flex items-start gap-2.5 text-sm text-white/70 pt-1">
                  <input type="checkbox" className="mt-0.5 size-4 accent-ocean-500" {...register('waiverSigned')} />
                  <span>
                    I confirm the swimmer is medically fit for open water swimming and accept the event's liability
                    waiver and safety rules.
                  </span>
                </label>
                <FieldError>{errors.waiverSigned?.message}</FieldError>

                {serverError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
                    {serverError}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" loading={submitting}>
                  Confirm registration
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
