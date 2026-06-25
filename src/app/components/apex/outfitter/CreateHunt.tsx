import { useState } from 'react';
import { Hunt } from '../types';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { ArrowLeft, Upload, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { mockAnimals } from '../mockAnimalData';

interface CreateHuntProps {
  hunt?: Hunt | null;
  onSave: () => void;
  onCancel: () => void;
}

export function CreateHunt({ hunt, onSave, onCancel }: CreateHuntProps) {
  const [formData, setFormData] = useState({
    name: hunt?.name || '',
    hunterName: hunt?.hunterName || '',
    region: hunt?.region || '',
    province: hunt?.province || '',
    farm: hunt?.farm || '',
    startDate: hunt?.startDate || '',
    endDate: hunt?.endDate || '',
    animalCount: hunt?.animalCount.toString() || '0',
    animals: hunt?.animals || [],
    status: hunt?.status || 'planned',
    notes: hunt?.notes || '',
  });

  const [selectedAnimal, setSelectedAnimal] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAnimal = () => {
    if (selectedAnimal && !formData.animals.includes(selectedAnimal)) {
      const newAnimals = [...formData.animals, selectedAnimal];
      setFormData(prev => ({
        ...prev,
        animals: newAnimals,
        animalCount: newAnimals.length.toString(),
      }));
      setSelectedAnimal('');
    }
  };

  const handleRemoveAnimal = (animal: string) => {
    const newAnimals = formData.animals.filter(a => a !== animal);
    setFormData(prev => ({
      ...prev,
      animals: newAnimals,
      animalCount: newAnimals.length.toString(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.hunterName || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success(hunt ? 'Hunt updated successfully!' : 'Hunt created successfully!', {
      description: `Hunt linked to ${formData.hunterName}`,
    });
    onSave();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 mb-2">
            {hunt ? 'Edit Hunt' : 'Create New Hunt'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {hunt ? 'Update hunt details' : 'Add a new hunt to your register'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h3 className="text-slate-900 dark:text-slate-100 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Hunt Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Spring Plains Game Safari 2024"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="hunterName">Hunter Name *</Label>
                <Input
                  id="hunterName"
                  value={formData.hunterName}
                  onChange={(e) => handleInputChange('hunterName', e.target.value)}
                  placeholder="Search or enter hunter name"
                  required
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This will link to the hunter's profile
                </p>
              </div>
            </div>
          </Card>

          {/* Location */}
          <Card className="p-6">
            <h3 className="text-slate-900 dark:text-slate-100 mb-4">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="region">Region *</Label>
                <Select value={formData.region} onValueChange={(val) => handleInputChange('region', val)}>
                  <SelectTrigger id="region" className="mt-2">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Northern Province">Northern Province</SelectItem>
                    <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                    <SelectItem value="Western Cape">Western Cape</SelectItem>
                    <SelectItem value="Free State">Free State</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="province">Province *</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleInputChange('province', e.target.value)}
                  placeholder="e.g., Limpopo"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="farm">Farm / Reserve *</Label>
                <Input
                  id="farm"
                  value={formData.farm}
                  onChange={(e) => handleInputChange('farm', e.target.value)}
                  placeholder="e.g., Kalahari Game Reserve"
                  required
                  className="mt-2"
                />
              </div>
            </div>
          </Card>

          {/* Dates */}
          <Card className="p-6">
            <h3 className="text-slate-900 dark:text-slate-100 mb-4">Hunt Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  required
                  className="mt-2"
                />
              </div>
            </div>
          </Card>

          {/* Animals */}
          <Card className="p-6">
            <h3 className="text-slate-900 dark:text-slate-100 mb-4">Animals</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select animal species..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockAnimals.map(animal => (
                      <SelectItem key={animal.id} value={animal.name}>
                        {animal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddAnimal} disabled={!selectedAnimal}>
                  Add
                </Button>
              </div>

              {formData.animals.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.animals.map((animal, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-lg border border-green-300 dark:border-green-700"
                    >
                      <span className="text-sm">{animal}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnimal(animal)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Animals: <span className="font-medium">{formData.animals.length}</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Status & Notes */}
          <Card className="p-6">
            <h3 className="text-slate-900 dark:text-slate-100 mb-4">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Hunt Status</Label>
                <Select value={formData.status} onValueChange={(val) => handleInputChange('status', val)}>
                  <SelectTrigger id="status" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes about this hunt..."
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          </Card>

          {/* Upload Document */}
          <Card className="p-6">
            <h3 className="text-slate-900 dark:text-slate-100 mb-4">Official Register / Permit</h3>
            <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-8 text-center hover:border-green-500 dark:hover:border-green-600 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-stone-400" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                PDF, XLSX, or Image files
              </p>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              {hunt ? 'Update Hunt' : 'Create Hunt'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
