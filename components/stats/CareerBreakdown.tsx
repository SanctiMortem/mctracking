/**
 * CareerBreakdown — win rate by turn order, pod size and game length, plus
 * fastest win and longest game. Built from data the tracker already records.
 *
 * A bucket shows its win rate only once it has enough matches (the API sends
 * null below the threshold); until then it shows the match count alone.
 * Renders nothing when there is no data at all.
 *
 * DSTAT-002 (EPIC-11)
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CareerBreakdown as CareerData, CareerBucket } from '@/services/stats';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface CareerBreakdownProps {
  title: string;
  /** Undefined when a newer bundle talks to an API that predates the field. */
  career: CareerData | undefined;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export function CareerBreakdown({ title, career }: CareerBreakdownProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  if (!career) return null;

  const groups: { label: string; buckets: CareerBucket[]; name: (key: string) => string }[] = [
    {
      label: t('career.byTurnOrder'),
      buckets: career.by_turn_order,
      name: (k: string) => t(`career.turn.${k}`, { defaultValue: t('career.turn.nth', { n: k }) }),
    },
    {
      label: t('career.byPodSize'),
      buckets: career.by_pod_size,
      name: (k: string) => t('career.players', { count: Number(k) }),
    },
    {
      label: t('career.byGameLength'),
      buckets: career.by_game_length,
      name: (k: string) => t(`career.length.${k}`),
    },
  ].filter((g) => g.buckets.length > 0);

  const hasRecords = career.fastest_win_seconds !== null || career.longest_game_seconds !== null;
  if (groups.length === 0 && !hasRecords) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        {hasRecords && (
          <View style={styles.records}>
            {career.fastest_win_seconds !== null && (
              <View style={styles.record}>
                <Text style={styles.recordValue}>{formatDuration(career.fastest_win_seconds)}</Text>
                <Text style={styles.recordLabel}>{t('career.fastestWin')}</Text>
              </View>
            )}
            {career.longest_game_seconds !== null && (
              <View style={styles.record}>
                <Text style={styles.recordValue}>{formatDuration(career.longest_game_seconds)}</Text>
                <Text style={styles.recordLabel}>{t('career.longestGame')}</Text>
              </View>
            )}
          </View>
        )}

        {groups.map((g) => (
          <View key={g.label} style={styles.group}>
            <Text style={styles.groupLabel}>{g.label}</Text>
            {g.buckets.map((b) => (
              <View key={b.key} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.name} numberOfLines={1}>{g.name(b.key)}</Text>
                  <Text style={styles.value}>
                    {b.win_rate_pct !== null ? `${b.win_rate_pct}%` : '—'}
                    <Text style={styles.matches}>
                      {`  ${t('career.record', { wins: b.wins, count: b.matches })}`}
                    </Text>
                  </Text>
                </View>
                <View style={styles.track}>
                  {b.win_rate_pct !== null && (
                    <View style={[styles.fill, { width: `${Math.max(b.win_rate_pct, 2)}%` }]} />
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
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
    gap: spacing[4],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  records: { flexDirection: 'row' as const, gap: spacing[4] },
  record: { flex: 1, gap: 2 },
  recordValue: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums' as const],
  },
  recordLabel: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
  group: { gap: spacing[2] },
  groupLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  row: { gap: spacing[1] },
  rowHeader: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing[2],
  },
  name: { flexShrink: 1, color: t.colors.text.primary, fontSize: t.typography.size['body-md'] },
  value: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums' as const],
  },
  matches: { color: t.colors.text.muted, fontWeight: t.typography.weight.regular },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.border.default,
    overflow: 'hidden' as const,
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: t.colors.accent.primary },
});
