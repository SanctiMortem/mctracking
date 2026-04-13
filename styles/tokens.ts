/**
 * Design Tokens — "The Mystic Archive"
 * Source: docs/planning/15_DESIGN.md + UI_Stitch/aether_archway/DESIGN.md
 *
 * Warm amber/brown/gold palette. Dark-only MVP.
 * "The Relic Narrative" — digital grimoire, not a spreadsheet.
 *
 * ADR-001: StyleSheet nativo — tokens imported as TS constants.
 */

// ─── MTG WUBRG Palette ──────────────────────────────────────────────────────
export const mtgColors = {
  white: '#f5f0d0',
  blue: '#3a7bd5',
  black: '#6b6b7e',
  red: '#d4380d',
  green: '#2d7d2d',
  colorless: '#9ca3af',
  gold: '#eebf73',         // Multicolor (3+ colors)
} as const;

// ─── Surface / Background (Layering Principle) ──────────────────────────────
// Base → Level 1 → Level 2 → Elevated
// "No pure black #000000" — deepest is surface #1c1102
export const colors = {
  background: {
    primary: '#1c1102',         // surface — base
    secondary: '#221a08',       // surface-container-low — player zones, sections
    surface: '#2a2010',         // surface-container — cards (70% opacity in glass mode)
    elevated: '#342814',        // surface-container-highest — list items, secondary buttons
    overlay: 'rgba(28,17,2,0.85)',
  },

  // ─── Text ─────────────────────────────────────────────────────────────────
  text: {
    primary: '#ede0d4',         // on-surface — main text
    secondary: '#a08c7c',       // on-surface-variant — labels, metadata
    muted: '#6b5c4c',           // dimmed metadata
    inverse: '#1c1102',         // text on primary buttons
    link: '#eebf73',            // links use primary amber
  },

  // ─── Accent — Amber/Gold Legendary ────────────────────────────────────────
  // "Regla de Rareza: Solo 1 acción primary por pantalla"
  accent: {
    primary: '#eebf73',         // Primary amber — CTA, highlights, glow
    primaryAlt: '#c99e55',      // Gradient end for primary buttons (135°)
    primaryContainer: '#7a5a20', // Pressed/hover state
    onPrimary: '#1c0f00',       // Text on primary buttons (dark brown)
    blue: mtgColors.blue,
    red: mtgColors.red,
    green: mtgColors.green,
    white: mtgColors.white,
    black: mtgColors.black,
    colorless: mtgColors.colorless,
  },

  // ─── Life Total — ranges ──────────────────────────────────────────────────
  lifeTotal: {
    high: '#5a9e5a',            // > 20 (safe)
    medium: '#eebf73',          // 10–20 (caution) — uses primary amber
    low: '#e0a030',             // 5–9 (danger)
    critical: '#cf6679',        // 1–4 (critical)
    zero: '#922B21',            // 0 (dead)
  },

  // ─── Status / Feedback ────────────────────────────────────────────────────
  status: {
    success: '#5a9e5a',
    warning: '#e0a030',
    error: '#cf6679',
    info: '#5a8abf',
  },

  // ─── Border — "Ghost Border" only ─────────────────────────────────────────
  // "No-Line Rule": Traditional 1px borders are prohibited for sectioning.
  // Ghost border at 15% opacity for a11y fallback only.
  border: {
    subtle: '#3a302020',        // near-invisible
    default: '#52443c26',       // outline-variant at 15% opacity
    strong: '#52443c',          // outline-variant full
    focus: '#eebf73',           // amber focus ring
  },

  // ─── Surface Variant (chips, tags) ────────────────────────────────────────
  surfaceVariant: '#3a3020',
  onSurfaceVariant: '#a08c7c',
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
// Display-First: Space Grotesk (headlines) + Manrope (body)
export const typography = {
  fontFamily: {
    display: 'SpaceGrotesk_700Bold',
    headline: 'SpaceGrotesk_600SemiBold',
    body: 'Manrope_400Regular',
    bodyMedium: 'Manrope_500Medium',
  },
  size: {
    'display-lg': 80,    // Life total 2-player
    'display-md': 64,    // Life total 3-player
    'display-sm': 48,    // Life total 4-player
    'heading-xl': 32,    // Home header
    'heading-lg': 24,    // Screen title
    'heading-md': 20,    // Section header
    'body-lg': 17,       // Sub-header
    'body-md': 15,       // Body, lists
    'body-sm': 13,       // Metadata, secondary
    caption: 12,
    label: 11,           // Chips/mana CAPS
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
  md: 6,              // Buttons (design spec: 6dp)
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 999,
} as const;

// ─── Elevation / Shadows — Ambient Glow ──────────────────────────────────────
// "No Material Design shadows. Only Ambient Glow amber."
export const shadows = {
  sm: {
    shadowColor: '#eebf73',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#eebf73',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#eebf73',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  glow: {
    shadowColor: '#eebf73',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  /** Alert glow — 21 cmd damage, 10 poison */
  glowAlert: {
    shadowColor: '#e0a030',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─── Motion Profile ──────────────────────────────────────────────────────────
// Crisp + Premium (MTG Arena feel)
export const motion = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 400,
    glacial: 600,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;
