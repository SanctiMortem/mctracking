/**
 * DeckStatRow — one row showing deck usage stats.
 * Displays deck name, commander color chips (partner-aware), match count,
 * and win rate percentage. Reusable across SCR-012, SCR-013, SCR-014.
 *
 * HIST-005 (EPIC-04)
 */
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ColorChips } from '@/components/ui/ColorChips';
import type { Commander, Deck } from '@/db/index';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

interface DeckStatRowProps {
  deck: Deck;
  commanders: Commander[];
  matches: number;
  win_rate_pct: number | null;
  onPress?: () => void;
}

export function DeckStatRow({ deck, commanders, matches, win_rate_pct, onPress }: DeckStatRowProps) {
  const styles = useThemedStyles(createStyles);

  const isPartner = commanders.length > 1;
  const allColors = commanders.flatMap((c) => c.colors);
  const winRateText = win_rate_pct !== null ? `${win_rate_pct}%` : '—';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Left: deck info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
          {isPartner && (
            <View style={styles.partnerBadge}>
              <Text style={styles.partnerText}>Partner</Text>
            </View>
          )}
        </View>
        <ColorChips selected={allColors} readonly />
      </View>

      {/* Right: stats */}
      <View style={styles.stats}>
        <Text style={styles.matchCount}>{matches}p</Text>
        <View style={[styles.wrBadge, win_rate_pct !== null && styles.wrBadgeActive]}>
          <Text style={[styles.wrText, win_rate_pct !== null && styles.wrTextActive]}>
            {winRateText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
    borderColor: t.colors.border.default,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },

  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  deckName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
    flexShrink: 1,
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
