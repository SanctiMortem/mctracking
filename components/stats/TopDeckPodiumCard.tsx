/**
 * TopDeckPodiumCard — hero card for a ranked deck on the stats podium.
 *
 * Visual hierarchy (large → small):
 *   tier 1 → art 260dp, prominent "#1 DECK" gold banner overlapping top edge
 *   tier 2 → art 190dp, "RANK 02" pill overlapping top edge
 *   tier 3 → art 150dp, "RANK 03" pill overlapping top edge
 *
 * Commander art is inset inside a frame (card bg visible around it) and
 * carries a subtle top/bottom vignette. Ranks 4+ use the plain DeckStatRow.
 */
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import type { Commander, Deck } from '@/db/index';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

const ART_HEIGHT = { 1: 300, 2: 190, 3: 150 } as const;

export type PodiumTier = 1 | 2 | 3;

interface TopDeckPodiumCardProps {
  tier: PodiumTier;
  deck: Deck;
  commanders: Commander[];
  matches: number;
  win_rate_pct: number | null;
  current_streak?: number;
  onPress?: () => void;
}

export function TopDeckPodiumCard({
  tier,
  deck,
  commanders,
  matches,
  win_rate_pct,
  current_streak = 0,
  onPress,
}: TopDeckPodiumCardProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const artCrop = commanders.find((c) => c.artCrop)?.artCrop ?? null;
  const allColors = Array.from(new Set(commanders.flatMap((c) => c.colorIdentity ?? [])));
  const artHeight = ART_HEIGHT[tier];
  const isTop = tier === 1;
  const isPartner = commanders.length > 1;
  const winRateText = win_rate_pct !== null ? `${win_rate_pct}%` : '—';
  const rankLabel = tier === 1 ? '#1 DECK' : `RANK 0${tier}`;
  const showStreak = isTop && current_streak > 0;

  return (
    // Outer wrapper has no overflow — lets the rank badge float above the top edge.
    <View style={styles.wrapper}>
      {/* Rank badge — sits above the card edge for all tiers */}
      <View style={[styles.badgeWrap, isTop && styles.badgeWrapTop]} pointerEvents="none">
        <View style={isTop ? styles.topBadge : styles.rankChip}>
          <Text style={isTop ? styles.topBadgeText : styles.rankChipText}>{rankLabel}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.card, isTop && styles.cardTop]}
        activeOpacity={onPress ? 0.85 : 1}
        onPress={onPress}
        disabled={!onPress}
      >
        {/* Art frame — card bg padding creates a visible border around the image */}
        <View style={[styles.artFrame, isTop && styles.artFrameTop]}>
          <View style={[styles.artClip, { height: artHeight }]}>
            {artCrop ? (
              <Image source={{ uri: artCrop }} style={styles.artImage} resizeMode="cover" />
            ) : (
              <View style={styles.artPlaceholder} />
            )}
            {/* Saturation overlay — RN lacks CSS `filter: saturate`, so mix the
                art with a neutral gray to approximate reduced saturation.
                Tier 2 → ~50% sat, Tier 3 → ~20% sat. */}
            {tier === 2 && (
              <View style={styles.desatOverlayT2} pointerEvents="none" />
            )}
            {tier === 3 && (
              <View style={styles.desatOverlayT3} pointerEvents="none" />
            )}
            {/* Vignette — circular radial fade: 80% at the outer edge → 0% toward the center */}
            <Svg
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              preserveAspectRatio="none"
            >
              <Defs>
                <RadialGradient
                  id="podiumVignette"
                  cx="50%"
                  cy="50%"
                  rx="70%"
                  ry="70%"
                  fx="50%"
                  fy="50%"
                >
                  <Stop offset="0" stopColor="#000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000" stopOpacity="0.8" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#podiumVignette)" />
            </Svg>
          </View>
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
            <Text style={styles.metaLine}>{matches} {t('stats.totalGames')}</Text>
            {showStreak && (
              <Text style={styles.streakLine}>
                {t('stats.undefeatedStreak', { count: current_streak })}
              </Text>
            )}
            <ManaIdentityRow colors={allColors} size="xs" />
          </View>

          <View style={styles.infoRight}>
            <Text style={[styles.wrLabel, isTop && styles.wrLabelTop]}>WIN RATE</Text>
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
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  // Outer wrapper with enough top padding to reserve space for the overflowing badge.
  wrapper: {
    position: 'relative' as const,
    paddingTop: spacing[4],
  },

  card: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.accent.primaryAlt + '66',
    position: 'relative' as const,
  },
  cardTop: {
    borderColor: t.colors.accent.primary + '99',
    borderWidth: 1.5,
  },

  // Rank badge — absolute, positioned above the card top edge
  badgeWrap: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    zIndex: 3,
  },
  badgeWrapTop: {
    top: -4,
  },

  // Tier 1 — large gold banner
  topBadge: {
    backgroundColor: t.colors.accent.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.colors.accent.primary,
    shadowColor: t.colors.accent.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  topBadgeText: {
    color: t.colors.background.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.display,
    fontWeight: t.typography.weight.black,
    letterSpacing: 2.2,
  },

  // Tier 2 / 3 — pill overlapping the top edge
  rankChip: {
    backgroundColor: '#A8B2C1',
    borderRadius: t.radius.md,
    paddingHorizontal: spacing[3] + 2,
    paddingVertical: spacing[1] + 2,
    borderWidth: 1,
    borderColor: '#A8B2C1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  rankChipText: {
    color: t.colors.background.primary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.display,
    fontWeight: t.typography.weight.bold,
    letterSpacing: 1.3,
  },

  // Art — inset inside the card so the background creates a visible border frame
  artFrame: {
    padding: spacing[2],
    paddingTop: spacing[3],
  },
  artFrameTop: {
    padding: spacing[3],
    paddingTop: spacing[4],
  },
  artClip: {
    width: '100%' as const,
    borderRadius: t.radius.md,
    overflow: 'hidden' as const,
    backgroundColor: t.colors.background.elevated,
    position: 'relative' as const,
  },
  artImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  artPlaceholder: {
    flex: 1,
    backgroundColor: t.colors.background.elevated,
  },
  // Gray layers that mix with the art underneath. Opacity chosen so the
  // final color is roughly (1 − a) * art + a * gray, giving a visible but
  // not total desaturation at each rank.
  desatOverlayT2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#808080',
    opacity: 0.35,
  },
  desatOverlayT3: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#808080',
    opacity: 0.65,
  },

  // Gold divider under the art on tier 1
  accentDivider: {
    height: 2,
    backgroundColor: t.colors.accent.primary,
    marginHorizontal: spacing[3],
  },

  // Info row
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  infoRowTop: {
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[5],
  },

  infoLeft: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing[2] },
  deckName: {
    color: t.colors.accent.primaryAlt,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    flexShrink: 1,
  },
  deckNameTop: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['heading-xl'],
    fontFamily: t.typography.fontFamily.display,
    fontWeight: t.typography.weight.black,
    textShadowColor: t.colors.accent.primary + '55',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    lineHeight: t.typography.size['heading-xl'] * 1.05,
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
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.3,
  },
  metaLine: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
  },
  streakLine: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.3,
  },

  // Win rate block
  infoRight: { alignItems: 'flex-end' as const, gap: 2, flexShrink: 0 },
  wrLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
  },
  wrLabelTop: {
    color: t.colors.accent.primary,
    letterSpacing: 1.4,
    textShadowColor: t.colors.accent.primary + '66',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  wrValue: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontFamily: t.typography.fontFamily.display,
    fontWeight: t.typography.weight.black,
    fontVariant: ['tabular-nums'] as const,
  },
  wrValueActive: {
    color: t.colors.accent.primary,
  },
  wrValueTop: {
    fontSize: t.typography.size['heading-xl'],
    textShadowColor: t.colors.accent.primary + '66',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
