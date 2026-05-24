/**
 * DeckRankRow — compact rank row for ranks 4+ of the Top Decks list
 * (and for the full /stats/decks screen).
 *
 * Layout: rank circle · square deck art · deck name + color pips + owner
 *         · WR% / match count.
 */
import { Image, Pressable, View, Text } from 'react-native';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import type { Commander, Deck } from '@/db/index';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface DeckRankRowProps {
  rank: number;
  deck: Deck;
  commanders: Commander[];
  matches: number;
  win_rate_pct: number | null;
  ownerName?: string | null;
  onPress?: () => void;
}

export function DeckRankRow({
  rank,
  deck,
  commanders,
  matches,
  win_rate_pct,
  ownerName,
  onPress,
}: DeckRankRowProps) {
  const styles = useThemedStyles(createStyles);

  const artCrop = commanders.find((c) => c.artCrop)?.artCrop ?? null;
  const allColors = Array.from(new Set(commanders.flatMap((c) => c.colorIdentity ?? [])));
  const isPodium = rank >= 1 && rank <= 3;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.85 }]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={deck.name}
    >
      <View style={[styles.rankCircle, isPodium && styles.rankCirclePodium]}>
        <Text style={[styles.rankText, isPodium && styles.rankTextPodium]}>{rank}</Text>
      </View>
      <View style={styles.artThumb}>
        {artCrop ? (
          <Image source={{ uri: artCrop }} style={styles.artImg} resizeMode="cover" />
        ) : (
          <View style={styles.artImg} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {deck.name}
        </Text>
        <View style={styles.metaRow}>
          {allColors.length > 0 && <ManaIdentityRow colors={allColors} size="xs" />}
          {ownerName && (
            <>
              {allColors.length > 0 && <Text style={styles.metaSep}>·</Text>}
              <Text style={styles.metaOwner} numberOfLines={1}>{ownerName}</Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.stats}>
        <Text style={[styles.wr, isPodium && styles.wrPodium]}>
          {win_rate_pct !== null ? `${win_rate_pct}%` : '—'}
        </Text>
        <Text style={styles.matches}>{matches} m</Text>
      </View>
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  rankCirclePodium: {
    borderColor: t.colors.accent.primary + '99',
  },
  rankText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  rankTextPodium: {
    color: t.colors.accent.primary,
  },
  artThumb: {
    width: 44,
    height: 56,
    borderRadius: t.radius.sm,
    overflow: 'hidden' as const,
    backgroundColor: t.colors.background.elevated,
    flexShrink: 0,
  },
  artImg: {
    width: '100%' as const,
    height: '100%' as const,
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  name: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  metaSep: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
  },
  metaOwner: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.body,
    flexShrink: 1,
  },
  stats: {
    alignItems: 'flex-end' as const,
    gap: 2,
    flexShrink: 0,
  },
  wr: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  wrPodium: {
    color: t.colors.accent.primary,
  },
  matches: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.body,
  },
});
