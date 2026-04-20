/**
 * "Justice of the Light" — sacred armory / paladin theme.
 *
 * Deep navy/charcoal surface, radiant gold primary, polished steel secondary.
 * Sharp corners (sm/none), Noto Serif headlines + Work Sans body.
 * "Halo" glow shadows tinted gold. No pure black.
 */
import type { AppTheme } from './types';
import { mtgColors } from '../tokens';

export const justiceOfTheLight: AppTheme = {
  id: 'justice-of-the-light',
  label: 'Justice of the Light',

  colors: {
    background: {
      primary: '#10141a',         // surface — The Void (deep charcoal/navy)
      secondary: '#161b24',       // surface-container-low
      surface: '#1c222e',         // surface-container
      elevated: '#242c3a',        // surface-container-highest
      overlay: 'rgba(16,20,26,0.88)',
    },
    text: {
      primary: '#e8ecf4',         // on-surface — bright silver-white
      secondary: '#b6c7e8',       // on-surface-variant — polished steel blue
      tertiary: '#bdc7d7',        // detail/contrast — Tertiary from design spec
      muted: '#4e5a6e',           // dimmed metadata
      inverse: '#10141a',         // text on primary buttons (dark navy)
      link: '#e9c400',            // links use primary gold
    },
    accent: {
      primary: '#e9c400',         // Radiant Gold — CTA, highlights
      primaryAlt: '#c4a600',      // Gradient end for metallic sheen (135°)
      primaryContainer: '#6b5600', // Pressed/active state
      onPrimary: '#10141a',       // Text on gold buttons (dark navy)
      blue: mtgColors.blue,
      red: mtgColors.red,
      green: mtgColors.green,
      white: mtgColors.white,
      black: mtgColors.black,
      colorless: mtgColors.colorless,
    },
    lifeTotal: {
      high: '#A2FFAE',            // safe — bright mint
      medium: '#e9c400',          // caution — primary gold
      low: '#d4a020',             // danger — warm amber
      critical: '#d96070',        // critical — rosy steel
      zero: '#8b2020',            // dead — dark crimson
    },
    status: {
      success: '#4a9e6a',
      warning: '#d4a020',
      error: '#d96070',
      info: '#5a8abf',
    },
    border: {
      subtle: '#3a455430',        // steel at ~19% opacity — section dividers
      default: '#3a455460',       // steel at ~38% opacity — card outlines
      strong: '#3a4554',          // full steel — prominent separators
      focus: '#e9c400',           // gold focus ring
    },
    surfaceVariant: '#1e2636',    // chips, tags — dark steel blue
    onSurfaceVariant: '#8a95a8',
  },

  shadows: {
    sm: {
      shadowColor: '#e9c400',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#e9c400',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    lg: {
      // Halo Shadow — large blur, soft gold glow
      shadowColor: '#e9c400',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 30,
      elevation: 12,
    },
    glow: {
      shadowColor: '#e9c400',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
    glowAlert: {
      shadowColor: '#d4a020',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  typography: {
    fontFamily: {
      lifeTotal: 'NotoSerif_400Regular',
      lifeTotalBold: 'NotoSerif_400Regular',
      display: 'NotoSerif_700Bold',              // "carved" serif headlines
      headline: 'NotoSerif_600SemiBold',
      body: 'WorkSans_400Regular',               // clean functional body
      bodyMedium: 'WorkSans_500Medium',
    },
    size: {
      'display-lg': 80,
      'display-md': 64,
      'display-sm': 48,
      'heading-xl': 32,
      'heading-lg': 24,
      'heading-md': 20,
      'body-lg': 17,
      'body-md': 15,
      'body-sm': 13,
      caption: 12,
      label: 11,
    },
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900',
    },
    lineHeight: {
      tight: 1.1,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: -0.5,       // tight tracking for "carved" headlines
      normal: 0,
      wide: 0.5,
      wider: 1,
    },
  },

  radius: {
    xs: 0,     // "Don't use Rounded Corners" — sharp paladin aesthetic
    sm: 2,
    md: 4,     // buttons: sharp, structured
    lg: 6,
    xl: 8,
    xxl: 12,
    round: 999,
  },
};
