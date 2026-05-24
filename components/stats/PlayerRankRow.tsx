/**
 * PlayerRankRow — redesigned ranking row for the Stats screen.
 *
 * Replaces the earlier PlayerRankingRow look. Layout matches the
 * stats-redesign mockup: rank circle · commander-art avatar (or initials
 * disc) · name + "X matches · often [Commander]" · italic-serif WR%.
 *
 * Top-3 ranks get a gold border on the rank circle and gold-tinted WR%;
 * #1 additionally gets a slightly larger avatar to anchor the eye.
 */
import { Image, Pressable, View, Text } from 'react-native';

import type { PlayerRanking } from '@/services/stats';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface PlayerRankRowProps {
  ranking: PlayerRanking;
  /** Commander art crop for ranks 1–3 (if available). */
  topDeckArtCrop?: string | null;
  /** Commander name shown in the "often [Commander]" subline. */
  topCommanderName?: string | null;
  onPress?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function PlayerRankRow({ ranking, topDeckArtCrop, topCommanderName, onPress }: PlayerRankRowProps) {
  const styles = useThemedStyles(createStyles);

  const { player, total_matches, win_rate_pct, rank } = ranking;
  const isPodium = rank >= 1 && rank <= 3;
  const isTop = rank === 1;
  const winRateText = win_rate_pct !== null ? `${win_rate_pct}%` : '—';
  const showArt = isPodium && !!topDeckArtCrop;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.85 }]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={player.name}
    >
      <View style={[styles.rankCircle, isPodium && styles.rankCirclePodium, isTop && styles.rankCircleTop]}>
        <Text style={[styles.rankText, isPodium && styles.rankTextPodium]}>{rank}</Text>
      </View>

      {showArt ? (
        <Image source={{ uri: topDeckArtCrop! }} style={styles.avatarArt} resizeMode="cover" />
      ) : (
        <View style={[styles.avatarInit, isPodium && styles.avatarInitPodium]}>
          <Text style={[styles.avatarText, isPodium && styles.avatarTextPodium]}>
            {getInitials(player.name)}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {total_matches} matches{topCommanderName ? ` · often ${topCommanderName}` : ''}
        </Text>
      </View>

      <Text style={[styles.wr, isPodium && styles.wrPodium]}>{winRateText}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  rankCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  rankCirclePodium: {
    borderColor: t.colors.accent.primary + '99',
  },
  rankCircleTop: {
    borderWidth: 1.5,
  },
  rankText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  rankTextPodium: {
    color: t.colors.accent.primary,
  },

  // Avatar — circular, shows commander art for top-3 and initials chip for others.
  avatarArt: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.background.elevated,
    flexShrink: 0,
  },
  avatarInit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.background.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: t.colors.border.subtle,
  },
  avatarInitPodium: {
    borderColor: t.colors.accent.primary + '33',
  },
  avatarText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.bold,
    letterSpacing: 0.5,
  },
  avatarTextPodium: {
    color: t.colors.text.primary,
  },

  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  sub: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
  },

  wr: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
    flexShrink: 0,
  },
  wrPodium: {
    color: t.colors.accent.primary,
  },
});
