import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Package, MapPin, Clock, CheckCircle2, Truck, Home } from 'lucide-react';
import { formatDate as format } from '../utils/dateUtils';

interface Trophy {
  id: string;
  species: string;
  trophyType: string;
  image: string;
  status: 'received' | 'tannery' | 'mounting' | 'qa' | 'packed' | 'shipped' | 'delivered';
  progress: number;
  timeline: TimelineEvent[];
}

interface TimelineEvent {
  status: string;
  timestamp: Date;
  location: string;
  notes?: string;
}

interface TrophyTrackingDashboardProps {
  huntId: string;
}

export function TrophyTrackingDashboard({ huntId }: TrophyTrackingDashboardProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'process' | 'completed' | 'shipped'>('all');
  const [selectedTrophy, setSelectedTrophy] = useState<Trophy | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  // Mock trophy data
  const [trophies] = useState<Trophy[]>([
    {
      id: 'TRP-2025-10234',
      species: 'Kudu',
      trophyType: 'Shoulder Mount',
      image: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400',
      status: 'mounting',
      progress: 60,
      timeline: [
        {
          status: 'Received at Workshop',
          timestamp: new Date('2025-01-15T10:30:00'),
          location: 'Main Reception',
          notes: 'Trophy checked in, RFID tag applied'
        },
        {
          status: 'Tannery Processing',
          timestamp: new Date('2025-01-16T14:00:00'),
          location: 'Tannery Station A',
        },
        {
          status: 'Mounting Started',
          timestamp: new Date('2025-01-22T09:15:00'),
          location: 'Mounting Workshop B',
        },
      ]
    },
    {
      id: 'TRP-2025-10235',
      species: 'Springbok',
      trophyType: 'Euro Mount',
      image: 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?w=400',
      status: 'qa',
      progress: 85,
      timeline: [
        {
          status: 'Received',
          timestamp: new Date('2025-01-15T10:35:00'),
          location: 'Main Reception',
        },
        {
          status: 'Euro Mount Processing',
          timestamp: new Date('2025-01-17T11:00:00'),
          location: 'Cleaning Station',
        },
        {
          status: 'Quality Check',
          timestamp: new Date('2025-01-25T15:30:00'),
          location: 'QA Department',
        },
      ]
    },
  ]);

  const getStatusDetails = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      received: { label: 'Received', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400', icon: Package },
      tannery: { label: 'In Tannery', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400', icon: Clock },
      mounting: { label: 'Mounting', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400', icon: Clock },
      qa: { label: 'Quality Check', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-400', icon: CheckCircle2 },
      packed: { label: 'Packed', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400', icon: Package },
      shipped: { label: 'Shipped', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400', icon: Truck },
      delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400', icon: Home },
    };
    return statusMap[status] || statusMap.received;
  };

  const filteredTrophies = trophies.filter(trophy => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'process') return !['delivered', 'shipped'].includes(trophy.status);
    if (selectedFilter === 'completed') return trophy.status === 'delivered';
    if (selectedFilter === 'shipped') return trophy.status === 'shipped';
    return true;
  });

  const viewTimeline = (trophy: Trophy) => {
    setSelectedTrophy(trophy);
    setShowTimeline(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-green-50/30 to-stone-100 dark:from-stone-950 dark:via-green-950/20 dark:to-stone-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-slate-900 dark:text-white mb-2">My Trophies</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track your trophies through every stage of processing
          </p>
        </div>

        {/* Filter Tabs */}
        <Tabs value={selectedFilter} onValueChange={(v) => setSelectedFilter(v as any)} className="mb-8">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="all">
              All ({trophies.length})
            </TabsTrigger>
            <TabsTrigger value="process">
              In Process ({trophies.filter(t => !['delivered', 'shipped'].includes(t.status)).length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({trophies.filter(t => t.status === 'delivered').length})
            </TabsTrigger>
            <TabsTrigger value="shipped">
              Shipped ({trophies.filter(t => t.status === 'shipped').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Trophy Grid */}
        {filteredTrophies.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-stone-900">
            <Package className="w-16 h-16 text-stone-400 dark:text-stone-600 mx-auto mb-4" />
            <h3 className="text-slate-900 dark:text-white mb-2">No Trophies Found</h3>
            <p className="text-slate-600 dark:text-slate-400">
              No trophies match the selected filter
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrophies.map((trophy) => {
              const statusDetails = getStatusDetails(trophy.status);
              const StatusIcon = statusDetails.icon;

              return (
                <Card
                  key={trophy.id}
                  className="overflow-hidden hover:shadow-xl transition-all group"
                >
                  {/* Trophy Image */}
                  <div className="aspect-video relative overflow-hidden bg-stone-200 dark:bg-stone-800">
                    <img
                      src={trophy.image}
                      alt={trophy.species}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <Badge className={`absolute top-3 right-3 ${statusDetails.color}`}>
                      {statusDetails.label}
                    </Badge>
                  </div>

                  {/* Trophy Details */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-slate-900 dark:text-white mb-1">
                          {trophy.species}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {trophy.trophyType}
                        </p>
                      </div>
                      <StatusIcon className="w-5 h-5 text-slate-400" />
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Progress
                        </span>
                        <span className="text-xs text-slate-900 dark:text-white">
                          {trophy.progress}%
                        </span>
                      </div>
                      <Progress value={trophy.progress} className="h-2" />
                    </div>

                    {/* Trophy ID */}
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary" className="text-xs">
                        {trophy.id}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewTimeline(trophy)}
                        className="text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400"
                      >
                        View Timeline
                      </Button>
                    </div>

                    {/* Latest Update */}
                    <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Last Update
                          </p>
                          <p className="text-sm text-slate-900 dark:text-white">
                            {trophy.timeline[trophy.timeline.length - 1].status}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {format(trophy.timeline[trophy.timeline.length - 1].timestamp, 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline Dialog */}
      <Dialog open={showTimeline} onOpenChange={setShowTimeline}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trophy Timeline</DialogTitle>
          </DialogHeader>

          {selectedTrophy && (
            <div className="space-y-6">
              {/* Trophy Header */}
              <div className="flex items-center gap-4 p-4 bg-stone-50 dark:bg-stone-900/50 rounded-lg">
                <img
                  src={selectedTrophy.image}
                  alt={selectedTrophy.species}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h4 className="text-slate-900 dark:text-white mb-1">
                    {selectedTrophy.species}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {selectedTrophy.trophyType}
                  </p>
                  <Badge variant="secondary">{selectedTrophy.id}</Badge>
                </div>
              </div>

              {/* Timeline Events */}
              <div className="space-y-4">
                <h4 className="text-slate-900 dark:text-white">Processing Timeline</h4>
                
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-green-200 dark:bg-green-900"></div>

                  {/* Events */}
                  <div className="space-y-6">
                    {selectedTrophy.timeline.map((event, index) => (
                      <div key={index} className="relative flex gap-4">
                        {/* Timeline Dot */}
                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center z-10">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>

                        {/* Event Content */}
                        <Card className="flex-1 p-4 bg-white dark:bg-stone-900">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="text-slate-900 dark:text-white">
                              {event.status}
                            </h5>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {format(event.timestamp, 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3 h-3" />
                            <span>{event.location}</span>
                          </div>
                          {event.notes && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                              {event.notes}
                            </p>
                          )}
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Summary */}
              <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-900 dark:text-white">
                    Overall Progress
                  </span>
                  <span className="text-sm text-green-700 dark:text-green-500">
                    {selectedTrophy.progress}%
                  </span>
                </div>
                <Progress value={selectedTrophy.progress} className="h-3" />
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
