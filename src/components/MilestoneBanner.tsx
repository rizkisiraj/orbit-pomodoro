/**
 * Fires when a ring seals — the payoff moment for the whole station. Sits
 * above everything but stays translucent, since the point is to look back at
 * what was just built, not to hide it.
 */
import { useCallback, useEffect, useRef } from 'react';
import { playTick } from '../utils/sound';

interface MilestoneBannerProps {
  /** Present when a milestone is being celebrated; null hides the banner. */
  milestone: { title: string; detail: string } | null;
  /** Fires when the user dismisses. */
  onDismiss: () => void;
}

export function MilestoneBanner({ milestone, onDismiss }: MilestoneBannerProps) {
  const dismissRef = useRef<HTMLButtonElement>(null);

  // Quitting gets the quiet tick, same as every other dismissal in the HUD.
  const dismiss = useCallback(() => {
    playTick('soft');
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!milestone) return;
    // Focusing straight from the effect lands after React has committed the
    // button; a rAF would fire ahead of the commit and drop focus on <body>.
    // <body> is what activeElement reports when nothing holds focus, and it is
    // always connected — treating it as a restore target strands the user
    // exactly where this is meant to stop them landing.
    const active = document.activeElement;
    const previous =
      active instanceof HTMLElement && active !== document.body ? active : null;
    dismissRef.current?.focus();
    return () => {
      // Hand focus back on the way out rather than stranding a keyboard user
      // on <body>. Whatever held focus when the cycle started is usually gone
      // by the time a ring seals — BEGIN CYCLE unmounts and comes back as
      // START RECOVERY — so fall back to the HUD's current primary action.
      if (previous?.isConnected) {
        previous.focus();
        return;
      }
      document.querySelector<HTMLElement>('.st-begin')?.focus();
    };
  }, [milestone]);

  useEffect(() => {
    if (!milestone) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [milestone, dismiss]);

  if (!milestone) return null;

  return (
    // Labelled dialog rather than aria-modal: focus moves in, but nothing
    // traps it here, and claiming modality would hide the HUD from AT falsely.
    <div
      className="st-milestone"
      role="dialog"
      aria-labelledby="st-milestone-title"
      aria-describedby="st-milestone-detail"
    >
      <div className="st-milestone-inner">
        {/* Not "RING SEALED" — the final milestone of a build completes the
            whole station, and the kicker has to stay true for both. */}
        <div className="st-kicker">MILESTONE</div>
        <h1 className="st-milestone-title" id="st-milestone-title">
          {milestone.title}
        </h1>
        <p className="st-milestone-detail" id="st-milestone-detail">
          {milestone.detail}
        </p>
        <button
          ref={dismissRef}
          type="button"
          onClick={dismiss}
          className="btn btn-primary st-milestone-dismiss"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
