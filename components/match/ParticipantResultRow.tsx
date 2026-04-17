/**
 * ParticipantResultRow — one row per participation in SCR-010 Match Results.
 * Shows: avatar, player name, deck name + commander colors, W/L/Draw badge.
 *
 * MATCH-007 (EPIC-02)
 */
import { Text, View } from 'react-native';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import type { ParticipationDetail } from '@/services/matches';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

interface ParticipantResultRowProps {
  participation: ParticipationDetail;
  isWinner: boolean;
}

export function ParticipantResultRow({ participation, isWinner }: ParticipantResultRowProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();

  const { player, deck, commander } = participation;

  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const badge = resolveBadge(participation.result, isWinner, theme);

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
          <ManaIdentityRow colors={commander.colorIdentity} size="xs" />
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

function resolveBadge(result: ParticipationDetail['result'], isWinner: boolean, theme: AppTheme): BadgeStyle {
  if (isWinner || result === 'win') return { label: 'WIN',  bg: theme.colors.accent.primary + '33',                        fg: theme.colors.accent.primary };
  if (result === 'draw')           return { label: 'DRAW', bg: theme.colors.accent.primary + '33',         fg: theme.colors.accent.primary };
  if (result === 'lose')           return { label: 'LOSS', bg: theme.colors.background.surface,            fg: theme.colors.text.muted };
  // null = abandoned
                                    return { label: '–',    bg: theme.colors.background.surface,            fg: theme.colors.text.muted };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background.surface,
    gap: spacing[3],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowWinner: {
    backgroundColor: t.colors.accent.primary + '0F',
    borderColor: t.colors.accent.primary + '44',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: t.radius.round,
    backgroundColor: t.colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarWinner: { backgroundColor: t.colors.accent.primary + '33' },
  avatarText: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.bold,
  },
  avatarTextWinner: { color: t.colors.accent.primary },

  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  playerName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
  },
  playerNameWinner: { fontWeight: t.typography.weight.semibold },
  crownIcon: { fontSize: 14 },

  deckRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  deckName: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size['body-sm'],
    flexShrink: 1,
  },

  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: t.radius.sm,
    minWidth: 44,
    alignItems: 'center',
    flexShrink: 0,
  },
  badgeText: {
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.bold,
    letterSpacing: 0.5,
  },
})
