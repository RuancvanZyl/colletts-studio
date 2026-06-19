import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Progress } from '../../ui/progress';
import { ArrowLeft, ArrowRight, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

interface NewIntakeProps {
  onComplete: () => void;
}

const steps = [
  'Client',
  'Type',
  'Animals',
  'Products',
  'Photos',
  'Outfitters',
  'Review',
  'Complete'
];

export function NewIntake({ onComplete }: NewIntakeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    intakeType: '',
    species: '',
    quantity: '1',
    mountType: '',
    skinType: ''
  });

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    toast.success('Intake created successfully!');
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Search existing or enter new..."
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="client@email.com"
                className="mt-2"
              />
            </div>
            <Button variant="outline" className="w-full">
              + Create Temp Client
            </Button>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="intakeType">Intake Type *</Label>
              <Select
                value={formData.intakeType}
                onValueChange={(value) => setFormData({ ...formData, intakeType: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="species">Species *</Label>
              <Input
                id="species"
                value={formData.species}
                onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                placeholder="e.g., African Lion, Cape Buffalo..."
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="mountType">Mount Type *</Label>
              <Select
                value={formData.mountType}
                onValueChange={(value) => setFormData({ ...formData, mountType: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select mount type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shoulder">Shoulder Mount</SelectItem>
                  <SelectItem value="full">Full Body</SelectItem>
                  <SelectItem value="skull">Skull Mount</SelectItem>
                  <SelectItem value="european">European Mount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="skinType">Skin Type</Label>
              <Select
                value={formData.skinType}
                onValueChange={(value) => setFormData({ ...formData, skinType: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select skin type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cape">Cape</SelectItem>
                  <SelectItem value="full">Full Skin</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
              <p className="text-slate-600 mb-4">Drag and drop photos here</p>
              <Button variant="outline">Browse Files</Button>
            </div>
            <p className="text-slate-600">Optional: Add photos and measurements</p>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="outfitter">Outfitter (Optional)</Label>
              <Input
                id="outfitter"
                placeholder="Search outfitters..."
                className="mt-2"
              />
            </div>
            <Button variant="outline" className="w-full">
              + Add Outfitter
            </Button>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-slate-900">Review Intake Details</h3>
            <Card className="p-4 bg-slate-50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Client:</span>
                  <span className="text-slate-900">{formData.clientName || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Type:</span>
                  <span className="text-slate-900">{formData.intakeType || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Species:</span>
                  <span className="text-slate-900">{formData.species || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Mount Type:</span>
                  <span className="text-slate-900">{formData.mountType || 'Not set'}</span>
                </div>
              </div>
            </Card>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4 text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-slate-900">Intake Created Successfully!</h3>
            <p className="text-slate-600">Trophy ID: TRP-{Math.floor(Math.random() * 1000)}</p>
            <div className="flex gap-2 justify-center pt-4">
              <Button variant="outline">Print RFID Tags</Button>
              <Button variant="outline">Print QR Codes</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-2">New Intake</h1>
          <p className="text-slate-600">Step {currentStep + 1} of {steps.length}: {steps[currentStep]}</p>
        </div>
        <Button variant="ghost" onClick={onComplete}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Progress Bar */}
      <div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {steps.map((step, index) => (
            <span 
              key={step}
              className={`text-xs ${
                index <= currentStep ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6">
        {renderStep()}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep === steps.length - 1 ? (
          <Button onClick={handleComplete}>
            <Save className="w-4 h-4 mr-2" />
            Complete
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
