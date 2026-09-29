/**
 * Holds the active theme. The attribute is applied at module load in main.tsx
 * too, so the first paint is already themed and there is no flash of Nocturne
 * for someone whose saved theme is something else.
 */
import { useCallback, useState } from 'react';
import { applyTheme, readTheme, saveTheme } from '../utils/theme';
import type { ThemeId } from '../utils/theme';

export function useTheme(): { theme: ThemeId; setTheme: (theme: ThemeId) => void } {
  const [theme, setThemeState] = useState<ThemeId>(readTheme);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    applyTheme(next);
    saveTheme(next);
  }, []);

  return { theme, setTheme };
}
