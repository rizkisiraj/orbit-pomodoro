/**
 * Orbital Station — a pomodoro timer that builds a modular space station.
 * Every completed 25-minute cycle docks a module. No accounts, no backend.
 */
import { useState } from 'react';
import '../styles/nocturne.css';
import './orbital.css';
import { Hud } from './components/Hud';
import { LogView } from './components/LogView';
import { StatsView } from './components/StatsView';
import { Station } from './components/Station';
import { useStation } from './useStation';
import type { ViewName } from './types';

export default function App() {
  const [view, setView] = useState<ViewName>('station');
  const station = useStation();

  return (
    <div className="st-root">
      <Station
        completed={station.completed}
        newestId={station.newestId}
        phase={station.phase}
        remaining={station.remaining}
        progress={station.progress}
      />

      <Hud
        view={view}
        onView={setView}
        moduleCount={station.completed.length}
        cycle={station.cycle}
        phase={station.phase}
        progress={station.progress}
        label={station.label}
        onLabel={station.setLabel}
        status={station.status}
        onStart={station.start}
        onAbort={station.abort}
        onSkip={station.skip}
      />

      {view === 'log' && <LogView sessions={station.sessions} />}
      {view === 'stats' && <StatsView sessions={station.sessions} />}
    </div>
  );
}
