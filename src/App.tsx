import { useMemo, useState } from 'react';
import { starTier } from '~/contract/constants';
import { mockPlanetsForWeek, mockStats, mockStore, mockTimer } from '~/contract/mock';
import type { PlanetParams } from '~/contract/types';
import type { ViewName } from '~/contract/api';
import { Archive } from './ui/Archive';
import { Controls } from './ui/Controls';
import { FocusChrome } from './ui/FocusChrome';
import { HoverCaption } from './ui/HoverCaption';
import { IntentInput } from './ui/IntentInput';
import { ScenePlaceholder } from './ui/ScenePlaceholder';
import { Stats } from './ui/Stats';
import { Timer } from './ui/Timer';
import { usePrefersReducedMotion } from './ui/hooks/useReducedMotion';

/**
 * INTEGRATION SWAP POINTS in this file:
 *  - `mockTimer`            -> `useTimer()` from `~/timer/useTimer`
 *  - `mockStore`            -> `useStore()` / `useCurrentWeek()` / `useArchive()` /
 *                              `useSettings()` from `~/store/store`
 *  - `mockStats`            -> `computeStats(currentWeek, archive)` from `~/stats/stats`
 *  - planet params below    -> `planetsForWeek(week)` from `~/gen/planet`
 *  - `ScenePlaceholder`     -> `Scene` from `~/scene/Scene` (same SceneProps shape)
 */
export default function App() {
  const [view, setView] = useState<ViewName>('timer');
  const [draftLabel, setDraftLabel] = useState('');
  const [hoveredPlanet, setHoveredPlanet] = useState<PlanetParams | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  // --- fixtures (swap for real hooks at integration, see block comment above) ---
  const timer = mockTimer;
  const store = mockStore;
  const stats = mockStats;
  const currentWeek = store.currentWeek;

  const planets = useMemo(() => mockPlanetsForWeek(currentWeek), [currentWeek]);

  const completedCount = currentWeek.sessions.filter((s) => s.outcome === 'completed').length;
  const tier = starTier(completedCount);
  const focusProgress = timer.phase === 'focus' ? timer.progress : null;

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-void"
      style={{ '--accent-h': currentWeek.baseHue } as React.CSSProperties}
    >
      {/* fixed 3D background layer — swap for <Scene /> at integration */}
      <ScenePlaceholder
        planets={planets}
        starTier={tier}
        baseHue={currentWeek.baseHue}
        focusProgress={focusProgress}
        cinematic={!reducedMotion}
        onHoverPlanet={view === 'timer' ? setHoveredPlanet : undefined}
      />

      {/* contrast scrim: keeps text at 4.5:1 even when a bright body passes behind it */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, var(--color-scrim) 0%, transparent 22%, transparent 68%, var(--color-scrim) 100%)',
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
            <Archive weeks={store.archive} />
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
  timer: typeof mockTimer;
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
