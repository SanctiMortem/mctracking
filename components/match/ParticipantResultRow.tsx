/**
 * ParticipantResultRow — one row per participation in SCR-010 Match Results.
 * Shows: avatar, player name, deck name + commander colors, W/L/Draw badge.
 *
 * MATCH-007 (EPIC-02)
 */
import { StyleSheet, Text, View } from 'react-native';

import { ColorChips } from '@/components/ui/ColorChips';
import type { ParticipationDetail } from '@/services/matches';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

interface ParticipantResultRowProps {
  participation: ParticipationDetail;
  isWinner: boolean;
}

export function ParticipantResultRow({ participation, isWinner }: ParticipantResultRowProps) {
  const { player, deck, commander } = participation;

  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const badge = resolveBadge(participation.result, isWinner);

  return (
    <View style={[styles.row, isWinner && styles.rowWinner]}>
      {/* Avatar */}
      <View style={[styles.avatar, isWinner && styles.avatarWinner]}>
        <Text style={[styles.avatarText, isWinner && styles.avatarTextWinner]}>{initials}</Text>
      </View>

      {/* Player + deck info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.playerName, isWinner && styles.playerNameWinner]} numberOfLines={1}>
            {player.name}
          </Text>
          {isWinner && <Text style={styles.crownIcon}>👑</Text>}
        </View>
        <View style={styles.deckRow}>
          <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
          <ColorChips selected={commander.colors} readonly />
        </View>
      </View>

      {/* Result badge */}
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
      </View>
    </View>
  );
}

// ─── Badge helper ─────────────────────────────────────────────────────────────

type BadgeStyle = { label: string; bg: string; fg: string };

function resolveBadge(result: ParticipationDetail['result'], isWinner: boolean): BadgeStyle {
  if (isWinner || result === 'win') return { label: 'WIN',  bg: AMBER + '33',                        fg: AMBER };
  if (result === 'draw')           return { label: 'DRAW', bg: colors.accent.primary + '33',         fg: colors.accent.primary };
  if (result === 'lose')           return { label: 'LOSS', bg: colors.background.surface,            fg: colors.text.muted };
  // null = abandoned
                                    return { label: '–',    bg: colors.background.surface,            fg: colors.text.muted };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
    gap: spacing[3],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowWinner: {
    backgroundColor: AMBER + '0F',
    borderColor: AMBER + '44',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.round,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarWinner: { backgroundColor: AMBER + '33' },
  avatarText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
  },
  avatarTextWinner: { color: AMBER },

  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  playerName: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  playerNameWinner: { fontWeight: typography.weight.semibold },
  crownIcon: { fontSize: 14 },

  deckRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  deckName: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    flexShrink: 1,
  },

  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
    minWidth: 44,
    alignItems: 'center',
    flexShrink: 0,
  },
  badgeText: {
    fontSize: typography.size.label,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
});
