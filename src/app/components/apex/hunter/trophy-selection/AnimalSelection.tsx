import { useState, useMemo } from 'react';
import { mockAnimals } from '../../mockAnimalData';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Search, Grid3x3, List, Check } from 'lucide-react';
import { ImageWithFallback } from '../../../figma/ImageWithFallback';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

interface AnimalSelectionProps {
  onComplete: (animalIds: string[]) => void;
  initialSelectedIds?: string[];
}

type ViewMode = 'grid' | 'list' | 'dropdown';

export function AnimalSelection({ onComplete, initialSelectedIds = [] }: AnimalSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [dropdownValue, setDropdownValue] = useState('');

  const filteredAnimals = useMemo(() => {
    if (!searchQuery) return mockAnimals;
    const query = searchQuery.toLowerCase();
    return mockAnimals.filter(animal =>
      animal.name.toLowerCase().includes(query) ||
      animal.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleAnimalSelection = (animalId: string) => {
    setSelectedIds(prev =>
      prev.includes(animalId)
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    );
  };

  const handleDropdownAdd = () => {
    if (dropdownValue && !selectedIds.includes(dropdownValue)) {
      setSelectedIds(prev => [...prev, dropdownValue]);
      setDropdownValue('');
    }
  };

  const handleContinue = () => {
    if (selectedIds.length > 0) {
      onComplete(selectedIds);
    }
  };

  const selectedAnimals = mockAnimals.filter(a => selectedIds.includes(a.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-900 dark:text-slate-100 mb-2">Select Your Animal</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Pick each animal you harvested to choose a trophy mount.
        </p>
      </div>

      {/* Search Bar & View Toggles */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700 dark:text-green-500" />
          <Input
            placeholder="Search by name or browse the list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-green-50 dark:bg-stone-800 border-green-200 dark:border-green-800 focus:border-green-500 dark:focus:border-green-600"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Add Dropdown */}
      <Card className="p-4 bg-green-50 dark:bg-stone-900 border-green-200 dark:border-green-800">
        <label className="text-sm text-slate-700 dark:text-slate-300 mb-2 block">
          Quick Add Animal
        </label>
        <div className="flex gap-2">
          <Select value={dropdownValue} onValueChange={setDropdownValue}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select an animal..." />
            </SelectTrigger>
            <SelectContent>
              {mockAnimals.map(animal => (
                <SelectItem key={animal.id} value={animal.id}>
                  {animal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleDropdownAdd} disabled={!dropdownValue}>
            Add
          </Button>
        </div>
      </Card>

      {/* Selected Animals Summary */}
      {selectedAnimals.length > 0 && (
        <Card className="p-4 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
          <div className="mb-2">
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Selected Animals ({selectedAnimals.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedAnimals.map(animal => (
              <div
                key={animal.id}
                className="flex items-center gap-2 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-lg border border-green-300 dark:border-green-700"
              >
                <ImageWithFallback
                  src={animal.imageUrl}
                  alt={animal.name}
                  className="w-6 h-6 rounded object-cover"
                />
                <span className="text-sm">{animal.name}</span>
                <button
                  onClick={() => toggleAnimalSelection(animal.id)}
                  className="ml-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Animal Grid/List */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAnimals.map(animal => {
            const isSelected = selectedIds.includes(animal.id);
            return (
              <Card
                key={animal.id}
                className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  isSelected
                    ? 'ring-2 ring-green-600 dark:ring-green-500 bg-green-50 dark:bg-green-950/30'
                    : 'hover:border-green-500 dark:hover:border-green-600'
                }`}
                onClick={() => toggleAnimalSelection(animal.id)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="aspect-square overflow-hidden">
                  <ImageWithFallback
                    src={animal.imageUrl}
                    alt={animal.name}
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-slate-900 dark:text-slate-100 mb-1">{animal.name}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                    {animal.category.replace('-', ' ')}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredAnimals.map(animal => {
            const isSelected = selectedIds.includes(animal.id);
            return (
              <Card
                key={animal.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md flex items-center gap-4 ${
                  isSelected
                    ? 'ring-2 ring-green-600 dark:ring-green-500 bg-green-50 dark:bg-green-950/30'
                    : 'hover:border-green-500 dark:hover:border-green-600'
                }`}
                onClick={() => toggleAnimalSelection(animal.id)}
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src={animal.imageUrl}
                    alt={animal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-slate-900 dark:text-slate-100 mb-1">{animal.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                    {animal.category.replace('-', ' ')}
                  </p>
                </div>
                {isSelected && (
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end pt-4 border-t border-stone-200 dark:border-stone-800">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={selectedIds.length === 0}
          className="min-w-48"
        >
          Next: Choose Trophy Type
        </Button>
      </div>
    </div>
  );
}
