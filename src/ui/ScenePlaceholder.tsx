import { useMemo } from 'react';
import type { SceneProps } from '../contract/api';

/**
 * INTEGRATION SWAP POINT.
 *
 * Stand-in for VIEW-2's `src/scene/Scene.tsx`. Typed against the frozen
 * `SceneProps` contract so the eventual swap is a pure import change:
 *
 *   import { Scene } from '~/scene/Scene';
 *   ...
 *   <Scene {...sceneProps} />
 *
 * everywhere this component is used (App.tsx main view, Archive.tsx
 * thumbnails). Renders a flat, static approximation of the star system so
 * the DOM layer can be built and reviewed without depending on the R3F
 * canvas being ready.
 */
export function ScenePlaceholder({
  planets,
  starTier,
  baseHue,
  focusProgress,
  thumbnail = false,
  onHoverPlanet,
}: SceneProps) {
  const dots = useMemo(
    () =>
      planets.map((p, i) => {
        const angle = p.startAngle;
        const r = 8 + (p.orbitRadius / 12) * 42;
        const x = 50 + Math.cos(angle) * r;
        const y = 50 + Math.sin(angle) * r * 0.42;
        return { planet: p, x, y, size: 4 + p.bodyRadius * 14, hue: p.hue, key: `${p.id}-${i}` };
      }),
    [planets],
  );

  const starSize = thumbnail ? 10 : 16 + starTier * 4;
  const starGlow = 0.35 + starTier * 0.12;
  const focusScale = focusProgress != null ? 1 + focusProgress * 0.15 : 1;

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-void"
      style={{
        background:
          'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.03), transparent 60%), var(--color-void)',
      }}
      aria-hidden="true"
    >
      {/* static starfield approximation */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5) 50%, transparent 51%),' +
            'radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.35) 50%, transparent 51%),' +
            'radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,0.4) 50%, transparent 51%),' +
            'radial-gradient(1px 1px at 85% 20%, rgba(255,255,255,0.3) 50%, transparent 51%),' +
            'radial-gradient(1.5px 1.5px at 55% 15%, rgba(255,255,255,0.45) 50%, transparent 51%)',
          backgroundSize: '100% 100%',
        }}
      />

      {/* star */}
      <div
        className="absolute rounded-full"
        style={{
          left: '50%',
          top: '45%',
          width: starSize * focusScale,
          height: starSize * focusScale,
          transform: 'translate(-50%, -50%)',
          background: `hsl(${baseHue} 80% ${70 + starTier * 4}%)`,
          boxShadow: `0 0 ${starSize * 2}px hsl(${baseHue} 90% 70% / ${starGlow})`,
        }}
      />

      {/* planets, flattened to a 2D approximation */}
      {dots.map((d) => (
        <div
          key={d.key}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: Math.max(d.size, thumbnail ? d.size : 14),
            height: Math.max(d.size, thumbnail ? d.size : 14),
            transform: 'translate(-50%, -50%)',
            pointerEvents: thumbnail || !onHoverPlanet ? 'none' : 'auto',
          }}
          onMouseEnter={() => onHoverPlanet?.(d.planet)}
          onMouseLeave={() => onHoverPlanet?.(null)}
        >
          <div
            className="absolute inset-0 m-auto rounded-full"
            style={{
              width: d.size,
              height: d.size,
              background: `hsl(${d.hue} 55% 62%)`,
              boxShadow: `0 0 ${d.size}px hsl(${d.hue} 55% 62% / 0.35)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
