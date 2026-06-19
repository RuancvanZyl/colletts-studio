import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card } from '../../ui/card';
import { Checkbox } from '../../ui/checkbox';
import { Upload, FileText, CheckCircle, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface HunterRegistrationProps {
  onComplete: () => void;
  onBack: () => void;
}

export function HunterRegistration({ onComplete, onBack }: HunterRegistrationProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    countryCode: '+1',
    country: '',
    idNumber: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    shippingCountry: '',
  });
  
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdDocument(e.target.files[0]);
      toast.success('Document uploaded successfully');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!idDocument) {
      toast.error('Please upload your ID or Passport');
      return;
    }
    
    if (!agreedToTerms) {
      toast.error('Please confirm that all information is correct');
      return;
    }

    toast.success('Registration submitted for verification');
    onComplete();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'South Africa',
    'Namibia', 'Zimbabwe', 'Tanzania', 'Botswana', 'New Zealand', 'Argentina'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-green-50/30 to-stone-100 dark:from-stone-950 dark:via-green-950/20 dark:to-stone-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-700 to-lime-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-slate-900 dark:text-white mb-2">Register as a Hunter</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Complete your profile to start tracking your trophies
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                  1
                </div>
                <span className="text-sm text-slate-900 dark:text-white">Registration</span>
              </div>
              <div className="w-12 h-0.5 bg-stone-300 dark:bg-stone-700"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-stone-300 dark:bg-stone-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 text-sm">
                  2
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Verification</span>
              </div>
              <div className="w-12 h-0.5 bg-stone-300 dark:bg-stone-700"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-stone-300 dark:bg-stone-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 text-sm">
                  3
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Get Started</span>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <Card className="p-8 bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-slate-900 dark:text-white mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="John Smith"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="john@example.com"
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="flex gap-2 mt-1">
                        <select
                          value={formData.countryCode}
                          onChange={(e) => handleInputChange('countryCode', e.target.value)}
                          className="w-24 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                        >
                          <option value="+1">+1</option>
                          <option value="+27">+27</option>
                          <option value="+44">+44</option>
                          <option value="+61">+61</option>
                          <option value="+64">+64</option>
                        </select>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="555-0123"
                          required
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country of Residence *</Label>
                      <select
                        id="country"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        required
                        className="w-full mt-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                      >
                        <option value="">Select Country</option>
                        {countries.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="idNumber">ID Number / Passport Number *</Label>
                      <Input
                        id="idNumber"
                        value={formData.idNumber}
                        onChange={(e) => handleInputChange('idNumber', e.target.value)}
                        placeholder="A1234567"
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ID Document Upload */}
              <div>
                <Label>Upload Passport or ID Copy *</Label>
                <div className="mt-2">
                  <label
                    htmlFor="id-upload"
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg cursor-pointer bg-stone-50 dark:bg-stone-900/50 hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    {idDocument ? (
                      <div className="flex flex-col items-center gap-2 text-green-600 dark:text-green-500">
                        <CheckCircle className="w-12 h-12" />
                        <p className="text-sm">{idDocument.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {(idDocument.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Upload className="w-12 h-12" />
                        <p className="text-sm">Click to upload or drag and drop</p>
                        <p className="text-xs">PDF, JPG, PNG (Max 10MB)</p>
                      </div>
                    )}
                    <input
                      id="id-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="text-slate-900 dark:text-white mb-4">Shipping Address</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      placeholder="123 Main Street"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Denver"
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="province">Province / State *</Label>
                      <Input
                        id="province"
                        value={formData.province}
                        onChange={(e) => handleInputChange('province', e.target.value)}
                        placeholder="Colorado"
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        placeholder="80202"
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingCountry">Country *</Label>
                      <select
                        id="shippingCountry"
                        value={formData.shippingCountry}
                        onChange={(e) => handleInputChange('shippingCountry', e.target.value)}
                        required
                        className="w-full mt-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                      >
                        <option value="">Select Country</option>
                        {countries.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer">
                  I confirm all information is correct and consent to data storage for trophy tracking and shipping purposes.
                </Label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                >
                  Back to Login
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-700 to-lime-600 hover:from-green-800 hover:to-lime-700 text-white"
                >
                  Submit Registration
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
