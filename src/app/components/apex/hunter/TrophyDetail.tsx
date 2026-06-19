import { Trophy, PartType } from '../types';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { StatusBadge } from '../StatusBadge';
import { Badge } from '../../ui/badge';
import { ArrowLeft, MessageCircle, Image, Clock, MapPin } from 'lucide-react';

interface TrophyDetailProps {
  trophy: Trophy;
  onBack: () => void;
}

const partTypeLabels: Record<PartType, string> = {
  skull: 'Skull',
  horns: 'Horns',
  cape_skin: 'Cape Skin',
  full_skin: 'Full Skin',
  tusks: 'Tusks'
};

export function TrophyDetail({ trophy, onBack }: TrophyDetailProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Trophies
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-slate-900 mb-2">{trophy.species}</h1>
            <p className="text-slate-600 mb-3">Trophy ID: {trophy.id}</p>
            <div className="flex items-center gap-3">
              <span className="text-slate-700">Current Stage:</span>
              <StatusBadge status={trophy.currentStage} />
            </div>
          </div>
          <Button>
            <MessageCircle className="w-4 h-4 mr-2" />
            Message Workshop
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-700">Overall Progress</span>
          <span className="text-slate-900">{trophy.progress}%</span>
        </div>
        <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-green-600 via-green-500 to-lime-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${trophy.progress}%` }}
          />
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Parts Section */}
          <Card className="p-6">
            <h3 className="text-slate-900 mb-4">Trophy Parts</h3>
            <div className="space-y-3">
              {trophy.parts.map((part) => (
                <div 
                  key={part.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-white">
                      {partTypeLabels[part.type]}
                    </Badge>
                    <div>
                      <div className="text-slate-900">{part.zone}</div>
                      <div className="text-slate-600 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(part.lastUpdated)}</span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={part.status} />
                </div>
              ))}
            </div>
          </Card>

          {/* Details */}
          <Card className="p-6">
            <h3 className="text-slate-900 mb-4">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-slate-600 mb-1">Created</div>
                <div className="text-slate-900">{formatDate(trophy.createdAt)}</div>
              </div>
              <div>
                <div className="text-slate-600 mb-1">Last Updated</div>
                <div className="text-slate-900">{formatDate(trophy.lastUpdated)}</div>
              </div>
              <div>
                <div className="text-slate-600 mb-1">Client</div>
                <div className="text-slate-900">{trophy.clientName}</div>
              </div>
              <div>
                <div className="text-slate-600 mb-1">Total Parts</div>
                <div className="text-slate-900">{trophy.parts.length}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card className="p-6">
            <h3 className="text-slate-900 mb-6">Processing Timeline</h3>
            <div className="space-y-4">
              {trophy.events.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    {index < trophy.events.length - 1 && (
                      <div className="w-0.5 bg-slate-200 flex-1 my-1" style={{ minHeight: '40px' }} />
                    )}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between mb-2">
                      <StatusBadge status={event.type} />
                      <span className="text-slate-600">{formatDate(event.timestamp)}</span>
                    </div>
                    <div className="text-slate-900 mb-1">{event.zone}</div>
                    {event.operator && (
                      <div className="text-slate-600">Operator: {event.operator}</div>
                    )}
                    {event.notes && (
                      <div className="text-slate-600 mt-1">{event.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          <Card className="p-12 text-center">
            <Image className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-slate-900 mb-2">No Photos Yet</h3>
            <p className="text-slate-600">
              Photos will appear here once uploaded by the workshop
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
