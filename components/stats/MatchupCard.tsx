/**
 * MatchupCard — displays head-to-head result between two entities.
 *
 * States:
 *   - initial: prompt to select both entities
 *   - loading: spinner text
 *   - zero matches: "Sin partidas en común"
 *   - result: A wins vs B wins + draws + total count
 *
 * HIST-011 (EPIC-04)
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { MatchupResult } from '@/services/stats';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

interface MatchupCardProps {
  entityAName: string | null;
  entityBName: string | null;
  data: MatchupResult | null;
  loading: boolean;
}

export function MatchupCard({ entityAName, entityBName, data, loading }: MatchupCardProps) {
  const bothSelected = entityAName !== null && entityBName !== null;

  if (!bothSelected) {
    return (
      <View style={[styles.card, styles.center]}>
        <Text style={styles.prompt}>Selecciona dos entidades para ver el head-to-head</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.card, styles.center]}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  if (!data || data.total_matches === 0) {
    return (
      <View style={[styles.card, styles.center]}>
        <Text style={styles.emptyTitle}>Sin partidas en común</Text>
        <Text style={styles.emptySubtitle}>
          {entityAName} y {entityBName} no coincidieron en ninguna partida
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <Text style={styles.totalLabel}>{data.total_matches} partidas en común</Text>

      {/* Head-to-head bar */}
      <View style={styles.vsRow}>
        {/* Entity A */}
        <View style={styles.entitySide}>
          <Text style={styles.entityName} numberOfLines={1}>{entityAName}</Text>
          <Text style={styles.winsCount}>{data.entity_a_wins}</Text>
          <Text style={styles.winsLabel}>victorias</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <Text style={styles.vsText}>VS</Text>
          {data.draws > 0 && (
            <View style={styles.drawsBadge}>
              <Text style={styles.drawsText}>{data.draws} empate{data.draws !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        {/* Entity B */}
        <View style={[styles.entitySide, styles.entitySideRight]}>
          <Text style={[styles.entityName, styles.entityNameRight]} numberOfLines={1}>{entityBName}</Text>
          <Text style={styles.winsCount}>{data.entity_b_wins}</Text>
          <Text style={styles.winsLabel}>victorias</Text>
        </View>
      </View>

      {/* Win rate bar */}
      {data.entity_a_wins + data.entity_b_wins > 0 && (
        <View style={styles.barContainer}>
          <View
            style={[
              styles.barSegment,
              styles.barSegmentA,
              {
                flex: data.entity_a_wins,
              },
            ]}
          />
          <View
            style={[
              styles.barSegment,
              styles.barSegmentB,
              {
                flex: data.entity_b_wins,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },

  prompt: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },

  emptyTitle: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },

  totalLabel: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
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
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  entityNameRight: { textAlign: 'right' },
  winsCount: {
    color: AMBER,
    fontSize: typography.size['heading-xl'],
    fontWeight: typography.weight.black,
    lineHeight: typography.size['heading-xl'] * 1.1,
  },
  winsLabel: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
  },

  divider: {
    alignItems: 'center',
    gap: spacing[1],
    flexShrink: 0,
  },
  vsText: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
  drawsBadge: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  drawsText: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
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
  barSegmentA: { backgroundColor: AMBER },
  barSegmentB: { backgroundColor: colors.accent.primary },
});
