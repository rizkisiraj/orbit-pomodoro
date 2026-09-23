/**
 * Corner readouts. Sits outside the stage so it never scales with it.
 */
import { useEffect, useRef, useState } from 'react';
import { SET_LENGTH, pad2 } from '../constants';
import { playTick } from '../utils/sound';
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
  /** True only under ?demo=1 in a dev build. Surfaced so a 25-second cycle is
   *  never mistaken for the real pomodoro durations. */
  demo?: boolean;
  paused: boolean;
  /** Set once a focus session completes; recovery waits for BEGIN rather
   *  than starting itself. */
  pendingRest: 'break' | 'long' | null;
  onStart: () => void;
  onStartRest: () => void;
  onAbort: () => void;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
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
  demo = false,
  paused,
  pendingRest,
  onStart,
  onStartRest,
  onAbort,
  onSkip,
  onPause,
  onResume,
}: HudProps) {
  const [editing, setEditing] = useState(false);
  /**
   * Edits live in a draft until committed, so Escape can genuinely cancel.
   * Writing straight through to `label` made Escape a no-op that silently kept
   * whatever had been typed.
   */
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const commitRef = useRef(true);
  const handOffFocus = useRef(false);

  const idle = phase === 'idle';
  const focusing = phase === 'focus';
  const recovering = phase === 'break' || phase === 'long';

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
      return;
    }
    // Hand focus to BEGIN CYCLE once the editor has actually unmounted and the
    // button exists. A rAF here fires before React commits, so focus would
    // fall through to <body> and a keyboard user would lose their place.
    if (handOffFocus.current) {
      handOffFocus.current = false;
      startRef.current?.focus();
    }
  }, [editing]);

  function openEditor() {
    playTick('soft');
    setDraft(label);
    commitRef.current = true;
    setEditing(true);
  }

  function closeEditor(commit: boolean) {
    if (commit) onLabel(draft.trim());
    setEditing(false);
  }

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
                onClick={() => {
                  playTick('soft');
                  onView(tab);
                }}
                aria-current={view === tab ? 'page' : undefined}
                className={`btn btn-ghost st-tab${view === tab ? ' is-active' : ''}`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
          {demo && <div className="st-demo-badge">DEMO · 25s CYCLE</div>}
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
          <div>ENERGY {idle ? 'READY' : paused ? 'HOLDING' : `${Math.round(progress * 100)}%`}</div>
        </div>

        <div className="st-controls">
          {editing && (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              // Blur commits rather than discards — losing typed text to a
              // stray click is the more annoying failure.
              onBlur={() => closeEditor(commitRef.current)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Commit, then hand focus to BEGIN CYCLE. Starting a 25-minute
                  // cycle straight off a text field's Enter is too easy to do
                  // by accident; this keeps it one deliberate keystroke away.
                  handOffFocus.current = true;
                  closeEditor(true);
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  commitRef.current = false;
                  closeEditor(false);
                }
              }}
              placeholder="construction intent"
              aria-label="Construction intent"
              className="input st-intent-input"
            />
          )}

          {!editing && idle && (
            <button
              type="button"
              onClick={openEditor}
              className={`st-intent-button${label ? ' has-label' : ''}`}
            >
              {label ? `INTENT: ${label}` : '+ SET CONSTRUCTION INTENT'}
            </button>
          )}

          {!editing && !idle && (
            <div className="st-intent-static">
              {label ? `INTENT: ${label}` : 'NO INTENT SET'}
            </div>
          )}

          <div className="st-buttons">
            {idle && pendingRest && (
              <>
                <button
                  ref={startRef}
                  type="button"
                  onClick={() => {
                    playTick('press');
                    onStartRest();
                  }}
                  className="btn btn-primary st-begin"
                >
                  {pendingRest === 'long' ? 'START LONG RECOVERY' : 'START RECOVERY'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTick('soft');
                    onSkip();
                  }}
                  className="btn btn-ghost st-secondary"
                >
                  SKIP RECOVERY
                </button>
              </>
            )}
            {idle && !pendingRest && (
              <button
                ref={startRef}
                type="button"
                onClick={() => {
                  playTick('press');
                  onStart();
                }}
                className="btn btn-primary st-begin"
              >
                BEGIN CYCLE
              </button>
            )}
            {(focusing || recovering) && (
              <button
                type="button"
                onClick={() => {
                  playTick('soft');
                  if (paused) onResume();
                  else onPause();
                }}
                className="btn btn-ghost st-secondary"
              >
                {paused ? 'RESUME' : 'PAUSE'}
              </button>
            )}
            {/* Quitting gets the quiet tick, never the confident one. */}
            {focusing && (
              <button
                type="button"
                onClick={() => {
                  playTick('soft');
                  onAbort();
                }}
                className="btn btn-ghost st-secondary"
              >
                ABORT
              </button>
            )}
            {recovering && (
              <button
                type="button"
                onClick={() => {
                  playTick('soft');
                  onSkip();
                }}
                className="btn btn-ghost st-secondary"
              >
                SKIP RECOVERY
              </button>
            )}
          </div>
        </div>

        <div className="st-status" style={{ opacity: status ? 1 : 0 }}>
          {status || ' '}
        </div>
      </div>
    </>
  );
}
