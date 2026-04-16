/**
 * MatchupCard — displays head-to-head result between two entities.
 *
 * States:
 *   - initial: prompt to select both entities
 *   - loading: spinner
 *   - zero matches: no shared matches message
 *   - result: A wins vs B wins + draws + total count
 *
 * HIST-011 (EPIC-04)
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { MatchupResult } from '@/services/stats';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

interface MatchupCardProps {
  entityAName: string | null;
  entityBName: string | null;
  data: MatchupResult | null;
  loading: boolean;
}

export function MatchupCard({ entityAName, entityBName, data, loading }: MatchupCardProps) {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const bothSelected = entityAName !== null && entityBName !== null;

  if (!bothSelected) {
    return (
      <View style={[styles.card, styles.center]}>
        <Text style={styles.prompt}>{t('match.selectTwoEntities')}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.card, styles.center]}>
        <ActivityIndicator color={theme.colors.accent.primary} />
      </View>
    );
  }

  if (!data || data.total_matches === 0) {
    return (
      <View style={[styles.card, styles.center]}>
        <Text style={styles.emptyTitle}>{t('match.noSharedMatches')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('match.noSharedMatchesSubtext', { a: entityAName, b: entityBName })}
        </Text>
      </View>
    );
  }

  const drawLabel = data.draws === 1
    ? t('match.drawCount', { count: data.draws })
    : t('match.drawsCount', { count: data.draws });

  return (
    <View style={styles.card}>
      {/* Header */}
      <Text style={styles.totalLabel}>{t('match.sharedMatches', { count: data.total_matches })}</Text>

      {/* Head-to-head bar */}
      <View style={styles.vsRow}>
        {/* Entity A */}
        <View style={styles.entitySide}>
          <Text style={styles.entityName} numberOfLines={1}>{entityAName}</Text>
          <Text style={styles.winsCount}>{data.entity_a_wins}</Text>
          <Text style={styles.winsLabel}>{t('match.wins')}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <Text style={styles.vsText}>VS</Text>
          {data.draws > 0 && (
            <View style={styles.drawsBadge}>
              <Text style={styles.drawsText}>{drawLabel}</Text>
            </View>
          )}
        </View>

        {/* Entity B */}
        <View style={[styles.entitySide, styles.entitySideRight]}>
          <Text style={[styles.entityName, styles.entityNameRight]} numberOfLines={1}>{entityBName}</Text>
          <Text style={styles.winsCount}>{data.entity_b_wins}</Text>
          <Text style={styles.winsLabel}>{t('match.wins')}</Text>
        </View>
      </View>

      {/* Win rate bar */}
      {data.entity_a_wins + data.entity_b_wins > 0 && (
        <View style={styles.barContainer}>
          <View
            style={[
              styles.barSegment,
              styles.barSegmentA,
              { flex: data.entity_a_wins },
            ]}
          />
          <View
            style={[
              styles.barSegment,
              styles.barSegmentB,
              { flex: data.entity_b_wins },
            ]}
          />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  card: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },

  prompt: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },

  emptyTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
  },

  totalLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
  },

  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  entitySide: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  entitySideRight: { alignItems: 'flex-end' },
  entityName: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  entityNameRight: { textAlign: 'right' },
  winsCount: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['heading-xl'],
    fontWeight: t.typography.weight.black,
    lineHeight: t.typography.size['heading-xl'] * 1.1,
  },
  winsLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
  },

  divider: {
    alignItems: 'center',
    gap: spacing[1],
    flexShrink: 0,
  },
  vsText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.bold,
    letterSpacing: 1,
  },
  drawsBadge: {
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  drawsText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
  },

  barContainer: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    gap: 1,
  },
  barSegment: {
    borderRadius: 2,
  },
  barSegmentA: { backgroundColor: t.colors.accent.primary },
  barSegmentB: { backgroundColor: t.colors.accent.primary },
})
