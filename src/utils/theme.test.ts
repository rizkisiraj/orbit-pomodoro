// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { THEME_KEY } from '../constants';
import { DEFAULT_THEME, THEMES, applyTheme, isThemeId, readTheme, saveTheme } from './theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('defaults to nocturne with nothing stored', () => {
    expect(readTheme()).toBe('nocturne');
    expect(DEFAULT_THEME).toBe('nocturne');
  });

  it('round-trips every theme through storage', () => {
    for (const theme of THEMES) {
      saveTheme(theme.id);
      expect(localStorage.getItem(THEME_KEY)).toBe(theme.id);
      expect(readTheme()).toBe(theme.id);
    }
  });

  it('falls back to the default on an unknown stored value', () => {
    localStorage.setItem(THEME_KEY, 'chartreuse');
    expect(readTheme()).toBe(DEFAULT_THEME);
  });

  it('writes the theme onto the document root, where the page ground lives', () => {
    applyTheme('cryo');
    expect(document.documentElement.dataset.theme).toBe('cryo');
    applyTheme('hull');
    expect(document.documentElement.dataset.theme).toBe('hull');
  });

  it('accepts only the five defined ids', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['nocturne', 'cryo', 'sodium', 'hull', 'life']);
    expect(isThemeId('life')).toBe(true);
    expect(isThemeId('LIFE')).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });

  it('names every theme for the switcher label', () => {
    for (const theme of THEMES) expect(theme.name).toMatch(/^[A-Z ]+$/);
  });
});
