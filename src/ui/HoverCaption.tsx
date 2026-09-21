import type { PlanetParams } from '../contract/types';

export interface HoverCaptionProps {
  planet: PlanetParams | null;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Bottom caption for a hovered planet — label + time it was started. Wired
 * to `Scene`'s `onHoverPlanet`; no floating tooltips inside the 3D scene
 * itself (PRD §5.1).
 */
export function HoverCaption({ planet }: HoverCaptionProps) {
  return (
    <div
      className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-scrim px-4 py-1.5 font-sans text-xs text-ink transition-opacity duration-300 ease-orbit"
      style={{ opacity: planet ? 1 : 0 }}
      aria-live="polite"
    >
      {planet ? `${planet.label || 'untitled session'} · ${formatTime(planet.startedAt)}` : ''}
    </div>
  );
}
