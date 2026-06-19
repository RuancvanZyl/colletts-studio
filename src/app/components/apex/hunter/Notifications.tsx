import { useState } from 'react';
import { Notification } from '../types';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { CheckCircle, Clock, Package, Truck, AlertCircle } from 'lucide-react';

interface NotificationsProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

type FilterType = 'all' | 'update' | 'shipment' | 'alert';

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'update':
      return <CheckCircle className="w-5 h-5 text-blue-600" />;
    case 'shipment':
      return <Truck className="w-5 h-5 text-green-600" />;
    case 'alert':
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
  }
};

export function Notifications({ notifications, onMarkAsRead }: NotificationsProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || n.type === filter
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Notifications</h1>
        <p className="text-slate-600">
          {notifications.filter(n => !n.read).length} unread notifications
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'update' ? 'default' : 'outline'}
          onClick={() => setFilter('update')}
        >
          Updates
        </Button>
        <Button
          variant={filter === 'shipment' ? 'default' : 'outline'}
          onClick={() => setFilter('shipment')}
        >
          Shipments
        </Button>
        <Button
          variant={filter === 'alert' ? 'default' : 'outline'}
          onClick={() => setFilter('alert')}
        >
          Alerts
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-slate-900 mb-2">No notifications</h3>
            <p className="text-slate-600">You're all caught up!</p>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id}
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
              onClick={() => onMarkAsRead(notification.id)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-slate-900">{notification.message}</p>
                    {!notification.read && (
                      <Badge variant="secondary" className="bg-blue-600 text-white flex-shrink-0">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>{formatTimeAgo(notification.timestamp)}</span>
                    {notification.trophyId && (
                      <>
                        <span>•</span>
                        <span>{notification.trophyId}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
