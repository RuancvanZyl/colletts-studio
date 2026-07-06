import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../lib/auth';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '../../ui/accordion';
import {
  RotateCcw, CheckCircle2, Flame, ShieldAlert, Dumbbell,
} from 'lucide-react';

type ExerciseCategory = 'warmup' | 'core' | 'lower-back' | 'cooldown';

interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  dose: string;
  benefit: string;
  cues: string[];
}

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  'warmup':     'Warm-Up',
  'core':       'Core',
  'lower-back': 'Lower Back',
  'cooldown':   'Cool-Down & Stretch',
};

const EXERCISES: Exercise[] = [
  {
    id: 'cat-cow', category: 'warmup', name: 'Cat-Cow Stretch', dose: '10 reps',
    benefit: 'Mobilises the spine before bending or lifting capes and skulls.',
    cues: ['On hands and knees, alternate arching and rounding your back', 'Move slowly, breathe out as you round'],
  },
  {
    id: 'hip-circles', category: 'warmup', name: 'Hip Circles', dose: '10 each direction',
    benefit: 'Loosens the hips so the lower back takes less strain during long standing tasks.',
    cues: ['Hands on hips, feet shoulder-width apart', 'Circle hips slowly, keep knees soft'],
  },
  {
    id: 'side-bends', category: 'warmup', name: 'Standing Side Bends', dose: '10 each side',
    benefit: 'Warms up the obliques used to stabilise the trunk when carrying mounts.',
    cues: ['Reach one arm overhead and lean sideways', 'Keep hips facing forward'],
  },
  {
    id: 'plank', category: 'core', name: 'Plank', dose: '3 x 30-45s',
    benefit: 'Deep core stability that protects the spine whenever you lift.',
    cues: ['Forearms down, body in one straight line', 'Squeeze glutes, don’t let hips sag'],
  },
  {
    id: 'dead-bug', category: 'core', name: 'Dead Bug', dose: '3 x 12 each side',
    benefit: 'Trains the core to resist over-arching — key for bent-over mounting work.',
    cues: ['Lie on back, arms up, knees at 90°', 'Lower opposite arm and leg, keep low back flat on the floor'],
  },
  {
    id: 'bird-dog', category: 'core', name: 'Bird Dog', dose: '3 x 10 each side',
    benefit: 'Builds spinal stability and balance for reaching across the workbench.',
    cues: ['On hands and knees, extend opposite arm and leg', 'Keep hips level, don’t twist'],
  },
  {
    id: 'pallof-press', category: 'core', name: 'Pallof Press', dose: '3 x 12 each side',
    benefit: 'Anti-rotation strength for carrying uneven loads like capes and skulls.',
    cues: ['Hold a band anchored to your side at chest height', 'Press straight out, resist the pull rotating you'],
  },
  {
    id: 'superman', category: 'lower-back', name: 'Superman Hold', dose: '3 x 20s',
    benefit: 'Strengthens the erector spinae muscles that support the lower back.',
    cues: ['Lie face down, lift arms, chest and legs slightly off the floor', 'Squeeze glutes and back, don’t strain the neck'],
  },
  {
    id: 'glute-bridge', category: 'lower-back', name: 'Glute Bridge', dose: '3 x 15',
    benefit: 'Activates the glutes so they — not the lower back — do the work when lifting.',
    cues: ['Lie on back, knees bent, feet flat', 'Drive through heels, squeeze glutes at the top'],
  },
  {
    id: 'good-morning', category: 'lower-back', name: 'Bodyweight Good Morning', dose: '3 x 12',
    benefit: 'Teaches the hip-hinge pattern, reducing disc load when lifting off tables.',
    cues: ['Feet hip-width, soft knees, hands behind head', 'Hinge at the hips keeping back flat, chest up'],
  },
  {
    id: 'prone-cobra', category: 'lower-back', name: 'Prone Cobra', dose: '3 x 12',
    benefit: 'Builds endurance in the postural muscles used during long finishing sessions.',
    cues: ['Lie face down, thumbs up, arms out at shoulder height', 'Lift chest and arms slightly, squeeze shoulder blades'],
  },
  {
    id: 'childs-pose', category: 'cooldown', name: 'Child’s Pose', dose: '45s',
    benefit: 'Releases tension built up in the lower back after standing work.',
    cues: ['Kneel and sit back onto heels, reach arms forward', 'Breathe deeply, let the back relax'],
  },
  {
    id: 'knee-to-chest', category: 'cooldown', name: 'Knee-to-Chest Stretch', dose: '30s each leg',
    benefit: 'Decompresses the lower spine at the end of a shift.',
    cues: ['Lie on back, pull one knee toward your chest', 'Keep the other leg extended or bent, whichever is comfortable'],
  },
  {
    id: 'spinal-twist', category: 'cooldown', name: 'Seated Spinal Twist', dose: '30s each side',
    benefit: 'Restores rotational mobility lost from repetitive one-sided tasks.',
    cues: ['Sit tall, cross one foot over the opposite knee', 'Twist toward the bent knee, look over your shoulder'],
  },
  {
    id: 'hamstring-stretch', category: 'cooldown', name: 'Standing Hamstring Stretch', dose: '30s each leg',
    benefit: 'Tight hamstrings pull on the pelvis and load the lower back — this keeps them loose.',
    cues: ['Prop heel on a low step, keep back straight', 'Hinge forward from the hips until you feel a stretch'],
  },
];

