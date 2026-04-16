/**
 * AppTheme — shared type for all skins.
 *
 * Every theme exports an object conforming to this interface.
 * The shape mirrors the original `styles/tokens.ts` exports so that
 * existing code can migrate from static imports to `useTheme()` with
 * zero structural changes.
 */

// ─── Color Tokens ────────────────────────────────────────────────────────────

export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    surface: string;
    elevated: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    inverse: string;
    link: string;
  };
  accent: {
    primary: string;
    primaryAlt: string;
    primaryContainer: string;
    onPrimary: string;
    blue: string;
    red: string;
    green: string;
    white: string;
    black: string;
    colorless: string;
  };
  lifeTotal: {
    high: string;
    medium: string;
    low: string;
    critical: string;
    zero: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
    focus: string;
  };
  surfaceVariant: string;
  onSurfaceVariant: string;
}

// ─── Shadow Token ────────────────────────────────────────────────────────────

export interface ThemeShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ThemeShadows {
  sm: ThemeShadow;
  md: ThemeShadow;
  lg: ThemeShadow;
  glow: ThemeShadow;
  glowAlert: ThemeShadow;
}

// ─── Typography ──────────────────────────────────────────────────────────────

export interface ThemeTypography {
  fontFamily: {
    lifeTotal: string;
    lifeTotalBold: string;
    display: string;
    headline: string;
    body: string;
    bodyMedium: string;
  };
  size: {
    'display-lg': number;
    'display-md': number;
    'display-sm': number;
    'heading-xl': number;
    'heading-lg': number;
    'heading-md': number;
    'body-lg': number;
    'body-md': number;
    'body-sm': number;
    caption: number;
    label: number;
  };
  weight: {
    regular: '400';
    medium: '500';
    semibold: '600';
    bold: '700';
    black: '900';
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  letterSpacing: {
    tight: number;
    normal: number;
    wide: number;
    wider: number;
  };
}

// ─── Radius ──────────────────────────────────────────────────────────────────

export interface ThemeRadius {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  round: number;
}

// ─── Full Theme ──────────────────────────────────────────────────────────────

export interface AppTheme {
  /** Unique key stored in AsyncStorage */
  id: ThemeId;
  /** Display name shown in settings picker */
  label: string;
  colors: ThemeColors;
  shadows: ThemeShadows;
  typography: ThemeTypography;
  radius: ThemeRadius;
}

export type ThemeId = 'mystic-archive' | 'justice-of-the-light';
