import type { ReactNode } from 'react';
import type { Phase } from '../contract/types';

export interface FocusChromeProps {
  phase: Phase;
  children: ReactNode;
}

/**
 * During focus, everything except the timer and the give-up link fades to
 * ~30% opacity (PRD §5.1). Wrap the chrome that should fade — the intent
 * line, the week/nav bar — and leave Timer/Controls outside it. Reduced
 * motion keeps this fade; only camera drift and orbital motion freeze.
 */
export function FocusChrome({ phase, children }: FocusChromeProps) {
  return (
    <div
      className="transition-opacity duration-[600ms] ease-orbit"
      style={{ opacity: phase === 'focus' ? 0.3 : 1 }}
    >
      {children}
    </div>
  );
}
