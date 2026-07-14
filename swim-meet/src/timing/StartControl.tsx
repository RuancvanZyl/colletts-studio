import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Flag, Timer, Square } from 'lucide-react';
import { useTimingSession } from '@/lib/hooks/useTimingSession';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const PRESETS = [5, 10, 30, 60];

export function StartControl() {
  const { categoryId } = useParams();
  const { session, startCountdown, fireGun, finishSession } = useTimingSession(categoryId);
  const [remaining, setRemaining] = useState<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!session || session.status !== 'countdown' || !session.countdown_started_at || session.countdown_seconds == null) {
      setRemaining(null);
      firedRef.current = false;
      return;
    }
    const startedAt = new Date(session.countdown_started_at).getTime();
    const totalMs = session.countdown_seconds * 1000;

    const tick = () => {
      const left = startedAt + totalMs - Date.now();
      setRemaining(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        fireGun();
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.countdown_started_at, session?.countdown_seconds]);

  const [liveElapsed, setLiveElapsed] = useState('00:00.0');
  useEffect(() => {
    if (!session || session.status !== 'live' || !session.gun_time) return;
    const gun = new Date(session.gun_time).getTime();
    const interval = setInterval(() => {
      const ms = Date.now() - gun;
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const t = Math.floor((ms % 1000) / 100);
      setLiveElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${t}`);
    }, 100);
    return () => clearInterval(interval);
  }, [session?.status, session?.gun_time]);

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-xl font-bold text-white mb-1">Start control</h2>
      <p className="text-white/50 text-sm mb-8">Server clock is authoritative — every station sees the same gun time.</p>

      <Card className="p-10">
        {(!session || session.status === 'scheduled' || session.status === 'staging') && (
          <>
            <Timer className="size-10 text-ocean-400 mx-auto mb-4" />
            <p className="text-white/60 mb-6">Choose a countdown, then start it.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {PRESETS.map((s) => (
                <Button key={s} size="lg" variant="secondary" onClick={() => startCountdown(s)}>
                  {s}s countdown
                </Button>
              ))}
              <Button size="lg" variant="danger" onClick={() => fireGun()}>
                <Flag className="size-5" /> Fire now
              </Button>
            </div>
          </>
        )}

        {session?.status === 'countdown' && remaining !== null && (
          <>
            <p
              className={cn(
                'font-bold tabular-nums leading-none transition-colors',
                remaining <= 3 ? 'text-red-400 animate-pulse-ring text-8xl rounded-full inline-block' : 'text-white text-8xl',
              )}
            >
              {remaining}
            </p>
            <p className="text-white/40 mt-4">Get ready…</p>
          </>
        )}

        {session?.status === 'live' && (
          <>
            <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
              <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </div>
            <p className="text-7xl font-bold text-white tabular-nums font-mono">{liveElapsed}</p>
            <p className="text-white/40 mt-4">Gun fired at {new Date(session.gun_time!).toLocaleTimeString()}</p>
            <Button variant="secondary" className="mt-6" onClick={() => finishSession()}>
              <Square className="size-4" /> End session
            </Button>
          </>
        )}

        {session?.status === 'finished' && (
          <>
            <p className="text-white/70">Session finished.</p>
            <p className="text-white/40 text-sm mt-1">
              Gun: {session.gun_time ? new Date(session.gun_time).toLocaleTimeString() : '—'} · Ended:{' '}
              {session.finished_at ? new Date(session.finished_at).toLocaleTimeString() : '—'}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
