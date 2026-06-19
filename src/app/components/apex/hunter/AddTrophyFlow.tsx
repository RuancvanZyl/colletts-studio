import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Upload, ChevronLeft, ChevronRight, CheckCircle, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AddTrophyFlowProps {
  huntId: string;
  onComplete: (trophy: any) => void;
  onCancel: () => void;
}

export function AddTrophyFlow({ huntId, onComplete, onCancel }: AddTrophyFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  const [trophyData, setTrophyData] = useState({
    species: '',
    trophyId: '',
    gender: '',
    notes: '',
    trophyType: '',
    customDesign: '',
  });

  const [photos, setPhotos] = useState<File[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 3 - photos.length);
      setPhotos(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} photo(s) uploaded`);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const generateTrophyId = () => {
    const randomId = Math.floor(10000 + Math.random() * 90000);
    return `TRP-${new Date().getFullYear()}-${randomId}`;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!trophyData.species || !trophyData.gender) {
        toast.error('Please fill in required fields');
        return;
      }
      if (!trophyData.trophyId) {
        setTrophyData(prev => ({ ...prev, trophyId: generateTrophyId() }));
      }
      setStep(2);
    } else if (step === 2) {
      if (!trophyData.trophyType) {
        toast.error('Please select a trophy type');
        return;
      }
      setStep(3);
    }
  };

  const handleComplete = () => {
    toast.success('Trophy added successfully!');
    onComplete(trophyData);
  };

  const animalSpecies = [
    'Kudu', 'Impala', 'Springbok', 'Gemsbok', 'Eland',
    'Sable Antelope', 'Wildebeest', 'Zebra', 'Warthog',
    'Lion', 'Leopard', 'Buffalo', 'Elephant', 'Rhino'
  ];

  const trophyTypes = [
    {
      id: 'shoulder',
      name: 'Shoulder Mount',
      description: 'Head and shoulders mounted on plaque',
      icon: '🦌'
    },
    {
      id: 'fullbody',
      name: 'Full Body Mount',
      description: 'Complete animal in lifelike pose',
      icon: '🦁'
    },
    {
      id: 'pedestal',
      name: 'Pedestal Mount',
      description: 'Full body on decorative base',
      icon: '🏛️'
    },
    {
      id: 'euro',
      name: 'Euro Mount',
      description: 'Cleaned and whitened skull',
      icon: '💀'
    },
    {
      id: 'rug',
      name: 'Tan to Fur (Rug)',
      description: 'Full hide preserved as rug',
      icon: '🧸'
    },
    {
      id: 'custom',
      name: 'Custom Design',
      description: 'Your unique vision',
      icon: '✨'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-green-50/30 to-stone-100 dark:from-stone-950 dark:via-green-950/20 dark:to-stone-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-slate-900 dark:text-white">Add Trophy</h1>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-green-600' : 'bg-stone-300 dark:bg-stone-700'}`}></div>
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-green-600' : 'bg-stone-300 dark:bg-stone-700'}`}></div>
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-green-600' : 'bg-stone-300 dark:bg-stone-700'}`}></div>
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className={step >= 1 ? 'text-green-600 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'}>
              Animal Details
            </span>
            <span className={step >= 2 ? 'text-green-600 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'}>
              Trophy Type
            </span>
            <span className={step >= 3 ? 'text-green-600 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'}>
              Summary
            </span>
          </div>
        </div>

        {/* Step 1: Animal Details */}
        {step === 1 && (
          <Card className="p-8 bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800">
            <h2 className="text-slate-900 dark:text-white mb-6">Record Harvested Animal</h2>
            
            <div className="space-y-6">
              {/* Species Selection */}
              <div>
                <Label htmlFor="species">Animal Species *</Label>
                <select
                  id="species"
                  value={trophyData.species}
                  onChange={(e) => setTrophyData(prev => ({ ...prev, species: e.target.value }))}
                  required
                  className="w-full mt-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
                >
                  <option value="">Select Species</option>
                  {animalSpecies.map(species => (
                    <option key={species} value={species}>{species}</option>
                  ))}
                </select>
              </div>

              {/* Trophy ID */}
              <div>
                <Label htmlFor="trophyId">Trophy ID</Label>
                <Input
                  id="trophyId"
                  value={trophyData.trophyId}
                  placeholder="Auto-generated"
                  disabled
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  A unique ID will be generated automatically
                </p>
              </div>

              {/* Gender */}
              <div>
                <Label>Gender *</Label>
                <RadioGroup
                  value={trophyData.gender}
                  onValueChange={(value) => setTrophyData(prev => ({ ...prev, gender: value }))}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={trophyData.notes}
                  onChange={(e) => setTrophyData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special details about this trophy..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <Label>Upload Reference Photo(s)</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Up to 3 photos
                </p>
                
                {/* Uploaded Photos */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-300 dark:border-green-700">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {photos.length < 3 && (
                  <label
                    htmlFor="photo-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg cursor-pointer bg-stone-50 dark:bg-stone-900/50 hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Click to upload ({photos.length}/3)
                    </p>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Trophy Type Selection */}
        {step === 2 && (
          <Card className="p-8 bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800">
            <h2 className="text-slate-900 dark:text-white mb-2">
              Select Trophy Mount for {trophyData.species}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Choose how you'd like your trophy prepared
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {trophyTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                    trophyData.trophyType === type.id
                      ? 'border-2 border-green-600 bg-green-50 dark:bg-green-950/20'
                      : 'border-2 border-stone-200 dark:border-stone-800'
                  }`}
                  onClick={() => setTrophyData(prev => ({ ...prev, trophyType: type.id }))}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{type.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-slate-900 dark:text-white">{type.name}</h4>
                        {trophyData.trophyType === type.id && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Custom Design Details */}
            {trophyData.trophyType === 'custom' && (
              <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <Label htmlFor="customDesign">Describe Your Custom Idea</Label>
                <Textarea
                  id="customDesign"
                  value={trophyData.customDesign}
                  onChange={(e) => setTrophyData(prev => ({ ...prev, customDesign: e.target.value }))}
                  placeholder="Describe your vision in detail..."
                  rows={4}
                  className="mt-2"
                />
              </Card>
            )}
          </Card>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <Card className="p-8 bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-slate-900 dark:text-white">Trophy Summary</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Review and confirm details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-stone-50 dark:bg-stone-900/50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Species</p>
                  <p className="text-slate-900 dark:text-white">{trophyData.species}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Gender</p>
                  <p className="text-slate-900 dark:text-white capitalize">{trophyData.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Trophy ID</p>
                  <p className="text-slate-900 dark:text-white">{trophyData.trophyId || generateTrophyId()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Trophy Type</p>
                  <p className="text-slate-900 dark:text-white">
                    {trophyTypes.find(t => t.id === trophyData.trophyType)?.name}
                  </p>
                </div>
              </div>

              {trophyData.notes && (
                <div className="p-4 bg-stone-50 dark:bg-stone-900/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-900 dark:text-white">{trophyData.notes}</p>
                </div>
              )}

              {photos.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Photos ({photos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <img
                        key={index}
                        src={URL.createObjectURL(photo)}
                        alt={`Trophy ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                Status: Added
              </Badge>
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-6">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((step - 1) as 1 | 2)}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-green-700 to-lime-600 hover:from-green-800 hover:to-lime-700 text-white"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="flex-1 bg-gradient-to-r from-green-700 to-lime-600 hover:from-green-800 hover:to-lime-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Trophy
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
