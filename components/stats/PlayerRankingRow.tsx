/**
 * PlayerRankingRow — one row in the global stats player rankings table.
 *
 * Displays rank badge (#1 in amber), initials avatar, player name,
 * win rate badge, and total match count.
 *
 * HIST-011 (EPIC-04)
 */
import { StyleSheet, Text, View } from 'react-native';

import type { PlayerRanking } from '@/services/stats';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

interface PlayerRankingRowProps {
  ranking: PlayerRanking;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function PlayerRankingRow({ ranking }: PlayerRankingRowProps) {
  const { player, total_matches, win_rate_pct, rank } = ranking;
  const isTop = rank === 1;
  const winRateText = win_rate_pct !== null ? `${win_rate_pct}%` : '—';

  return (
    <View style={styles.row}>
      {/* Rank badge */}
      <View style={[styles.rankBadge, isTop && styles.rankBadgeTop]}>
        <Text style={[styles.rankText, isTop && styles.rankTextTop]}>#{rank}</Text>
      </View>

      {/* Initials avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(player.name)}</Text>
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>{player.name}</Text>

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.matchCount}>{total_matches}p</Text>
        <View style={[styles.wrBadge, win_rate_pct !== null && styles.wrBadgeActive]}>
          <Text style={[styles.wrText, win_rate_pct !== null && styles.wrTextActive]}>
            {winRateText}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },

  rankBadge: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: radius.sm,
    paddingVertical: 2,
    flexShrink: 0,
  },
  rankBadgeTop: { backgroundColor: AMBER + '33' },
  rankText: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.bold,
  },
  rankTextTop: { color: AMBER },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: colors.accent.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
  },

  name: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },

  stats: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  matchCount: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  wrBadge: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  wrBadgeActive: { backgroundColor: AMBER + '22' },
  wrText: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
  },
  wrTextActive: { color: AMBER },
});
