/**
 * TopDecksPodium — 3-up podium row for the stats screen.
 *
 * Renders deck art as floating cards above three dark plinth blocks.
 * The center (rank 1) plinth is tallest, rank 2 medium (left), rank 3 short
 * (right). Each plinth shows the roman numeral (I/II/III), the deck's
 * win-rate %, and total match count.
 *
 * Empty slots collapse silently — passing only 1 deck renders just the
 * center plinth with the rank-1 art.
 */
import { Image, TouchableOpacity, View, Text } from 'react-native';

import type { Commander, Deck } from '@/db/index';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

export type PodiumDeckEntry = {
  deck: Deck;
  commanders: Commander[];
  total_matches: number;
  win_rate_pct: number | null;
};

interface TopDecksPodiumProps {
  /** Rank-ordered: index 0 = rank 1, index 1 = rank 2, index 2 = rank 3. */
  decks: PodiumDeckEntry[];
  onPressDeck?: (deck: Deck) => void;
}

const ROMAN = ['I', 'II', 'III'] as const;

// Art card heights, by visual rank position. The visual order on screen is
// rank-2 (left), rank-1 (center), rank-3 (right) — but we keep input ordering
// rank-first and reshuffle internally to render.
const ART_HEIGHT = { 1: 168, 2: 130, 3: 110 } as const;
const PLINTH_HEIGHT = { 1: 180, 2: 150, 3: 130 } as const;

export function TopDecksPodium({ decks, onPressDeck }: TopDecksPodiumProps) {
  const styles = useThemedStyles(createStyles);

  const rank1 = decks[0];
  const rank2 = decks[1];
  const rank3 = decks[2];

  return (
    <View style={styles.wrap}>
      <View style={styles.columns}>
        {/* Left — rank 2 */}
        <PodiumColumn entry={rank2} rank={2} onPress={onPressDeck} />
        {/* Center — rank 1 */}
        <PodiumColumn entry={rank1} rank={1} onPress={onPressDeck} />
        {/* Right — rank 3 */}
        <PodiumColumn entry={rank3} rank={3} onPress={onPressDeck} />
      </View>
      {/* Gold base line that visually unifies the three plinths */}
      <View style={styles.baseLine} />
    </View>
  );
}

interface PodiumColumnProps {
  entry: PodiumDeckEntry | undefined;
  rank: 1 | 2 | 3;
  onPress?: (deck: Deck) => void;
}

function PodiumColumn({ entry, rank, onPress }: PodiumColumnProps) {
  const styles = useThemedStyles(createStyles);

  // Empty slot — render a same-height placeholder so the row's vertical
  // baseline stays aligned even if a deck is missing.
  if (!entry) {
    return (
      <View style={styles.column}>
        <View style={[styles.artSpacer, { height: ART_HEIGHT[rank] }]} />
        <View style={[styles.plinth, styles[`plinth${rank}`], { height: PLINTH_HEIGHT[rank] }]} />
      </View>
    );
  }

  const artCrop = entry.commanders.find((c) => c.artCrop)?.artCrop ?? null;
  const wr = entry.win_rate_pct;

  return (
    <View style={styles.column}>
      <TouchableOpacity
        activeOpacity={onPress ? 0.85 : 1}
        onPress={onPress ? () => onPress(entry.deck) : undefined}
        disabled={!onPress}
        style={styles.artCardWrap}
      >
        <View style={[styles.artCard, { height: ART_HEIGHT[rank] }]}>
          {artCrop ? (
            <Image source={{ uri: artCrop }} style={styles.artImage} resizeMode="cover" />
          ) : (
            <View style={styles.artPlaceholder} />
          )}
          {/* Bottom gradient label band w/ deck name */}
          <View style={styles.artLabelBand}>
            <Text style={styles.artLabel} numberOfLines={1}>
              {entry.deck.name.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.ownerName} numberOfLines={1}>
          {entry.deck.name}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={onPress ? 0.85 : 1}
        onPress={onPress ? () => onPress(entry.deck) : undefined}
        disabled={!onPress}
        style={[styles.plinth, styles[`plinth${rank}`], { height: PLINTH_HEIGHT[rank] }]}
      >
        <Text style={[styles.numeral, rank === 1 && styles.numeralTop]}>{ROMAN[rank - 1]}</Text>
        <View style={styles.wrLine}>
          <Text style={[styles.wrValue, rank === 1 && styles.wrValueTop]}>
            {wr !== null ? wr : '—'}
          </Text>
          <Text style={[styles.wrPct, rank === 1 && styles.wrPctTop]}>%</Text>
        </View>
        <Text style={styles.matches}>{entry.total_matches} M</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  wrap: { gap: 0 },
  columns: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    justifyContent: 'space-between' as const,
    gap: spacing[2],
  },
  column: {
    flex: 1,
    alignItems: 'center' as const,
  },

  // ─── Art card ──────────────────────────────────────────────────────────────
  artCardWrap: {
    alignItems: 'center' as const,
    width: '100%' as const,
    marginBottom: spacing[2],
    gap: 6,
  },
  artCard: {
    width: '88%' as const,
    borderRadius: t.radius.sm,
    overflow: 'hidden' as const,
    backgroundColor: t.colors.background.elevated,
    borderWidth: 1,
    borderColor: t.colors.border.subtle,
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
  artLabelBand: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0009',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  artLabel: {
    color: t.colors.text.primary,
    fontSize: 10,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1.4,
    textAlign: 'center' as const,
  },
  artSpacer: {
    width: '88%' as const,
  },
  ownerName: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.regular,
  },

  // ─── Plinth ────────────────────────────────────────────────────────────────
  plinth: {
    width: '100%' as const,
    backgroundColor: t.colors.background.surface,
    borderTopLeftRadius: t.radius.md,
    borderTopRightRadius: t.radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing[2],
    gap: 4,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: t.colors.border.subtle,
  },
  // Per-rank tweaks — rank 1 gets a brighter border + slightly elevated bg
  plinth1: {
    borderColor: t.colors.accent.primary + '55',
    backgroundColor: t.colors.background.elevated,
  },
  plinth2: {},
  plinth3: {},

  numeral: {
    color: t.colors.accent.primaryAlt,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  numeralTop: {
    color: t.colors.accent.primary,
    fontSize: 34,
    lineHeight: 38,
  },

  wrLine: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
  },
  wrValue: {
    color: t.colors.text.primary,
    fontSize: 28,
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  wrValueTop: {
    fontSize: 36,
  },
  wrPct: {
    color: t.colors.text.muted,
    fontSize: 14,
    fontFamily: t.typography.fontFamily.bodyMedium,
    marginLeft: 1,
  },
  wrPctTop: {
    fontSize: 18,
  },
  matches: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.bodyMedium,
    letterSpacing: 1.6,
  },

  baseLine: {
    height: 1,
    backgroundColor: t.colors.accent.primary,
    opacity: 0.55,
  },
});
