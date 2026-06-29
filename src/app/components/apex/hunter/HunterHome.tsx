import { Trophy } from '../types';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { ProgressRing } from '../ProgressRing';
import { ArrowRight, Plus, Award } from 'lucide-react';

interface HunterHomeProps {
  trophies: Trophy[];
  onViewTrophy: (trophy: Trophy) => void;
  onAddTrophy: () => void;
  hunterName?: string;
}

export function HunterHome({ trophies, onViewTrophy, onAddTrophy, hunterName }: HunterHomeProps) {
  const activeTrophies = trophies.filter(t => t.progress < 100);
  const completedTrophies = trophies.filter(t => t.progress === 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 mb-2">Welcome{hunterName ? `, ${hunterName}` : ''}</h1>
          <p className="text-slate-600 dark:text-slate-400">Track your trophy progress and receive updates</p>
        </div>
        <Button onClick={onAddTrophy} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Add New Trophy
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Total Trophies</div>
          <div className="text-green-800 dark:text-green-400">{trophies.length}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/50 dark:to-green-950/50 border-lime-300 dark:border-lime-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">In Progress</div>
          <div className="text-lime-800 dark:text-lime-400">{activeTrophies.length}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Completed</div>
          <div className="text-green-900 dark:text-green-300">{completedTrophies.length}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 border-amber-300 dark:border-amber-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Avg. Progress</div>
          <div className="text-amber-800 dark:text-amber-400">
            {trophies.length > 0 ? Math.round(trophies.reduce((sum, t) => sum + t.progress, 0) / trophies.length) : 0}%
          </div>
        </Card>
      </div>

      {/* Empty state */}
      {trophies.length === 0 && (
        <Card className="p-12 text-center border-dashed border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <Award className="w-16 h-16 text-green-300 dark:text-green-700 mx-auto mb-4" />
          <h3 className="text-slate-700 dark:text-slate-300 mb-2">No trophies yet</h3>
          <p className="text-slate-500 dark:text-slate-500 mb-6 max-w-sm mx-auto">
            Once your trophies are checked in at the workshop, they will appear here so you can track their progress.
          </p>
          <Button onClick={onAddTrophy} className="gap-2">
            <Plus className="w-4 h-4" />
            Select Your Trophy Types
          </Button>
        </Card>
      )}

      {/* Active Trophies */}
      {activeTrophies.length > 0 && (
      <div>
        <h2 className="text-slate-900 mb-4">Active Trophies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTrophies.map((trophy) => (
            <Card 
              key={trophy.id}
              className="p-6 hover:shadow-xl transition-all cursor-pointer bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-green-500 dark:hover:border-green-600"
              onClick={() => onViewTrophy(trophy)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <ProgressRing progress={trophy.progress} size={80} strokeWidth={6} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-900 mb-1 truncate">{trophy.species}</h3>
                  <p className="text-slate-600 mb-2">ID: {trophy.id}</p>
                  <p className="text-slate-600">
                    {trophy.parts.length} part{trophy.parts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="w-full mt-4"
                onClick={() => onViewTrophy(trophy)}
              >
                View Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
      )}

      {/* Completed Trophies */}
      {completedTrophies.length > 0 && (
        <div>
          <h2 className="text-slate-900 mb-4">Completed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedTrophies.map((trophy) => (
              <Card 
                key={trophy.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer opacity-75"
                onClick={() => onViewTrophy(trophy)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-900">{trophy.species}</h3>
                  <div className="bg-green-100 text-green-900 px-3 py-1 rounded-full text-sm">
                    ✓ Complete
                  </div>
                </div>
                <p className="text-slate-600 mb-2">ID: {trophy.id}</p>
                <p className="text-slate-600">
                  Delivered {new Date(trophy.lastUpdated).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
