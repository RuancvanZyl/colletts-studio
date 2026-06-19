import { Trophy } from '../types';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { StatusBadge } from '../StatusBadge';
import { Clock } from 'lucide-react';

interface MyTrophiesProps {
  trophies: Trophy[];
  onViewTrophy: (trophy: Trophy) => void;
}

export function MyTrophies({ trophies, onViewTrophy }: MyTrophiesProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">My Trophies</h1>
        <p className="text-slate-600">{trophies.length} total trophies</p>
      </div>

      <div className="space-y-4">
        {trophies.map((trophy) => (
          <Card 
            key={trophy.id}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onViewTrophy(trophy)}
          >
            <div className="flex items-start gap-4">
              {/* Trophy Image */}
              <div className="flex-shrink-0 w-20 h-20 bg-slate-200 rounded-lg overflow-hidden">
                {trophy.imageUrl ? (
                  <img 
                    src={trophy.imageUrl} 
                    alt={trophy.species}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <span className="text-xs">No image</span>
                  </div>
                )}
              </div>

              {/* Trophy Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-slate-900 mb-1">{trophy.species}</h3>
                    <p className="text-slate-600">ID: {trophy.id}</p>
                  </div>
                  <StatusBadge status={trophy.currentStage} />
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Progress</span>
                    <span className="text-slate-900">{trophy.progress}%</span>
                  </div>
                  <Progress value={trophy.progress} className="h-2" />
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Updated {formatTimeAgo(trophy.lastUpdated)}</span>
                  </div>
                  <span>•</span>
                  <span>{trophy.parts.length} parts</span>
                </div>
              </div>

              {/* Action Button - Desktop */}
              <div className="hidden md:block">
                <Button onClick={() => onViewTrophy(trophy)}>
                  Track
                </Button>
              </div>
            </div>

            {/* Action Button - Mobile */}
            <Button 
              className="w-full mt-4 md:hidden"
              onClick={() => onViewTrophy(trophy)}
            >
              Track Trophy
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
