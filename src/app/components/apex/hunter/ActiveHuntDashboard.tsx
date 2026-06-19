import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Plus, MapPin, Calendar, User, Trophy as TrophyIcon, CheckCircle, ArrowRight } from 'lucide-react';
import { formatDate as format } from '../utils/dateUtils';

interface TrophyItem {
  id: string;
  species: string;
  trophyType: string;
  image?: string;
  status: string;
}

interface ActiveHuntDashboardProps {
  huntData: any;
  onAddTrophy: () => void;
  onViewTrophy: (trophy: TrophyItem) => void;
  onSubmitHunt: () => void;
}

export function ActiveHuntDashboard({ 
  huntData, 
  onAddTrophy, 
  onViewTrophy,
  onSubmitHunt 
}: ActiveHuntDashboardProps) {
  const [trophies] = useState<TrophyItem[]>([
    // Mock data - will be populated by user
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'linked':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400 border-green-300';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border-amber-300';
      default:
        return 'bg-stone-100 text-stone-800 dark:bg-stone-950 dark:text-stone-400 border-stone-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-green-50/30 to-stone-100 dark:from-stone-950 dark:via-green-950/20 dark:to-stone-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-slate-900 dark:text-white mb-2">Active Hunt</h1>
              <p className="text-slate-600 dark:text-slate-400">
                Manage your trophies and track progress
              </p>
            </div>
            <Badge className="text-lg px-4 py-2">
              {huntData.huntId}
            </Badge>
          </div>
        </div>

        {/* Hunt Summary Card */}
        <Card className="p-6 mb-8 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/30 dark:to-lime-950/30 border-2 border-green-200 dark:border-green-900">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Hunt Name */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Hunt Name</p>
              <p className="text-slate-900 dark:text-white">{huntData.huntName}</p>
            </div>

            {/* Location */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </p>
              <p className="text-slate-900 dark:text-white">{huntData.region}</p>
              {huntData.farmName && (
                <p className="text-xs text-slate-600 dark:text-slate-400">{huntData.farmName}</p>
              )}
            </div>

            {/* Outfitter */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                Outfitter
              </p>
              <p className="text-slate-900 dark:text-white">{huntData.outfitterName}</p>
              <Badge className={`mt-1 ${getStatusColor(huntData.status || 'pending')}`}>
                {huntData.status === 'linked' ? 'Linked ✅' : 'Awaiting Confirmation'}
              </Badge>
            </div>

            {/* Dates */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Dates
              </p>
              {huntData.startDate && huntData.endDate && (
                <div className="text-sm text-slate-900 dark:text-white">
                  <p>{format(huntData.startDate, 'MMM d, yyyy')}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    to {format(huntData.endDate, 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Trophy Count */}
          <div className="mt-6 pt-6 border-t border-green-200 dark:border-green-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-700 dark:text-green-500" />
                <span className="text-slate-900 dark:text-white">
                  {trophies.length} {trophies.length === 1 ? 'Trophy' : 'Trophies'} Added
                </span>
              </div>
              <Button
                onClick={onAddTrophy}
                className="bg-gradient-to-r from-green-700 to-lime-600 hover:from-green-800 hover:to-lime-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Trophy
              </Button>
            </div>
          </div>
        </Card>

        {/* Trophies List */}
        {trophies.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-stone-900 border-2 border-dashed border-stone-300 dark:border-stone-700">
            <Trophy className="w-16 h-16 text-stone-400 dark:text-stone-600 mx-auto mb-4" />
            <h3 className="text-slate-900 dark:text-white mb-2">No Trophies Added Yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Start by adding your first harvested animal. You can record details and select the trophy type.
            </p>
            <Button
              onClick={onAddTrophy}
              size="lg"
              className="bg-gradient-to-r from-green-700 to-lime-600 hover:from-green-800 hover:to-lime-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Trophy
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {trophies.map((trophy) => (
                <Card
                  key={trophy.id}
                  className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                  onClick={() => onViewTrophy(trophy)}
                >
                  {trophy.image && (
                    <div className="aspect-video bg-stone-200 dark:bg-stone-800 relative overflow-hidden">
                      <img
                        src={trophy.image}
                        alt={trophy.species}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <Badge className="absolute top-3 right-3 bg-white/90 dark:bg-stone-900/90">
                        {trophy.status}
                      </Badge>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-slate-900 dark:text-white mb-1">{trophy.species}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {trophy.trophyType}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {trophy.id}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Submit Hunt Button */}
            <Card className="p-6 bg-gradient-to-r from-green-700 to-lime-600 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="mb-1">Ready to Submit?</h3>
                  <p className="text-sm text-green-100">
                    Once you've added all trophies, submit your hunt record to the taxidermy workshop
                  </p>
                </div>
                <Button
                  onClick={onSubmitHunt}
                  size="lg"
                  className="bg-white text-green-700 hover:bg-green-50 flex-shrink-0"
                >
                  Submit to Taxidermy
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Floating Add Button (Mobile) */}
      <Button
        onClick={onAddTrophy}
        className="fixed bottom-6 right-6 md:hidden w-14 h-14 rounded-full shadow-2xl bg-gradient-to-r from-green-700 to-lime-600 hover:from-green-800 hover:to-lime-700 text-white"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
