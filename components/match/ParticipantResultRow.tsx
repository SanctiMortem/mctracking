/**
 * ParticipantResultRow — one row per participation in SCR-010 Match Results.
 * Shows: avatar, player name, deck name + commander colors, W/L/Draw badge.
 *
 * MATCH-007 (EPIC-02)
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import type { ParticipationDetail } from '@/services/matches';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

interface ParticipantResultRowProps {
  participation: ParticipationDetail;
  isWinner: boolean;
  /** Optional count of turn_passed events recorded for this player. */
  turnCount?: number;
  /**
   * Optional turn-time aggregates for this player. Omitted when the match
   * predates the per-turn-time feature or no timed turns were recorded.
   */
  turnTimeStats?: { totalSeconds: number; turns: number; longestSeconds: number };
}

export function ParticipantResultRow({ participation, isWinner, turnCount, turnTimeStats }: ParticipantResultRowProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { player, deck, commander } = participation;

  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const badge = resolveBadge(participation.result, isWinner, theme);
  const flavor = pickFlavor(participation, isWinner, t);

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
        {flavor && (
          <Text style={[styles.flavorLine, isWinner && styles.flavorLineWinner]} numberOfLines={2}>
            {flavor}
          </Text>
        )}
        <View style={styles.deckRow}>
          <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
          <ManaIdentityRow colors={commander.colorIdentity} size="xs" />
          {turnCount !== undefined && turnCount > 0 && (
            <View style={styles.turnChip}>
              <Text style={styles.turnChipText}>↻ {turnCount}</Text>
            </View>
          )}
          {turnTimeStats && turnTimeStats.turns > 0 && (
            <View style={styles.turnChip}>
              <Text style={styles.turnChipText}>
                ⏱ {formatTurnTime(Math.round(turnTimeStats.totalSeconds / turnTimeStats.turns))}
                {' avg · '}
                {formatTurnTime(turnTimeStats.longestSeconds)} max
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Result badge */}
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
      </View>
    </View>
  );
}

// ─── Time formatter ───────────────────────────────────────────────────────────
// `<60s → "47s"`, otherwise `m:ss`. Keeps the chip tight on small phones.

function formatTurnTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Flavor picker ────────────────────────────────────────────────────────────
// Pulls one phrase from match.winnerFlavor / match.loserFlavor. Index is
// derived from the participation id so the line is stable across re-renders
// but varies across players in the same match.

function pickFlavor(
  participation: ParticipationDetail,
  isWinner: boolean,
  t: ReturnType<typeof useTranslation>['t'],
): string | null {
  const isLoser = !isWinner && participation.result === 'lose';
  if (!isWinner && !isLoser) return null;
  const key = isWinner ? 'match.winnerFlavor' : 'match.loserFlavor';
  const phrases = t(key, { returnObjects: true }) as unknown;
  if (!Array.isArray(phrases) || phrases.length === 0) return null;
  let h = 0;
  for (const ch of participation.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return phrases[h % phrases.length] as string;
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

  flavorLine: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
    fontStyle: 'italic',
    lineHeight: t.typography.size['body-sm'] * 1.3,
    marginTop: 2,
    marginBottom: 2,
  },
  flavorLineWinner: {
    color: t.colors.accent.primary,
  },

  deckRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  deckName: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size['body-sm'],
    flexShrink: 1,
  },
  turnChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.background.elevated,
  },
  turnChipText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
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
