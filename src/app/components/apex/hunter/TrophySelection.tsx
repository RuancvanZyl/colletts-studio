import { useState } from 'react';
import { AnimalSelection } from './trophy-selection/AnimalSelection';
import { TrophyTypeSelection } from './trophy-selection/TrophyTypeSelection';
import { SelectionSummary } from './trophy-selection/SelectionSummary';
import { TrophySelection as TrophySelectionType } from '../types';
import { Button } from '../../ui/button';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface TrophySelectionProps {
  onBack: () => void;
  onComplete: (selections: TrophySelectionType[]) => void;
}

type Step = 'animal' | 'trophy-type' | 'summary';

export function TrophySelection({ onBack, onComplete }: TrophySelectionProps) {
  const [currentStep, setCurrentStep] = useState<Step>('animal');
  const [selections, setSelections] = useState<TrophySelectionType[]>([]);
  const [currentAnimalIds, setCurrentAnimalIds] = useState<string[]>([]);
  const [currentAnimalIndex, setCurrentAnimalIndex] = useState(0);

  const handleAnimalSelectionComplete = (animalIds: string[]) => {
    setCurrentAnimalIds(animalIds);
    setCurrentAnimalIndex(0);
    setCurrentStep('trophy-type');
  };

  const handleTrophyTypeSelected = (selection: TrophySelectionType) => {
    const updatedSelections = [...selections, selection];
    setSelections(updatedSelections);

    // Check if we have more animals to process
    if (currentAnimalIndex < currentAnimalIds.length - 1) {
      setCurrentAnimalIndex(currentAnimalIndex + 1);
    } else {
      // All animals processed, move to summary
      setCurrentStep('summary');
    }
  };

  const handleEditSelection = (index: number) => {
    // Allow editing a specific selection
    const selection = selections[index];
    const animalId = selection.animal.id;
    
    // Find the position of this animal in our list
    const animalPosition = currentAnimalIds.indexOf(animalId);
    
    // Remove this selection
    setSelections(selections.filter((_, i) => i !== index));
    
    // Go back to trophy type selection for this animal
    setCurrentAnimalIndex(animalPosition);
    setCurrentStep('trophy-type');
  };

  const handleRemoveSelection = (index: number) => {
    const selection = selections[index];
    setSelections(selections.filter((_, i) => i !== index));
    setCurrentAnimalIds(currentAnimalIds.filter(id => id !== selection.animal.id));
    
    // If no selections left, go back to animal selection
    if (selections.length === 1) {
      setCurrentStep('animal');
      setCurrentAnimalIds([]);
    }
  };

  const handleAddMoreAnimals = () => {
    setCurrentStep('animal');
  };

  const handleConfirmAndContinue = () => {
    onComplete(selections);
  };

  const handleBackFromTrophyType = () => {
    setCurrentStep('animal');
    setCurrentAnimalIds([]);
    setCurrentAnimalIndex(0);
  };

  const handleBackFromSummary = () => {
    // Go back to the last animal's trophy selection
    setCurrentAnimalIndex(currentAnimalIds.length - 1);
    setSelections(selections.slice(0, -1));
    setCurrentStep('trophy-type');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'animal':
        return (
          <AnimalSelection
            onComplete={handleAnimalSelectionComplete}
            initialSelectedIds={currentAnimalIds}
          />
        );
      case 'trophy-type':
        return (
          <TrophyTypeSelection
            animalId={currentAnimalIds[currentAnimalIndex]}
            onComplete={handleTrophyTypeSelected}
            onBack={handleBackFromTrophyType}
            currentIndex={currentAnimalIndex + 1}
            totalAnimals={currentAnimalIds.length}
          />
        );
      case 'summary':
        return (
          <SelectionSummary
            selections={selections}
            onEdit={handleEditSelection}
            onRemove={handleRemoveSelection}
            onAddMore={handleAddMoreAnimals}
            onConfirm={handleConfirmAndContinue}
            onBack={handleBackFromSummary}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Trophy Selection</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Select your animals and choose trophy types
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2 justify-center">
        <div className={`flex items-center gap-2 ${currentStep === 'animal' ? 'opacity-100' : 'opacity-50'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'animal' 
              ? 'bg-green-600 text-white' 
              : selections.length > 0 
                ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400'
          }`}>
            {selections.length > 0 ? <CheckCircle className="w-5 h-5" /> : '1'}
          </div>
          <span className="text-sm">Select Animals</span>
        </div>
        
        <div className="w-12 h-0.5 bg-stone-300 dark:bg-stone-700" />
        
        <div className={`flex items-center gap-2 ${currentStep === 'trophy-type' ? 'opacity-100' : 'opacity-50'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'trophy-type'
              ? 'bg-green-600 text-white'
              : currentStep === 'summary'
                ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400'
          }`}>
            {currentStep === 'summary' ? <CheckCircle className="w-5 h-5" /> : '2'}
          </div>
          <span className="text-sm">Choose Trophy Type</span>
        </div>
        
        <div className="w-12 h-0.5 bg-stone-300 dark:bg-stone-700" />
        
        <div className={`flex items-center gap-2 ${currentStep === 'summary' ? 'opacity-100' : 'opacity-50'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'summary'
              ? 'bg-green-600 text-white'
              : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400'
          }`}>
            3
          </div>
          <span className="text-sm">Review & Confirm</span>
        </div>
      </div>

      {/* Step Content */}
      {renderStep()}
    </div>
  );
}