const TIPS = [
  'Hinge at the hips, not the waist, when lifting capes or skulls off the table.',
  'Keep loads close to your body when carrying mounts to storage.',
  'Brace your core before any lift — as if bracing for a tap to the stomach.',
  'Alternate standing tasks with brief movement breaks every 30–45 minutes.',
  'Use adjustable-height tables or stands to avoid prolonged forward bending.',
  'Ask for a hand with anything awkward or heavy — don’t twist while lifting.',
];

const CATEGORY_ORDER: ExerciseCategory[] = ['warmup', 'core', 'lower-back', 'cooldown'];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StaffWellness() {
  const { profile } = useAuth();
  const storageKey = `wellness-routine-${profile?.id ?? 'guest'}-${todayKey()}`;

  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setDone(raw ? JSON.parse(raw) : {});
    } catch {
      setDone({});
    }
  }, [storageKey]);

  function toggle(id: string) {
    setDone(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function resetToday() {
    setDone({});
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }

  const completedCount = useMemo(() => Object.values(done).filter(Boolean).length, [done]);
  const progressPct = Math.round((completedCount / EXERCISES.length) * 100);

  const byCategory = useMemo(() => {
    const map: Record<ExerciseCategory, Exercise[]> = { warmup: [], core: [], 'lower-back': [], cooldown: [] };
    for (const ex of EXERCISES) map[ex.category].push(ex);
    return map;
  }, []);

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-[#3AAECC]" />
            Lower Back &amp; Core Routine
          </h1>
          <p className="text-slate-500 text-sm">Daily exercises to protect your back on the workshop floor</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToday}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" />
            Today’s progress
          </span>
          <span className="text-slate-500">{completedCount} / {EXERCISES.length}</span>
        </div>
        <Progress value={progressPct} />
      </div>

      <Tabs defaultValue="routine">
        <TabsList>
          <TabsTrigger value="routine">Routine</TabsTrigger>
          <TabsTrigger value="tips">Injury Prevention</TabsTrigger>
        </TabsList>

        <TabsContent value="routine" className="space-y-4 mt-3">
          {CATEGORY_ORDER.map(cat => (
            <div key={cat}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-1 mb-1.5">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Accordion type="single" collapsible className="px-4">
                  {byCategory[cat].map(ex => {
                    const isDone = !!done[ex.id];
                    return (
                      <AccordionItem key={ex.id} value={ex.id}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggle(ex.id); }}
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isDone
                                ? 'bg-green-500 border-green-500'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </button>
                          <AccordionTrigger className="py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                                {ex.name}
                              </span>
                              <Badge variant="secondary" className="text-[10px]">{ex.dose}</Badge>
                            </div>
                          </AccordionTrigger>
                        </div>
                        <AccordionContent className="pl-9 space-y-2">
                          <p className="text-sm text-slate-600 dark:text-slate-300">{ex.benefit}</p>
                          <ul className="list-disc pl-4 space-y-1">
                            {ex.cues.map((c, i) => (
                              <li key={i} className="text-xs text-slate-500 dark:text-slate-400">{c}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="tips" className="mt-3">
          <div className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              On the floor
            </p>
            <ul className="space-y-2.5">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3AAECC] mt-1.5 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
