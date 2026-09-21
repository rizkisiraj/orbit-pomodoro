import { useEffect, useRef, useState } from 'react';
import type { TimerApi } from '../contract/api';

export interface IntentInputProps {
  timer: TimerApi;
  /** Draft intent text, lifted to the parent so Controls' Start button can use it too. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * The label line beneath the timer. Idle: click (or Enter/Space while
 * focused) to open an inline text input; Enter starts the session with
 * whatever was typed (empty is allowed — an unlabeled session is valid);
 * Escape cancels back to the static line. Once a phase is running, the line
 * is read-only — it shows the intent the running session was started with.
 */
export function IntentInput({ timer, value, onChange }: IntentInputProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (timer.phase !== 'idle') {
    return <p className="min-h-[1.5em] font-sans text-sm text-dim">{timer.label || ' '}</p>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            timer.start(value.trim());
            setEditing(false);
          } else if (e.key === 'Escape') {
            setEditing(false);
            onChange('');
          }
        }}
        onBlur={() => setEditing(false)}
        placeholder="what are you focusing on?"
        aria-label="Session intent"
        className="w-full max-w-xs border-b border-accent bg-transparent text-center font-sans text-sm text-ink outline-none placeholder:text-faint"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="min-h-[1.5em] rounded-sm font-sans text-sm text-dim transition-colors duration-300 ease-orbit hover:text-ink focus-visible:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      {value || 'what are you focusing on?'}
    </button>
  );
}
