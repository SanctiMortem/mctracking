/**
 * TopDeckPodiumCard — hero card for a ranked deck on the stats podium.
 *
 * Visual hierarchy (large → small):
 *   tier 1 → art 260dp, prominent "#1 DECK" gold pill, oversized win-rate
 *   tier 2 → art 180dp, top-right "RANK 02" chip, medium win-rate
 *   tier 3 → art 140dp, top-right "RANK 03" chip, medium win-rate
 *
 * Each card: commander art on top, deck name + match count + mana identity
 * bottom-left, WIN RATE label + bold percentage bottom-right. Only ranks 1–3
 * use this card; ranks 4+ render with the plain DeckStatRow.
 */
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import type { Commander, Deck } from '@/db/index';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

const ART_HEIGHT = { 1: 260, 2: 180, 3: 140 } as const;

export type PodiumTier = 1 | 2 | 3;

interface TopDeckPodiumCardProps {
  tier: PodiumTier;
  deck: Deck;
  commanders: Commander[];
  matches: number;
  win_rate_pct: number | null;
  onPress?: () => void;
}

export function TopDeckPodiumCard({
  tier,
  deck,
  commanders,
  matches,
  win_rate_pct,
  onPress,
}: TopDeckPodiumCardProps) {
  const styles = useThemedStyles(createStyles);

  const artCrop = commanders.find((c) => c.artCrop)?.artCrop ?? null;
  const allColors = Array.from(new Set(commanders.flatMap((c) => c.colorIdentity ?? [])));
  const artHeight = ART_HEIGHT[tier];
  const isTop = tier === 1;
  const isPartner = commanders.length > 1;
  const winRateText = win_rate_pct !== null ? `${win_rate_pct}%` : '—';
  const rankLabel = tier === 1 ? '#1 DECK' : `RANK 0${tier}`;

  return (
    <TouchableOpacity
      style={[styles.card, isTop && styles.cardTop]}
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Top rank badge — gold pill centered for #1, subtle chip top-right otherwise */}
      {isTop ? (
        <View style={styles.topBadgeWrap}>
          <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>{rankLabel}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.rankChip}>
          <Text style={styles.rankChipText}>{rankLabel}</Text>
        </View>
      )}

      {/* Commander art */}
      <View style={[styles.art, { height: artHeight }]}>
        {artCrop ? (
          <Image source={{ uri: artCrop }} style={styles.artImage} resizeMode="cover" />
        ) : (
          <View style={styles.artPlaceholder} />
        )}
      </View>

      {/* Gold accent divider on tier 1 only */}
      {isTop && <View style={styles.accentDivider} />}

      {/* Info row — name/meta on left, win rate on right */}
      <View style={[styles.infoRow, isTop && styles.infoRowTop]}>
        <View style={styles.infoLeft}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.deckName, isTop && styles.deckNameTop]}
              numberOfLines={2}
            >
              {deck.name}
            </Text>
            {isPartner && (
              <View style={styles.partnerBadge}>
                <Text style={styles.partnerText}>Partner</Text>
              </View>
            )}
          </View>
          <Text style={styles.metaLine}>{matches} total games</Text>
          <ManaIdentityRow colors={allColors} size="xs" />
        </View>

        <View style={styles.infoRight}>
          <Text style={styles.wrLabel}>WIN RATE</Text>
          <Text
            style={[
              styles.wrValue,
              isTop && styles.wrValueTop,
              win_rate_pct !== null && styles.wrValueActive,
            ]}
          >
            {winRateText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (t: AppTheme) => ({
  card: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.accent.primaryAlt + '66',
    overflow: 'hidden',
    position: 'relative',
  },
  cardTop: {
    borderColor: t.colors.accent.primary + '99',
    paddingTop: spacing[6],
  },

  // Tier 1 — gold pill centered at top, overlapping the card edge
  topBadgeWrap: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  topBadge: {
    backgroundColor: t.colors.accent.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomLeftRadius: t.radius.md,
    borderBottomRightRadius: t.radius.md,
  },
  topBadgeText: {
    color: t.colors.background.primary,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.black,
    letterSpacing: 1.5,
  },

  // Tier 2 / 3 — subtle chip in top-right corner, floating over the art
  rankChip: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    zIndex: 2,
    backgroundColor: t.colors.background.primary + 'DD',
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  rankChipText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.bold,
    letterSpacing: 1,
  },

  // Art
  art: {
    width: '100%',
    backgroundColor: t.colors.background.elevated,
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  artPlaceholder: {
    flex: 1,
    backgroundColor: t.colors.background.elevated,
  },

  // Gold divider under the art on tier 1
  accentDivider: {
    height: 2,
    backgroundColor: t.colors.accent.primary,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  infoRowTop: {
    paddingVertical: spacing[4],
  },

  infoLeft: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  deckName: {
    color: t.colors.accent.primaryAlt,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    flexShrink: 1,
  },
  deckNameTop: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.black,
  },
  partnerBadge: {
    backgroundColor: t.colors.accent.primary + '33',
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  partnerText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.3,
  },
  metaLine: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },

  // Win rate block
  infoRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  wrLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
  },
  wrValue: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.black,
    fontVariant: ['tabular-nums'],
  },
  wrValueActive: {
    color: t.colors.accent.primary,
  },
  wrValueTop: {
    fontSize: t.typography.size['heading-xl'],
  },
});
