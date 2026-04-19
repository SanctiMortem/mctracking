/**
 * ThemeContext — provides the active skin's tokens to the entire app.
 *
 * Persists the user's theme choice in SecureStore.
 * Defaults to "justice-of-the-light" on first launch.
 *
 * Usage:
 *   const { theme, setThemeId } = useTheme();
 *   // theme.colors, theme.typography, theme.radius, theme.shadows
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import type { AppTheme, ThemeId } from '@/styles/themes/types';
import { themes } from '@/styles/themes';

const STORAGE_KEY = 'mtg_theme_id';
const DEFAULT_THEME: ThemeId = 'justice-of-the-light';

interface ThemeContextValue {
  theme: AppTheme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  ready: boolean;
}

const ThemeCtx = createContext<ThemeContextValue>({
  theme: themes[DEFAULT_THEME],
  themeId: DEFAULT_THEME,
  setThemeId: () => {},
  ready: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (stored && stored in themes) {
          setThemeIdState(stored as ThemeId);
        }
      } catch {
        // Fallback to default
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    SecureStore.setItemAsync(STORAGE_KEY, id).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[themeId],
      themeId,
      setThemeId,
      ready,
    }),
    [themeId, setThemeId, ready],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/** Returns the active theme's full token set + setter to switch skins. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeCtx);
}
