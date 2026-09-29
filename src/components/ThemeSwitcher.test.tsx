// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ThemeSwitcher } from './ThemeSwitcher';
import { THEMES } from '../utils/theme';

vi.mock('../utils/sound', () => ({
  playTick: vi.fn(),
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('ThemeSwitcher', () => {
  test('renders one dot per theme, each scoped to its own palette', () => {
    render(<ThemeSwitcher theme="nocturne" onTheme={vi.fn()} />);
    const dots = screen.getAllByRole('radio');
    expect(dots).toHaveLength(THEMES.length);
    // The accent comes from themes.css keying off the swatch's attribute, not
    // from an inline colour — so the attribute is what there is to assert.
    const swatches = dots.map((d) => d.querySelector('.st-theme-swatch'));
    expect(swatches.map((s) => (s as HTMLElement | null)?.dataset.theme)).toEqual(
      THEMES.map((t) => t.id),
    );
  });

  test('marks the active theme, and names them only for assistive tech', () => {
    render(<ThemeSwitcher theme="sodium" onTheme={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'SODIUM CONSOLE' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getByRole('radio', { name: 'CRYO CYAN' }).getAttribute('aria-checked')).toBe(
      'false',
    );
    // The names are labels, not visible text — the colours carry the meaning.
    expect(screen.queryByText('SODIUM CONSOLE')).toBeNull();
  });

  test('selects a theme on click', () => {
    const onTheme = vi.fn();
    render(<ThemeSwitcher theme="nocturne" onTheme={onTheme} />);
    fireEvent.click(screen.getByRole('radio', { name: 'HULL WHITE' }));
    expect(onTheme).toHaveBeenCalledWith('hull');
  });

  test('arrow keys move the selection and wrap around', () => {
    const onTheme = vi.fn();
    const { rerender } = render(<ThemeSwitcher theme="nocturne" onTheme={onTheme} />);
    const group = screen.getByRole('radiogroup');

    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onTheme).toHaveBeenLastCalledWith('cryo');

    // Left from the first theme wraps to the last, not past the end.
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onTheme).toHaveBeenLastCalledWith('life');

    rerender(<ThemeSwitcher theme="life" onTheme={onTheme} />);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(onTheme).toHaveBeenLastCalledWith('nocturne');
  });

  test('is a single tab stop with focus on the active dot', () => {
    render(<ThemeSwitcher theme="cryo" onTheme={vi.fn()} />);
    const tabbable = screen.getAllByRole('radio').filter((d) => d.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute('aria-label')).toBe('CRYO CYAN');
  });

  test('moves focus with the selection so the keyboard does not get stranded', () => {
    const onTheme = vi.fn();
    render(<ThemeSwitcher theme="nocturne" onTheme={onTheme} />);
    const dots = screen.getAllByRole('radio');
    dots[0].focus();
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(dots[1]);
  });
});
