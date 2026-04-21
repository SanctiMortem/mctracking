/**
 * "The Mystic Archive" — original dark amber/gold theme.
 * Extracted from styles/tokens.ts into an AppTheme object.
 */
import type { AppTheme } from './types';
import { mtgColors } from '../tokens';

export const mysticArchive: AppTheme = {
  id: 'mystic-archive',
  label: 'The Mystic Archive',

  colors: {
    background: {
      primary: '#1c1102',
      secondary: '#221a08',
      surface: '#2a2010',
      elevated: '#342814',
      overlay: 'rgba(28,17,2,0.85)',
    },
    text: {
      primary: '#ede0d4',
      secondary: '#a08c7c',
      tertiary: '#a08c7c',
      muted: '#6b5c4c',
      inverse: '#1c1102',
      link: '#eebf73',
    },
    accent: {
      primary: '#eebf73',
      primaryAlt: '#c99e55',
      primaryContainer: '#7a5a20',
      onPrimary: '#1c0f00',
      blue: mtgColors.blue,
      red: mtgColors.red,
      green: mtgColors.green,
      white: mtgColors.white,
      black: mtgColors.black,
      colorless: mtgColors.colorless,
    },
    lifeTotal: {
      high: '#5a9e5a',
      medium: '#eebf73',
      low: '#e0a030',
      critical: '#cf6679',
      zero: '#922B21',
    },
    status: {
      success: '#5a9e5a',
      warning: '#e0a030',
      error: '#cf6679',
      info: '#5a8abf',
    },
    border: {
      subtle: '#3a302020',
      default: '#52443c26',
      strong: '#52443c',
      focus: '#eebf73',
    },
    surfaceVariant: '#3a3020',
    onSurfaceVariant: '#a08c7c',
  },

  shadows: {
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
    glowAlert: {
      shadowColor: '#e0a030',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.30,
      shadowRadius: 12,
      elevation: 8,
    },
  },

  typography: {
    fontFamily: {
      lifeTotal: 'NotoSerif_600SemiBold',
      lifeTotalBold: 'NotoSerif_700Bold',
      display: 'SpaceGrotesk_700Bold',
      headline: 'SpaceGrotesk_600SemiBold',
      body: 'Manrope_400Regular',
      bodyMedium: 'Manrope_500Medium',
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
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 1,
    },
  },

  radius: {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 12,
    xl: 16,
    xxl: 24,
    round: 999,
  },
};
