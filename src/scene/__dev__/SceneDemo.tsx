/**
 * Standalone dev harness for the scene, isolated from App.tsx (owned by
 * VIEW-1). Renders `<Scene>` against the frozen fixtures with a couple of
 * on-screen controls to eyeball focus/shatter/tier behaviour and switch
 * between the 9-planet and 20-planet fixtures.
 *
 * Not part of the app bundle — only reachable via `__dev__/index.html`.
 */
import { useEffect, useState } from 'react';
import {
  mockFullWeekPlanets,
  mockPlanets,
  mockStore,
} from '~/contract/mock';
import type { PlanetParams } from '~/contract/types';
import { Scene } from '../Scene';

export function SceneDemo() {
  const [fixture, setFixture] = useState<'typical' | 'full'>('typical');
  const [starTier, setStarTier] = useState(2);
  const [focusProgress, setFocusProgress] = useState<number | null>(null);
  const [shattering, setShattering] = useState(false);
  const [cinematic, setCinematic] = useState(true);
  const [thumbnail, setThumbnail] = useState(false);
  const [hovered, setHovered] = useState<PlanetParams | null>(null);
  const [fps, setFps] = useState(0);

  const planets = fixture === 'typical' ? mockPlanets : mockFullWeekPlanets;
  const baseHue = mockStore.currentWeek.baseHue;

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <Scene
        planets={planets}
        starTier={starTier}
        baseHue={baseHue}
        focusProgress={focusProgress}
        shattering={shattering}
        cinematic={cinematic}
        thumbnail={thumbnail}
        onHoverPlanet={setHovered}
      />
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(0,0,0,0.6)',
          color: '#eee',
          font: '12px monospace',
          padding: '10px 12px',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxWidth: 260,
        }}
      >
        <div>fps: {fps} · planets: {planets.length}</div>
        <label>
          fixture:{' '}
          <select value={fixture} onChange={(e) => setFixture(e.target.value as 'typical' | 'full')}>
            <option value="typical">typical (9)</option>
            <option value="full">full week (20)</option>
          </select>
        </label>
        <label>
          starTier: {starTier}
          <input
            type="range"
            min={0}
            max={5}
            value={starTier}
            onChange={(e) => setStarTier(Number(e.target.value))}
          />
        </label>
        <label>
          focusProgress: {focusProgress === null ? 'null' : focusProgress.toFixed(2)}
          <input
            type="range"
            min={0}
            max={100}
            value={focusProgress === null ? 0 : focusProgress * 100}
            onChange={(e) => setFocusProgress(Number(e.target.value) / 100)}
          />
        </label>
        <button type="button" onClick={() => setFocusProgress((p) => (p === null ? 0.01 : null))}>
          {focusProgress === null ? 'start focus' : 'clear focus'}
        </button>
        <button
          type="button"
          onClick={() => {
            setFocusProgress(0.5);
            setShattering(true);
            setTimeout(() => {
              setShattering(false);
              setFocusProgress(null);
            }, 1300);
          }}
        >
          trigger shatter
        </button>
        <label>
          <input type="checkbox" checked={cinematic} onChange={(e) => setCinematic(e.target.checked)} />
          cinematic
        </label>
        <label>
          <input type="checkbox" checked={thumbnail} onChange={(e) => setThumbnail(e.target.checked)} />
          thumbnail mode
        </label>
        <div>hovered: {hovered ? hovered.label || hovered.id : '—'}</div>
      </div>
    </div>
  );
}
