/**
 * The station diagram. SVG draws all geometry in the -450 -295 900 590 space;
 * module cards are HTML positioned by percentage over the same box.
 */
import {
  CORE_CIRCUMFERENCE,
  CORE_DISC_R,
  CORE_INNER_R,
  CORE_R,
  PHASE_NAME,
  RINGS,
  formatTime,
} from '../constants';
import { linksFor, modulesFor } from '../modules';
import { slotFor } from '../slots';
import { STARS } from '../starfield';
import type { Phase, Session } from '../types';

interface StationProps {
  completed: Session[];
  newestId: string | null;
  phase: Phase;
  remaining: number;
  progress: number;
}

export function Station({ completed, newestId, phase, remaining, progress }: StationProps) {
  const focusing = phase === 'focus';
  const modules = modulesFor(completed, newestId);
  const links = linksFor(completed);
  const next = slotFor(completed.length);

  const dash = `${Math.round(CORE_CIRCUMFERENCE * progress)} ${Math.round(CORE_CIRCUMFERENCE)}`;

  return (
    <div className="st-stage-wrap">
      <div className="st-stage">
        <svg className="st-svg" viewBox="-450 -295 900 590">
          <g fill="none" stroke="var(--color-neutral-800)" strokeWidth="1">
            {RINGS.map((ring) => (
              <ellipse key={ring.rx} cx="0" cy="0" rx={ring.rx} ry={ring.ry} opacity={ring.opacity} />
            ))}
          </g>

          <g fill="var(--color-neutral-600)">
            {STARS.map((star, i) => (
              <circle key={i} cx={star.x} cy={star.y} r={star.r} opacity={star.o} />
            ))}
          </g>

          <g>
            {links.map((link, i) => {
              const isNew = modules[i]?.isNew ?? false;
              const length = Math.hypot(link.x2 - link.x1, link.y2 - link.y1);
              return (
              <g key={i}>
                <line
                  x1={link.x1}
                  y1={link.y1}
                  x2={link.x2}
                  y2={link.y2}
                  stroke={isNew ? 'var(--color-accent)' : 'var(--color-neutral-700)'}
                  strokeWidth="1"
                  className={isNew ? 'st-strut-new' : undefined}
                  style={isNew ? ({ '--st-len': length } as React.CSSProperties) : undefined}
                />
                {/* Energy only flows while building. */}
                <line
                  x1={link.x1}
                  y1={link.y1}
                  x2={link.x2}
                  y2={link.y2}
                  stroke="var(--color-accent)"
                  strokeWidth="1.5"
                  strokeDasharray="6 30"
                  style={
                    focusing
                      ? { animation: 'st-flow 2.4s linear infinite', opacity: 0.9 }
                      : { opacity: 0 }
                  }
                />
                <circle
                  cx={link.x1}
                  cy={link.y1}
                  r="3.5"
                  fill="var(--color-bg)"
                  stroke={isNew ? 'var(--color-accent)' : 'var(--color-neutral-600)'}
                  strokeWidth="1"
                  className={isNew ? 'st-node-new' : undefined}
                />
              </g>
              );
            })}
          </g>

          {/* Where the next module will dock — always visible. */}
          <g
            transform={`translate(${Math.round(next.x)},${Math.round(next.y)})`}
            style={
              focusing ? { animation: 'st-breathe 1.9s ease-in-out infinite' } : { opacity: 0.32 }
            }
          >
            <circle
              cx="0"
              cy="0"
              r="15"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1"
              strokeDasharray="2 5"
            />
            <path d="M -7 0 H 7 M 0 -7 V 7" stroke="var(--color-accent)" strokeWidth="1" />
          </g>

          <g>
            <circle cx="0" cy="0" r={CORE_R} fill="none" stroke="var(--color-neutral-800)" strokeWidth="1" />
            <circle
              cx="0"
              cy="0"
              r={CORE_DISC_R}
              fill="var(--st-core-fill)"
              stroke="var(--color-neutral-700)"
              strokeWidth="1"
            />
            <circle
              cx="0"
              cy="0"
              r={CORE_R}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={dash}
              transform="rotate(-90)"
            />
            <path
              d="M -82 0 H -70 M 82 0 H 70 M 0 -82 V -70 M 0 82 V 70"
              stroke="var(--color-neutral-700)"
              strokeWidth="1"
            />
            <circle
              cx="0"
              cy="0"
              r={CORE_INNER_R}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1"
              opacity="0.26"
              style={focusing ? { animation: 'st-breathe 4.2s ease-in-out infinite' } : undefined}
            />
          </g>
        </svg>

        {modules.map((module) => (
          <div
            key={module.id}
            className={`st-module${module.isNew ? ' is-new' : ''}`}
            style={{ left: module.left, top: module.top }}
          >
            <svg className="st-module-glyph" viewBox="-16 -16 32 32">
              <path
                d={module.glyph}
                fill="none"
                stroke={module.isNew ? 'var(--color-accent)' : 'var(--color-neutral-600)'}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <div style={{ minWidth: 0 }}>
              <div className="st-module-code">{module.code}</div>
              <div className="st-module-status">{module.status}</div>
            </div>
          </div>
        ))}

        <div className="st-core-text">
          <div className="st-core-kicker">CORE</div>
          <div className="st-core-time">{formatTime(remaining)}</div>
          <div
            className="st-core-phase"
            style={{
              color: focusing ? 'var(--color-accent-200)' : 'var(--color-neutral-400)',
            }}
          >
            {PHASE_NAME[phase]}
          </div>
        </div>
      </div>
    </div>
  );
}
