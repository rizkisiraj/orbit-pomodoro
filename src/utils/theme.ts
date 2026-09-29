/**
 * Theme selection. Five palettes defined in src/styles/themes.css; this module
 * owns which one is active, persisting it under `orbital.theme` and writing
 * `data-theme` onto <html> (the page ground lives on html/body, so the
 * attribute cannot sit any lower).
 *
 * No colours here: ids and display names only. The switcher's dots get their
 * accents by carrying `data-theme` themselves, so the palettes stay in one file.
 */
import { THEME_KEY } from '../constants';

export interface ThemeDef {
  id: ThemeId;
  /** Shown beside the dots in the HUD. */
  name: string;
}

export type ThemeId = 'nocturne' | 'cryo' | 'sodium' | 'hull' | 'life';

export const THEMES: readonly ThemeDef[] = [
  { id: 'nocturne', name: 'NOCTURNE BLURPLE' },
  { id: 'cryo', name: 'CRYO CYAN' },
  { id: 'sodium', name: 'SODIUM CONSOLE' },
  { id: 'hull', name: 'HULL WHITE' },
  { id: 'life', name: 'LIFE SUPPORT' },
];

export const DEFAULT_THEME: ThemeId = 'nocturne';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

/** The stored theme, or the default when storage is absent, blocked or stale. */
export function readTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(id: ThemeId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = id;
}

export function saveTheme(id: ThemeId): void {
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    // Storage full or blocked (private mode). The choice still applies for
    // this visit; only remembering it is lost.
  }
}
