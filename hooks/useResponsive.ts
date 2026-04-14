/**
 * useResponsive — responsive design hook for iPhone / iPad (mini → Pro 12.9″).
 *
 * Breakpoints (logical points, NOT pixels):
 *   phone:    < 600    (iPhone SE 375, iPhone 15 Pro 393, iPhone Max 430)
 *   tablet:   600–1023 (iPad mini 744, iPad 10th 820)
 *   large:    ≥ 1024   (iPad Pro 11″ 1024, iPad Pro 12.9″ 1024 portrait / 1366 landscape)
 *
 * Returns:
 *  - breakpoint: 'phone' | 'tablet' | 'large'
 *  - isTablet / isLarge convenience booleans
 *  - scale(base): multiply by device scale factor (1× phone, 1.3× tablet, 1.5× large)
 *  - hp(pct) / wp(pct): percentage of height/width
 *  - columns: suggested grid columns (1 phone, 2 tablet, 2–3 large)
 *  - contentMaxWidth: max width for readable content (∞ on phone, 720 on tablet, 960 on large)
 *  - width / height: raw screen dimensions
 *
 * Uses useWindowDimensions for auto-rotation support.
 */
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'phone' | 'tablet' | 'large';

export interface ResponsiveValues {
  breakpoint: Breakpoint;
  isTablet: boolean;
  isLarge: boolean;
  width: number;
  height: number;
  /** Scale a base value by device factor: 1× phone, 1.3× tablet, 1.5× large */
  scale: (base: number) => number;
  /** Percentage of screen height */
  hp: (pct: number) => number;
  /** Percentage of screen width */
  wp: (pct: number) => number;
  /** Suggested grid columns for list screens */
  columns: number;
  /** Max width for readable content (undefined = full width on phone) */
  contentMaxWidth: number | undefined;
  /** Horizontal padding for content areas */
  contentPadding: number;
}

const BREAKPOINTS = {
  tablet: 600,
  large: 1024,
} as const;

const SCALE_FACTORS: Record<Breakpoint, number> = {
  phone: 1,
  tablet: 1.3,
  large: 1.5,
};

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const breakpoint: Breakpoint =
      width >= BREAKPOINTS.large ? 'large' :
      width >= BREAKPOINTS.tablet ? 'tablet' :
      'phone';

    const factor = SCALE_FACTORS[breakpoint];

    return {
      breakpoint,
      isTablet: breakpoint === 'tablet' || breakpoint === 'large',
      isLarge: breakpoint === 'large',
      width,
      height,
      scale: (base: number) => Math.round(base * factor),
      hp: (pct: number) => Math.round((height * pct) / 100),
      wp: (pct: number) => Math.round((width * pct) / 100),
      columns: breakpoint === 'phone' ? 1 : 2,
      contentMaxWidth: breakpoint === 'phone' ? undefined : breakpoint === 'tablet' ? 720 : 960,
      contentPadding: breakpoint === 'phone' ? 16 : breakpoint === 'tablet' ? 32 : 48,
    };
  }, [width, height]);
}
