/**
 * ThemeContext — provides the active skin's tokens to the entire app.
 *
 * Persists the user's theme choice in SecureStore.
 * Defaults to "justice-of-the-light" on first launch.
 *
 * Also persists an optional "display font" override (italic serif) so the
 * user can opt-in to Cormorant Garamond instead of the default NotoSerif
 * italic for stats-screen titles and large display numbers. The chosen
 * font only swaps the `displayItalic` + `bodyItalic` typography slots —
 * everything else (display, headline, body) stays on the theme's default.
 *
 * Usage:
 *   const { theme, setThemeId, displayFontId, setDisplayFontId } = useTheme();
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import type { AppTheme, ThemeId } from '@/styles/themes/types';
import { themes } from '@/styles/themes';

const STORAGE_KEY = 'mtg_theme_id';
const DISPLAY_FONT_KEY = 'mtg_display_font_id';
const DEFAULT_THEME: ThemeId = 'justice-of-the-light';

export type DisplayFontId = 'noto-serif' | 'cormorant-garamond';

const DEFAULT_DISPLAY_FONT: DisplayFontId = 'noto-serif';
const VALID_DISPLAY_FONTS: DisplayFontId[] = ['noto-serif', 'cormorant-garamond'];

/**
 * Font-family override applied to a theme when displayFontId !== default.
 * Only the italic-serif slots are swapped.
 */
const DISPLAY_FONT_OVERRIDES: Record<DisplayFontId, { displayItalic: string; bodyItalic: string } | null> = {
  'noto-serif': null,
  'cormorant-garamond': {
    displayItalic: 'CormorantGaramond_600SemiBold_Italic',
    bodyItalic: 'CormorantGaramond_400Regular_Italic',
  },
};

interface ThemeContextValue {
  theme: AppTheme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  displayFontId: DisplayFontId;
  setDisplayFontId: (id: DisplayFontId) => void;
  ready: boolean;
}

const ThemeCtx = createContext<ThemeContextValue>({
  theme: themes[DEFAULT_THEME],
  themeId: DEFAULT_THEME,
  setThemeId: () => {},
  displayFontId: DEFAULT_DISPLAY_FONT,
  setDisplayFontId: () => {},
  ready: false,
});

function applyDisplayFontOverride(base: AppTheme, displayFontId: DisplayFontId): AppTheme {
  const override = DISPLAY_FONT_OVERRIDES[displayFontId];
  if (!override) return base;
  return {
    ...base,
    typography: {
      ...base.typography,
      fontFamily: {
        ...base.typography.fontFamily,
        displayItalic: override.displayItalic,
        bodyItalic: override.bodyItalic,
      },
    },
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME);
  const [displayFontId, setDisplayFontIdState] = useState<DisplayFontId>(DEFAULT_DISPLAY_FONT);
  const [ready, setReady] = useState(false);

  // Load persisted theme + display font on mount in parallel.
  useEffect(() => {
    (async () => {
      try {
        const [storedTheme, storedFont] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEY),
          SecureStore.getItemAsync(DISPLAY_FONT_KEY),
        ]);
        if (storedTheme && storedTheme in themes) {
          setThemeIdState(storedTheme as ThemeId);
        }
        if (storedFont && (VALID_DISPLAY_FONTS as string[]).includes(storedFont)) {
          setDisplayFontIdState(storedFont as DisplayFontId);
        }
      } catch {
        // Fallback to defaults
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    SecureStore.setItemAsync(STORAGE_KEY, id).catch(() => {});
  }, []);

  const setDisplayFontId = useCallback((id: DisplayFontId) => {
    setDisplayFontIdState(id);
    SecureStore.setItemAsync(DISPLAY_FONT_KEY, id).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: applyDisplayFontOverride(themes[themeId], displayFontId),
      themeId,
      setThemeId,
      displayFontId,
      setDisplayFontId,
      ready,
    }),
    [themeId, displayFontId, setThemeId, setDisplayFontId, ready],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/** Returns the active theme's full token set + setters to switch skins / fonts. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeCtx);
}
