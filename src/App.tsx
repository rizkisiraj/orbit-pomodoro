import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { starTier } from '~/contract/constants';
import type { PlanetParams, TimerApi } from '~/contract/types';
import type { ViewName } from '~/contract/api';
import { playChime } from '~/audio/chime';
import { planetsForWeek } from '~/gen/planet';
import { notify, requestNotificationPermission } from '~/notify/notify';
import { computeStats } from '~/stats/stats';
import { useArchive, useCurrentWeek, useSettings, useStore } from '~/store/store';
import { Scene } from '~/scene/Scene';
import { useTimer, type PhaseEndEvent } from '~/timer/useTimer';
import { Archive } from './ui/Archive';
import { Controls } from './ui/Controls';
import { FocusChrome } from './ui/FocusChrome';
import { HoverCaption } from './ui/HoverCaption';
import { IntentInput } from './ui/IntentInput';
import { Stats } from './ui/Stats';
import { Timer } from './ui/Timer';
import { usePrefersReducedMotion } from './ui/hooks/useReducedMotion';

/** How long the shatter animation runs before the scene settles. PRD §3. */
const SHATTER_MS = 1200;

export default function App() {
  const [view, setView] = useState<ViewName>('timer');
  const [draftLabel, setDraftLabel] = useState('');
  const [hoveredPlanet, setHoveredPlanet] = useState<PlanetParams | null>(null);
  const [shattering, setShattering] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const currentWeek = useCurrentWeek();
  const archive = useArchive();
  const settings = useSettings();
  const recordSession = useStore((s) => s.recordSession);
  const addMoonToLatest = useStore((s) => s.addMoonToLatest);
  const addRingToLatest = useStore((s) => s.addRingToLatest);
  const rolloverIfNeeded = useStore((s) => s.rolloverIfNeeded);

  // Seal last week into the archive on boot, and again whenever the tab is
  // refocused — a tab left open across Sunday midnight must not keep writing
  // into a week that has already ended.
  useEffect(() => {
    rolloverIfNeeded();
    const onVisible = () => {
      if (!document.hidden) rolloverIfNeeded();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [rolloverIfNeeded]);

  const shatterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (shatterTimeout.current) clearTimeout(shatterTimeout.current);
    },
    [],
  );

  const sound = settings.sound;
  const notifications = settings.notifications;

  // The single integration seam. See the wiring table in ~/contract/api.
  const onPhaseEnd = useCallback(
    (event: PhaseEndEvent) => {
      switch (event.type) {
        case 'focusCompleted':
          recordSession(event.session);
          if (sound) playChime('focusEnd');
          if (notifications) notify('Focus complete', 'A planet has joined your system.');
          break;
        case 'focusAbandoned':
          recordSession(event.session);
          setShattering(true);
          shatterTimeout.current = setTimeout(() => setShattering(false), SHATTER_MS);
          break;
        case 'shortBreakCompleted':
          addMoonToLatest();
          if (sound) playChime('breakEnd');
          if (notifications) notify('Break over', 'Back to it.');
          break;
        case 'longBreakCompleted':
          addRingToLatest();
          if (sound) playChime('breakEnd');
          if (notifications) notify('Break over', 'Back to it.');
          break;
        // focusCancelled (free cancel inside the grace period) and the two
        // *Skipped events are deliberately silent — nothing is recorded and
        // nothing is awarded.
        default:
          break;
      }
    },
    [recordSession, addMoonToLatest, addRingToLatest, sound, notifications],
  );

  const timer = useTimer({ onPhaseEnd });

  // Permission is requested on first Start, never on page load. PRD §7.
  const phase = timer.phase;
  const askedForPermission = useRef(false);
  useEffect(() => {
    if (phase === 'focus' && notifications && !askedForPermission.current) {
      askedForPermission.current = true;
      void requestNotificationPermission();
    }
  }, [phase, notifications]);

  const stats = useMemo(
    () => computeStats(currentWeek, archive),
    [currentWeek, archive],
  );

  const planets = useMemo(() => planetsForWeek(currentWeek), [currentWeek]);

  const completedCount = currentWeek.sessions.filter((s) => s.outcome === 'completed').length;
  const tier = starTier(completedCount);
  const focusProgress = timer.phase === 'focus' ? timer.progress : null;

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-void"
      style={{ '--accent-h': currentWeek.baseHue } as React.CSSProperties}
    >
      {/* fixed 3D background layer */}
      <Scene
        planets={planets}
        starTier={tier}
        baseHue={currentWeek.baseHue}
        focusProgress={focusProgress}
        shattering={shattering}
        cinematic={!reducedMotion}
        onHoverPlanet={view === 'timer' ? setHoveredPlanet : undefined}
      />

      {/* contrast scrim: keeps text at 4.5:1 even when a bright body passes behind it.
          Archive/Stats are text-first reading surfaces, so they get a near-opaque
          scrim rather than the timer view's light top/bottom gradient. */}
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-[600ms] ease-orbit"
        style={{
          background:
            view === 'timer'
              ? 'linear-gradient(to bottom, var(--color-scrim) 0%, transparent 22%, transparent 68%, var(--color-scrim) 100%)'
              : 'var(--color-void)',
          opacity: view === 'timer' ? 1 : 0.82,
        }}
      />

      <div className="relative z-10 h-full w-full">
        {view === 'timer' && (
          <TimerView
            timer={timer}
            draftLabel={draftLabel}
            onDraftChange={setDraftLabel}
            weekLabel={currentWeek.isoWeek}
            planetCount={completedCount}
            onNavigate={setView}
          />
        )}
        {view === 'archive' && (
          <div className="h-full">
            <NavBack onNavigate={setView} />
            <Archive weeks={archive} />
          </div>
        )}
        {view === 'stats' && (
          <div className="h-full">
            <NavBack onNavigate={setView} />
            <Stats stats={stats} />
          </div>
        )}
      </div>

      {view === 'timer' && <HoverCaption planet={hoveredPlanet} />}
    </div>
  );
}

