import { useState } from 'react';
import { mockAnimals, trophyTypeOptions } from '../../mockAnimalData';
import { TrophyType, TrophySelection } from '../../types';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Checkbox } from '../../../ui/checkbox';
import { Textarea } from '../../../ui/textarea';
import { ArrowLeft, Grid3x3, List, Upload } from 'lucide-react';
import { ImageWithFallback } from '../../../figma/ImageWithFallback';
import { Label } from '../../../ui/label';
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

type SelectionMode = 'checklist' | 'dropdown' | 'visual';

const trophyTypeImages: Record<string, string> = {
  'shoulder-mount': 'https://images.unsplash.com/photo-1715532176267-9f62e4650c9e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaG91bGRlciUyMG1vdW50JTIwdGF4aWRlcm15fGVufDF8fHx8MTc2MjI1Mjk1Nnww&ixlib=rb-4.1.0&q=80&w=1080',
  'euro-mount': 'https://images.unsplash.com/photo-1577964723545-2ee160c50431?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmltYWwlMjBza3VsbCUyMGV1cm8lMjBtb3VudHxlbnwxfHx8fDE3NjIyNTI5NTd8MA&ixlib=rb-4.1.0&q=80&w=1080',
  'tan-to-fur': 'https://images.unsplash.com/photo-1713860752281-9bc6ba194346?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmltYWwlMjBza2luJTIwcnVnfGVufDF8fHx8MTc2MjI1Mjk1N3ww&ixlib=rb-4.1.0&q=80&w=1080',
};

export function TrophyTypeSelection({
  animalId,
  onComplete,
  onBack,
  currentIndex,
  totalAnimals,
}: TrophyTypeSelectionProps) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('checklist');
  const [selectedType, setSelectedType] = useState<TrophyType | ''>('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customDescription, setCustomDescription] = useState('');

  const animal = mockAnimals.find(a => a.id === animalId);

  if (!animal) return null;

  const handleTypeSelect = (type: TrophyType) => {
    if (type === 'custom-design') {
      setShowCustomDialog(true);
      setSelectedType(type);
    } else {
      setSelectedType(type);
    }
  };

  const handleSave = () => {
    if (selectedType && selectedType !== '') {
      const selection: TrophySelection = {
        id: `${animalId}-${Date.now()}`,
        animal,
        trophyType: selectedType,
        customDescription: selectedType === 'custom-design' ? customDescription : undefined,
      };
      onComplete(selection);
    }
  };

  const handleCustomSave = () => {
    if (selectedType === 'custom-design') {
      const selection: TrophySelection = {
        id: `${animalId}-${Date.now()}`,
        animal,
        trophyType: selectedType,
        customDescription,
      };
      setShowCustomDialog(false);
      onComplete(selection);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-slate-900 dark:text-slate-100">
            Select Trophy Type for {animal.name}
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 ml-12">
          Animal {currentIndex} of {totalAnimals}
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

      {/* Selection Mode Toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectionMode === 'checklist' ? 'default' : 'outline'}
          onClick={() => setSelectionMode('checklist')}
          size="sm"
        >
          <List className="w-4 h-4 mr-2" />
          Checklist
        </Button>
        <Button
          variant={selectionMode === 'dropdown' ? 'default' : 'outline'}
          onClick={() => setSelectionMode('dropdown')}
          size="sm"
        >
          Dropdown
        </Button>
        <Button
          variant={selectionMode === 'visual' ? 'default' : 'outline'}
          onClick={() => setSelectionMode('visual')}
          size="sm"
        >
          <Grid3x3 className="w-4 h-4 mr-2" />
          Visual
        </Button>
      </div>

      {/* Checklist Mode */}
      {selectionMode === 'checklist' && (
        <Card className="p-6 space-y-4">
          {trophyTypeOptions.map(option => (
            <div key={option.value} className="flex items-center space-x-3">
              <Checkbox
                id={option.value}
                checked={selectedType === option.value}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleTypeSelect(option.value as TrophyType);
                  }
                }}
              />
              <Label
                htmlFor={option.value}
                className="text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </Card>
      )}

      {/* Dropdown Mode */}
      {selectionMode === 'dropdown' && (
        <Card className="p-6">
          <Label className="mb-2 block">Trophy Type</Label>
          <Select
            value={selectedType}
            onValueChange={(value) => handleTypeSelect(value as TrophyType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select trophy type..." />
            </SelectTrigger>
            <SelectContent>
              {trophyTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      )}

      {/* Visual Mode */}
      {selectionMode === 'visual' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {trophyTypeOptions.map(option => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                selectedType === option.value
                  ? 'ring-2 ring-green-600 dark:ring-green-500 bg-green-50 dark:bg-green-950/30'
                  : 'hover:border-green-500 dark:hover:border-green-600'
              }`}
              onClick={() => handleTypeSelect(option.value as TrophyType)}
            >
              {trophyTypeImages[option.value] && (
                <div className="aspect-video overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <ImageWithFallback
                    src={trophyTypeImages[option.value]}
                    alt={option.label}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <p className="text-slate-900 dark:text-slate-100">{option.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
        <Button variant="outline" onClick={onBack}>
          Back to Animals
        </Button>
        <Button
          size="lg"
          onClick={handleSave}
          disabled={!selectedType}
          className="min-w-48"
        >
          {currentIndex < totalAnimals ? 'Next Animal' : 'Review Selections'}
        </Button>
      </div>

      {/* Custom Design Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Design</DialogTitle>
            <DialogDescription>
              Describe your custom trophy mount idea for {animal.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your custom idea..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Upload Sketches/Photos (Optional)</Label>
              <div className="mt-2 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-8 text-center hover:border-green-500 dark:hover:border-green-600 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-stone-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Max 5 files
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
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
