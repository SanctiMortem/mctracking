/**
 * CircularWinRate — donut graph showing a win-rate percentage.
 *
 * Pure SVG (react-native-svg already in deps). The arc fills clockwise from
 * 12 o'clock. When `winRate` is null (no matches), renders a muted ring + em-dash.
 */
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/styles/themes/types';

type Props = {
  winRate: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
};

export function CircularWinRate({
  winRate,
  size = 132,
  strokeWidth = 10,
  label,
}: Props) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = winRate === null ? 0 : Math.max(0, Math.min(100, winRate));
  const dashOffset = circumference * (1 - safePct / 100);

  const trackColor = theme.colors.border.subtle;
  const fillColor = winRate === null ? theme.colors.text.muted : theme.colors.accent.primary;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {winRate !== null && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { color: fillColor }]}>
          {winRate === null ? '—' : `${Math.round(winRate)}%`}
        </Text>
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  wrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  center: {
    position: 'absolute' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  value: {
    fontSize: 32,
    fontWeight: t.typography.weight.bold,
    lineHeight: 36,
  },
  label: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginTop: 2,
  },
});
