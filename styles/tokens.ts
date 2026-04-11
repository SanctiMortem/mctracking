/**
 * Design Tokens — "The Mystic Archive"
 * MTG 5-color (WUBRG) dark theme. Dark-only in MVP.
 *
 * ADR-001: StyleSheet nativo — tokens imported as TS constants.
 * Source: 15_DESIGN.md §0.3 Colors, §0.4 Typography, §0.5 Components, §0.6 Motion
 */

// ─── MTG WUBRG Palette ──────────────────────────────────────────────────────
export const mtgColors = {
  white: '#F9FAF4',
  blue: '#0E68AB',
  black: '#150B00',
  red: '#D3202A',
  green: '#00733E',
  colorless: '#BEB9B2',
} as const;

// ─── Surface / Background ────────────────────────────────────────────────────
export const colors = {
  background: {
    primary: '#0D0D0F',
    secondary: '#1A1A2E',
    surface: '#1E1E3A',
    elevated: '#252542',
    overlay: 'rgba(0,0,0,0.72)',
  },

  // ─── Text ─────────────────────────────────────────────────────────────────
  text: {
    primary: '#F0F0F5',
    secondary: '#9090A8',
    muted: '#505068',
    inverse: '#0D0D0F',
    link: '#7B6FD4',
  },

  // ─── Accent / MTG colors ──────────────────────────────────────────────────
  accent: {
    primary: '#9B59B6',     // App purple accent
    blue: mtgColors.blue,
    red: mtgColors.red,
    green: mtgColors.green,
    white: '#D8D4C8',       // Softened white for dark bg
    black: '#3A2A1E',       // Lightened black for dark bg
    colorless: mtgColors.colorless,
  },

  // ─── Life Total — ranges ──────────────────────────────────────────────────
  lifeTotal: {
    high: '#2ECC71',        // > 20 (safe)
    medium: '#F39C12',      // 10–20 (caution)
    low: '#E67E22',         // 5–9 (danger)
    critical: '#E74C3C',    // 1–4 (critical)
    zero: '#922B21',        // 0 (dead)
  },

  // ─── Status ───────────────────────────────────────────────────────────────
  status: {
    success: '#2ECC71',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3498DB',
  },

  // ─── Border ───────────────────────────────────────────────────────────────
  border: {
    subtle: '#1E1E34',
    default: '#2A2A44',
    strong: '#4A4A70',
    focus: '#7B6FD4',
  },
} as const;

// ─── Spacing (4px base grid) ─────────────────────────────────────────────────
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
// Source: 15_DESIGN.md §0.4
export const typography = {
  size: {
    'display-lg': 72,   // Life total principal (SCR-008)
    'display-sm': 48,   // Vida compacta
    'heading-xl': 32,
    'heading-lg': 24,
    'heading-md': 20,
    'body-lg': 16,
    'body-sm': 14,
    caption: 12,
    label: 10,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
  lineHeight: {
    tight: 1.1,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 999,
} as const;

// ─── Elevation / Shadows ─────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: {
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─── Motion Profile ──────────────────────────────────────────────────────────
// Source: 15_DESIGN.md §0.6 — used with react-native-reanimated
export const motion = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 400,
    glacial: 600,
  },
  easing: {
    // Easing curve names for Reanimated (Easing.bezier(...))
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',   // Material standard
    enter: 'cubic-bezier(0, 0, 0.2, 1)',          // Decelerate
    exit: 'cubic-bezier(0.4, 0, 1, 1)',           // Accelerate
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring overshoot
  },
} as const;