interface TimerViewProps {
  timer: TimerApi;
  draftLabel: string;
  onDraftChange: (v: string) => void;
  weekLabel: string;
  planetCount: number;
  onNavigate: (v: ViewName) => void;
}

function TimerView({
  timer,
  draftLabel,
  onDraftChange,
  weekLabel,
  planetCount,
  onNavigate,
}: TimerViewProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6">
      <Timer timer={timer} />

      <FocusChrome phase={timer.phase}>
        <IntentInput timer={timer} value={draftLabel} onChange={onDraftChange} />
      </FocusChrome>

      <div className="mt-2">
        <Controls timer={timer} pendingLabel={draftLabel} />
      </div>

      <FocusChrome phase={timer.phase}>
        <div className="fixed inset-x-0 bottom-0 flex items-center justify-between px-5 py-5 sm:px-8">
          <p className="font-sans text-xs text-dim">
            wk {weekLabel.slice(-2)} · {planetCount} planet{planetCount === 1 ? '' : 's'}
          </p>
          <nav className="flex gap-5">
            <button
              type="button"
              onClick={() => onNavigate('archive')}
              className="font-sans text-xs text-dim underline decoration-faint underline-offset-4 transition-colors duration-300 ease-orbit hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              archive
            </button>
            <button
              type="button"
              onClick={() => onNavigate('stats')}
              className="font-sans text-xs text-dim underline decoration-faint underline-offset-4 transition-colors duration-300 ease-orbit hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              stats
            </button>
          </nav>
        </div>
      </FocusChrome>
    </div>
  );
}

function NavBack({ onNavigate }: { onNavigate: (v: ViewName) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate('timer')}
      className="absolute left-5 top-5 z-10 font-sans text-xs text-dim underline decoration-faint underline-offset-4 transition-colors duration-300 ease-orbit hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent sm:left-8 sm:top-8"
    >
      back
    </button>
  );
}
