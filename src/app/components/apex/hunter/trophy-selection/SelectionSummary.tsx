import { TrophySelection } from '../../types';
import { trophyTypeOptions } from '../../mockAnimalData';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { ArrowLeft, Edit2, Trash2, Plus } from 'lucide-react';
import { ImageWithFallback } from '../../../figma/ImageWithFallback';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';

interface SelectionSummaryProps {
  selections: TrophySelection[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onAddMore: () => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function SelectionSummary({
  selections,
  onEdit,
  onRemove,
  onAddMore,
  onConfirm,
  onBack,
}: SelectionSummaryProps) {
  // Count duplicate animals and assign numbers
  const animalCounts: Record<string, number> = {};
  const selectionsWithNumbers = selections.map(selection => {
    const animalId = selection.animal.id;
    animalCounts[animalId] = (animalCounts[animalId] || 0) + 1;
    return {
      ...selection,
      number: animalCounts[animalId],
    };
  });

  const getTrophyTypeLabel = (type: string) => {
    return trophyTypeOptions.find(opt => opt.value === type)?.label || type;
  };

  // Check if any animal has duplicates
  const hasDuplicates = Object.values(animalCounts).some(count => count > 1);

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
          <h2 className="text-slate-900 dark:text-slate-100">Review Your Trophy Selections</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 ml-12">
          Review and confirm your selections before continuing
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Total Trophies</div>
          <div className="text-green-800 dark:text-green-400">{selections.length}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/50 dark:to-green-950/50 border-lime-300 dark:border-lime-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Unique Animals</div>
          <div className="text-lime-800 dark:text-lime-400">
            {Object.keys(animalCounts).length}
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Custom Designs</div>
          <div className="text-green-900 dark:text-green-300">
            {selections.filter(s => s.trophyType === 'custom-design').length}
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-300 dark:border-emerald-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Shoulder Mounts</div>
          <div className="text-emerald-800 dark:text-emerald-400">
            {selections.filter(s => s.trophyType === 'shoulder-mount').length}
          </div>
        </Card>
      </div>

      {/* Add More Button */}
      <Button
        variant="outline"
        onClick={onAddMore}
        className="w-full md:w-auto"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add More Animals
      </Button>

      {/* Selections List */}
      <div className="space-y-3">
        {selectionsWithNumbers.map((selection, index) => {
          const showNumber = Object.values(animalCounts).some(
            count => count > 1 && selection.animal.id === selections[index].animal.id
          );
          
          return (
            <Card key={selection.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Animal Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={selection.animal.imageUrl}
                    alt={selection.animal.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-slate-900 dark:text-slate-100">
                        {selection.animal.name}
                        {showNumber && (
                          <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                            #{selection.number}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                        {selection.animal.category.replace('-', ' ')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(index)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(index)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Trophy Type */}
                  <div className="mb-2">
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Trophy Type
                    </label>
                    <div className="bg-green-50 dark:bg-stone-800 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {getTrophyTypeLabel(selection.trophyType)}
                      </p>
                    </div>
                  </div>

                  {/* Trophy ID */}
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Trophy ID
                    </label>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {selection.id}
                    </p>
                  </div>

                  {/* Custom Description */}
                  {selection.customDescription && (
                    <div className="mt-2">
                      <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                        Custom Design Notes
                      </label>
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-900">
                        {selection.customDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      {hasDuplicates && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            💡 You have multiple trophies of the same species. Each has been assigned a unique number for tracking.
          </p>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
        <Button variant="outline" onClick={onBack}>
          Back to Edit
        </Button>
        <Button
          size="lg"
          onClick={onConfirm}
          className="min-w-48"
        >
          Confirm & Continue to Tracking
        </Button>
      </div>
    </div>
  );
}
