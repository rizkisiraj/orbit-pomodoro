/**
 * Theme picker for the top HUD: one dot per theme painted in that theme's own
 * accent, with a ring on the active one. The names are carried on each dot's
 * label and tooltip rather than shown — the colours are the affordance.
 */
import { useRef } from 'react';
import { playTick } from '../utils/sound';
import { THEMES } from '../utils/theme';
import type { ThemeId } from '../utils/theme';

interface ThemeSwitcherProps {
  theme: ThemeId;
  onTheme: (theme: ThemeId) => void;
}

export function ThemeSwitcher({ theme, onTheme }: ThemeSwitcherProps) {
  const active = THEMES.findIndex((t) => t.id === theme);
  const index = active === -1 ? 0 : active;
  const dotsRef = useRef<HTMLDivElement>(null);

  /** Arrow keys move the selection, as a radio group's keyboard contract. */
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + THEMES.length) % THEMES.length;
    playTick('soft');
    onTheme(THEMES[next].id);
    // Focus follows selection; the roving tabindex below has not been re-rendered
    // yet, so move it by position rather than looking for [tabindex="0"].
    dotsRef.current?.querySelectorAll('button')[next]?.focus();
  }

  return (
    // A radiogroup, not five toggles: exactly one theme is ever active.
    <div
      ref={dotsRef}
      role="radiogroup"
      aria-label="Colour theme"
      onKeyDown={onKeyDown}
      className="st-theme-dots"
    >
      {THEMES.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={i === index}
          aria-label={t.name}
          title={t.name}
          // Roving tabindex: the group is one Tab stop, arrows move inside it.
          tabIndex={i === index ? 0 : -1}
          onClick={() => {
            playTick('soft');
            onTheme(t.id);
          }}
          className={`st-theme-dot${i === index ? ' is-active' : ''}`}
        >
          {/* themes.css keys off `data-theme` on any element, not just the
              root, so the swatch resolves --color-accent to its own theme's
              accent while another theme is active. It is a child rather than
              the button itself so the ring and focus outline around it keep
              using the *page's* palette — otherwise a dark theme's dot drew
              its own dark ground as a halo on the Hull White page. */}
          <span data-theme={t.id} className="st-theme-swatch" />
        </button>
      ))}
    </div>
  );
}
