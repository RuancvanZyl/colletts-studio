import { useState } from 'react';
import { mockAnimals, trophyTypeOptions } from '../../mockAnimalData';
import { TrophyType, TrophySelection } from '../../types';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Checkbox } from '../../../ui/checkbox';
import { Textarea } from '../../../ui/textarea';
import { ArrowLeft, Upload, Info, Loader2 } from 'lucide-react';
import { ImageWithFallback } from '../../../figma/ImageWithFallback';
import { Label } from '../../../ui/label';
import { useTrophyTypeImages } from '../../../../../lib/hooks/useTrophyTypeImages';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';

interface TrophyTypeSelectionProps {
  animalId: string;
  onComplete: (selection: TrophySelection) => void;
  onBack: () => void;
  currentIndex: number;
  totalAnimals: number;
}

// Images loaded from Supabase Storage (admin-uploaded) with Unsplash fallback
// Use the hook below — this constant is kept only for type reference
const _unusedRef = null;

// Emoji icons for checklist/dropdown modes
const trophyTypeEmojis: Record<string, string> = {
  'shoulder-mount': '🦌',
  'full-body-mount': '🦁',
  'pedestal-mount': '🏛️',
  'euro-mount': '💀',
  'tan-to-fur': '🧸',
  'custom-design': '✨',
};

export function TrophyTypeSelection({
  animalId,
  onComplete,
  onBack,
  currentIndex,
  totalAnimals,
}: TrophyTypeSelectionProps) {
  const { images: trophyTypeImages, loading: imagesLoading } = useTrophyTypeImages();
  // Default to visual — most intuitive for first-time clients
  const [selectionMode, setSelectionMode] = useState<'checklist' | 'dropdown' | 'visual'>('visual');
  const [selectedType, setSelectedType] = useState<TrophyType | ''>('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customDescription, setCustomDescription] = useState('');

  const animal = mockAnimals.find(a => a.id === animalId);

  if (!animal) return null;

  const handleTypeSelect = (type: TrophyType) => {
    if (type === 'custom-design') {
      setSelectedType(type);
      setShowCustomDialog(true);
    } else {
      setSelectedType(type);
    }
  };

  const handleCustomSave = () => {
    const selection: TrophySelection = {
      id: `${animalId}-${Date.now()}`,
      animal,
      trophyType: 'custom-design',
      customDescription,
    };
    setShowCustomDialog(false);
    onComplete(selection);
  };

  const handleCustomCancel = () => {
    setShowCustomDialog(false);
    // Reset so the button stays disabled until they pick something else
    setSelectedType('');
  };

  const handleSave = () => {
    if (!selectedType || selectedType === '') return;
    const selection: TrophySelection = {
      id: `${animalId}-${Date.now()}`,
      animal,
      trophyType: selectedType,
      customDescription: selectedType === 'custom-design' ? customDescription : undefined,
    };
    onComplete(selection);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-slate-900 dark:text-slate-100">
            Choose Trophy Type for {animal.name}
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 ml-12">
          Animal {currentIndex} of {totalAnimals} — tap a picture to select
        </p>
      </div>

      {/* Animal Info Card */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <ImageWithFallback
              src={animal.imageUrl}
              alt={animal.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-slate-100 mb-1">{animal.name}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
              {animal.category.replace('-', ' ')}
            </p>
          </div>
        </div>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">View as:</span>
        <Button
          variant={selectionMode === 'visual' ? 'default' : 'outline'}
          onClick={() => setSelectionMode('visual')}
          size="sm"
        >
          📷 Pictures
        </Button>
        <Button
          variant={selectionMode === 'checklist' ? 'default' : 'outline'}
          onClick={() => setSelectionMode('checklist')}
          size="sm"
        >
          ☑️ List
        </Button>
        <Button
          variant={selectionMode === 'dropdown' ? 'default' : 'outline'}
          onClick={() => setSelectionMode('dropdown')}
          size="sm"
        >
          Dropdown
        </Button>
      </div>

      {/* Visual Mode — default, most client-friendly */}
      {selectionMode === 'visual' && imagesLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      )}
      {selectionMode === 'visual' && !imagesLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trophyTypeOptions.map(option => {
            const isSelected = selectedType === option.value;
            return (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-green-600 dark:ring-green-500'
                    : 'hover:border-green-400 dark:hover:border-green-600'
                }`}
                onClick={() => handleTypeSelect(option.value as TrophyType)}
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800 relative">
                  <ImageWithFallback
                    src={trophyTypeImages[option.value] ?? ''}
                    alt={option.label}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-green-600/20 flex items-center justify-center">
                      <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold shadow-lg">
                        ✓
                      </div>
                    </div>
                  )}
                </div>
                <div className={`p-3 ${isSelected ? 'bg-green-50 dark:bg-green-950/30' : ''}`}>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {trophyTypeEmojis[option.value]} {option.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    {option.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Checklist Mode */}
      {selectionMode === 'checklist' && (
        <Card className="p-6 space-y-3">
          {trophyTypeOptions.map(option => (
            <div
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedType === option.value
                  ? 'bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-700'
                  : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
              }`}
              onClick={() => handleTypeSelect(option.value as TrophyType)}
            >
              <Checkbox
                id={option.value}
                checked={selectedType === option.value}
                onCheckedChange={(checked) => {
                  if (checked) handleTypeSelect(option.value as TrophyType);
                }}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor={option.value} className="text-slate-900 dark:text-slate-100 cursor-pointer font-medium">
                  {trophyTypeEmojis[option.value]} {option.label}
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{option.description}</p>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Dropdown Mode */}
      {selectionMode === 'dropdown' && (
        <Card className="p-6 space-y-4">
          <div>
            <Label className="mb-2 block">Select Trophy Type</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => handleTypeSelect(value as TrophyType)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Tap here to choose..." />
              </SelectTrigger>
              <SelectContent>
                {trophyTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {trophyTypeEmojis[option.value]} {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Show description of selected type */}
          {selectedType && selectedType !== '' && (
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Info className="w-4 h-4 text-green-700 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-300">
                {trophyTypeOptions.find(o => o.value === selectedType)?.description}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Animals
        </Button>
        <Button
          size="lg"
          onClick={handleSave}
          disabled={!selectedType || selectedType === ''}
          className="min-w-48 bg-green-600 hover:bg-green-700 text-white"
        >
          {currentIndex < totalAnimals ? 'Next Animal →' : 'Review Selections →'}
        </Button>
      </div>

      {/* Custom Design Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={(open) => { if (!open) handleCustomCancel(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✨ Custom Design</DialogTitle>
            <DialogDescription>
              Describe your custom trophy mount idea for {animal.name}. Our team will contact you to discuss options and pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="description">Describe Your Idea *</Label>
              <Textarea
                id="description"
                placeholder="E.g. I'd like a wall panel with the horns mounted above a carved wooden plaque..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Upload Inspiration Photos (Optional)</Label>
              <div className="mt-2 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-6 text-center hover:border-green-500 dark:hover:border-green-600 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-stone-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  JPG, PNG up to 10MB each
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCustomCancel}>
              Cancel
            </Button>
            <Button onClick={handleCustomSave} disabled={!customDescription.trim()}>
              Save Custom Design
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
