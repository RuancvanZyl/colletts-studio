import { useState } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Loader2, CheckCircle2, Clock, Package, Trophy, Star, Bell, BellOff, MessageCircle } from 'lucide-react';
import type { ClientNotification } from '../../../../lib/hooks/useClientNotifications';

interface NotificationsProps {
  notifications:  ClientNotification[];
  loading:        boolean;
  unreadCount:    number;
  onMarkRead:     (id: string) => void;
  onMarkAllRead:  () => void;
  /** the screen's name, the same as the button that opens it */
  title?:         string;
  /** a message notification opens the conversation */
  onOpenMessages?: () => void;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotifIcon({ type, stage }: { type: ClientNotification['type']; stage?: string | null }) {
  const cls = 'w-5 h-5';
  if (stage === 'message') return <MessageCircle className={`${cls} text-green-600`} />;
  if (type === 'ready')     return <Star     className={`${cls} text-yellow-500`} />;
  if (type === 'milestone') return <Trophy   className={`${cls} text-[#0073ea]`} />;
  if (type === 'alert')     return <Clock    className={`${cls} text-amber-500`} />;
  return                           <Package  className={`${cls} text-slate-400`} />;
}

function NotifCard({ n, onMarkRead, onOpenMessages }: { n: ClientNotification; onMarkRead: (id: string) => void; onOpenMessages?: () => void }) {
  return (
    <button onClick={() => { if (!n.read) onMarkRead(n.id); if (n.stage === 'message') onOpenMessages?.(); }}
      className={`w-full flex items-start gap-3 p-4 rounded-xl text-left transition-colors border ${
        n.read
          ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
          : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
      }`}>

      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        n.type === 'ready'     ? 'bg-yellow-100 dark:bg-yellow-900/30' :
        n.type === 'milestone' ? 'bg-blue-100 dark:bg-blue-900/30' :
        n.type === 'alert'     ? 'bg-amber-100 dark:bg-amber-900/30' :
                                  'bg-slate-100 dark:bg-slate-800'
      }`}>
        <NotifIcon type={n.type} stage={n.stage} />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${n.read ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>
            {n.title}
          </p>
          {!n.read && <div className="w-2 h-2 rounded-full bg-[#0073ea] shrink-0 mt-1.5" />}
        </div>
        {n.body && (
          <p className="text-xs text-slate-500 leading-relaxed">{n.body}</p>
        )}
        {n.stage === 'message' && onOpenMessages && <p className="text-xs font-semibold text-green-700 dark:text-green-400">Tap to open the conversation</p>}
        <p className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
      </div>
    </button>
  );
}

export function Notifications({ notifications, loading, unreadCount, onMarkRead, onMarkAllRead, title = 'Updates', onOpenMessages }: NotificationsProps) {
  const [show, setShow] = useState<'all' | 'messages' | 'progress'>('all');
  const shown = notifications.filter(n => show === 'all' || (show === 'messages' ? n.stage === 'message' : n.stage !== 'message'));
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {title}
            {unreadCount > 0 && (
              <Badge className="bg-[#0073ea] text-white border-0 text-xs">{unreadCount}</Badge>
            )}
          </h2>
          <p className="text-sm text-slate-500">Messages from the workshop and how your trophies are getting on</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={onMarkAllRead} className="text-xs gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Show">
        {([['all', 'Everything'], ['messages', 'Messages'], ['progress', 'Trophy progress']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={show === k} onClick={() => setShow(k)}
            className={`min-h-10 px-4 rounded-full text-sm font-semibold border ${show === k ? 'bg-[#0073ea] text-white border-[#0073ea]' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{l}</button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <BellOff className="w-10 h-10 mx-auto text-slate-300" />
          <div>
            <p className="font-medium text-slate-600 dark:text-slate-300">{show === 'messages' ? 'No messages yet' : 'Nothing here yet'}</p>
            <p className="text-sm text-slate-400 mt-1">{show === 'messages' ? 'When the workshop writes to you, it shows up here.' : "You'll see messages and updates here as your trophies move through the workshop"}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.some(n => !n.read) && (
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">New</p>
          )}
          {shown.filter(n => !n.read).map(n => (
            <NotifCard key={n.id} n={n} onMarkRead={onMarkRead} onOpenMessages={onOpenMessages} />
          ))}
          {shown.some(n => n.read) && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 pt-2">Earlier</p>
              {shown.filter(n => n.read).map(n => (
                <NotifCard key={n.id} n={n} onMarkRead={onMarkRead} onOpenMessages={onOpenMessages} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
