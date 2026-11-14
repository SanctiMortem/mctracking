/**
 * WinConditionBreakdown — "How this deck wins".
 *
 * One row per win condition (the value picked on the close-match screen):
 * label, win count, share of wins, and a proportional bar. Renders nothing
 * when there are no wins, so callers can drop it in unconditionally.
 *
 * STAT-002 (EPIC-06)
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { WinConditionCount } from '@/services/stats';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface WinConditionBreakdownProps {
  title: string;
  /** Sorted by wins DESC (the API already does this). */
  rows: WinConditionCount[] | undefined;
}

export function WinConditionBreakdown({ title, rows }: WinConditionBreakdownProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  // `rows` is undefined when a newer bundle talks to an API that predates
  // the field (OTA shipped before the Vercel deploy finished).
  const totalWins = (rows ?? []).reduce((sum, r) => sum + r.wins, 0);
  if (!rows || totalWins === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        {rows.map((r) => {
          const pct = Math.round((r.wins / totalWins) * 100);
          return (
            <View key={r.condition} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.label} numberOfLines={1}>
                  {t(`match.winCondition.${r.condition}`, { defaultValue: r.condition })}
                </Text>
                <Text style={styles.value}>
                  {r.wins}
                  <Text style={styles.pct}>{`  ${pct}%`}</Text>
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(pct, 2)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  section: { gap: spacing[3] },
  title: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  card: {
    gap: spacing[3],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  row: { gap: spacing[1] },
  rowHeader: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing[2],
  },
  label: {
    flexShrink: 1,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
  },
  value: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums' as const],
  },
  pct: {
    color: t.colors.text.muted,
    fontWeight: t.typography.weight.regular,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.border.default,
    overflow: 'hidden' as const,
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.accent.primary,
  },
});
