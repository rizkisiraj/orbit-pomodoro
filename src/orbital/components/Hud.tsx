/**
 * Corner readouts. Sits outside the stage so it never scales with it.
 */
import { useEffect, useRef, useState } from 'react';
import { SET_LENGTH, pad2 } from '../constants';
import type { Phase, ViewName } from '../types';

interface HudProps {
  view: ViewName;
  onView: (view: ViewName) => void;
  moduleCount: number;
  cycle: number;
  phase: Phase;
  progress: number;
  label: string;
  onLabel: (label: string) => void;
  status: string;
  onStart: () => void;
  onAbort: () => void;
  onSkip: () => void;
}

const TABS: ViewName[] = ['station', 'log', 'stats'];

export function Hud({
  view,
  onView,
  moduleCount,
  cycle,
  phase,
  progress,
  label,
  onLabel,
  status,
  onStart,
  onAbort,
  onSkip,
}: HudProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const idle = phase === 'idle';
  const focusing = phase === 'focus';
  const recovering = phase === 'break' || phase === 'long';

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const labelText = idle
    ? label || 'SET CONSTRUCTION INTENT'
    : label
      ? `INTENT: ${label}`
      : 'NO INTENT SET';

  return (
    <>
      <div className="st-hud st-hud-top">
        <div className="st-hud-stack">
          <div className="st-hud-title">ORBITAL / {pad2(Math.min(99, moduleCount))}</div>
          <div>SECTOR A-{pad2(4 + (moduleCount % 9))}</div>
        </div>
        <div className="st-hud-right">
          <div className="st-tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onView(tab)}
                className={`btn btn-ghost st-tab${view === tab ? ' is-active' : ''}`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="st-online">
            SYSTEM ONLINE
            <span className="st-dot" />
          </div>
        </div>
      </div>

      <div className="st-hud st-hud-bottom">
        <div className="st-hud-stack">
          <div>MODULES {pad2(moduleCount)}</div>
          <div>
            CYCLE {pad2(cycle + 1)} / {pad2(SET_LENGTH)}
          </div>
          <div>ENERGY {idle ? 'READY' : `${Math.round(progress * 100)}%`}</div>
        </div>

        <div className="st-controls">
          {editing && (
            <input
              ref={inputRef}
              value={label}
              onChange={(e) => onLabel(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                // Enter commits the intent AND starts the cycle.
                if (e.key === 'Enter') {
                  setEditing(false);
                  onStart();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              placeholder="construction intent"
              className="input st-intent-input"
            />
          )}

          {!editing && idle && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn btn-ghost st-intent-button"
              style={{ color: label ? 'var(--color-neutral-100)' : 'var(--color-neutral-400)' }}
            >
              {labelText}
            </button>
          )}

          {!editing && !idle && <div className="st-intent-static">{labelText}</div>}

          <div className="st-buttons">
            {idle && (
              <button type="button" onClick={onStart} className="btn btn-primary st-begin">
                BEGIN CYCLE
              </button>
            )}
            {focusing && (
              <button type="button" onClick={onAbort} className="btn btn-ghost st-secondary">
                ABORT
              </button>
            )}
            {recovering && (
              <button type="button" onClick={onSkip} className="btn btn-ghost st-secondary">
                SKIP RECOVERY
              </button>
            )}
          </div>
        </div>

        <div className="st-status" style={{ opacity: status ? 1 : 0 }}>
          {status || ' '}
        </div>
      </div>
    </>
  );
}
