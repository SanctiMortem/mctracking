/**
 * WinRateRing — circular progress indicator for the account player's win rate.
 *
 * Renders an SVG donut: a faint background ring + a coloured arc whose length
 * encodes the win-rate percentage. Centre stack shows the percentage in display
 * type with a "Win rate" caption underneath. When `winRatePct` is null
 * (no completed matches yet) the arc collapses to zero and the centre shows
 * an em-dash.
 *
 * PLAT-010 (EPIC-05)
 */
import { Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

interface WinRateRingProps {
  /** 0–100 or null when no matches are recorded yet. */
  winRatePct: number | null;
  /** Outer diameter in pixels. Defaults to 132. */
  size?: number;
  /** Stroke width of the arc + background ring. Defaults to 12. */
  strokeWidth?: number;
}

export function WinRateRing({
  winRatePct,
  size = 132,
  strokeWidth = 12,
}: WinRateRingProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = winRatePct ?? 0;
  const dashOffset = circumference - (Math.max(0, Math.min(100, pct)) / 100) * circumference;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={styles.bgStroke.color}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Foreground arc — rotated -90° so it begins at 12 o'clock */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={styles.fgStroke.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centre} pointerEvents="none">
        <Text style={styles.value}>
          {winRatePct == null ? '—' : `${Math.round(winRatePct)}%`}
        </Text>
        <Text style={styles.label}>{t('home.statWinRate')}</Text>
      </View>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  wrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  bgStroke: {
    color: t.colors.border.subtle,
  },
  fgStroke: {
    color: t.colors.status.success,
  },
  centre: {
    position: 'absolute' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  value: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontFamily: t.typography.fontFamily.display,
    fontWeight: t.typography.weight.bold,
    lineHeight: t.typography.size['heading-lg'] * 1.05,
  },
  label: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.medium,
    marginTop: 2,
  },
});
