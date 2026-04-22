/**
 * PlayerRankingRow — one row in the global stats player rankings table.
 *
 * Displays rank badge (#1 in amber), initials avatar, player name,
 * win rate badge, and total match count.
 *
 * HIST-011 (EPIC-04)
 */
import { Image, Text, View } from 'react-native';

import type { PlayerRanking } from '@/services/stats';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

interface PlayerRankingRowProps {
  ranking: PlayerRanking;
  /** Commander art crop URL — passed in for rank-1, 2, and 3 players. */
  topDeckArtCrop?: string | null;
  /** Commander/deck label — shown underneath the player name when present. */
  topDeckLabel?: string | null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function PlayerRankingRow({ ranking, topDeckArtCrop, topDeckLabel }: PlayerRankingRowProps) {
  const styles = useThemedStyles(createStyles);

  const { player, total_matches, win_rate_pct, rank } = ranking;
  const isTop = rank === 1;
  const isPodium = rank >= 1 && rank <= 3;
  const winRateText = win_rate_pct !== null ? `${win_rate_pct}%` : '—';
  const showArt = isPodium && !!topDeckArtCrop;

  return (
    <View
      style={[
        styles.row,
        isTop && styles.rowTop,
        rank === 2 && styles.rowRank2,
        rank === 3 && styles.rowRank3,
      ]}
    >
      {/* Rank badge */}
      <View
        style={[
          styles.rankBadge,
          isTop && styles.rankBadgeTop,
          rank === 2 && styles.rankBadgeRank2,
          rank === 3 && styles.rankBadgeRank3,
        ]}
      >
        <Text
          style={[
            styles.rankText,
            isTop && styles.rankTextTop,
            isPodium && !isTop && styles.rankTextPodium,
          ]}
        >
          #{rank}
        </Text>
      </View>

      {/* Avatar — commander art for ranks 1–3 when available, initials otherwise */}
      {showArt ? (
        <Image source={{ uri: topDeckArtCrop! }} style={styles.artAvatar} resizeMode="cover" />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(player.name)}</Text>
        </View>
      )}

      {/* Name + optional deck label */}
      <View style={styles.nameBlock}>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        {showArt && topDeckLabel && (
          <Text style={styles.deckLabel} numberOfLines={1}>{topDeckLabel}</Text>
        )}
      </View>

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

const createStyles = (t: AppTheme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.accent.primaryAlt + '55',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  rowTop: {
    borderColor: t.colors.accent.primary + '99',
    backgroundColor: t.colors.accent.primary + '12',
  },
  rowRank2: {
    backgroundColor: t.colors.accent.primary + '05',
  },
  rowRank3: {},

  rankBadge: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.sm,
    paddingVertical: 2,
    flexShrink: 0,
  },
  rankBadgeTop: { backgroundColor: t.colors.accent.primary + '33' },
  rankBadgeRank2: { backgroundColor: t.colors.accent.primary + '0E' },
  rankBadgeRank3: {},
  rankText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.bold,
  },
  rankTextTop: { color: t.colors.accent.primary },
  rankTextPodium: { color: t.colors.text.secondary },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.accent.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.bold,
  },

  artAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    flexShrink: 0,
    backgroundColor: t.colors.background.elevated,
  },

  nameBlock: { flex: 1, gap: 2 },
  name: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  deckLabel: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size.label,
  },

  stats: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  matchCount: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },
  wrBadge: {
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  wrBadgeActive: { backgroundColor: t.colors.accent.primary + '22' },
  wrText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
  },
  wrTextActive: { color: t.colors.accent.primary },
})
