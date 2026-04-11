/**
 * MatchResultCard — hero card for SCR-010 Match Results.
 * Shows outcome banner (VICTORIA / EMPATE / ABANDONADA) + winner details
 * or draw/abandoned contextual message.
 *
 * MATCH-007 (EPIC-02)
 */
import { StyleSheet, Text, View } from 'react-native';

import { ColorChips } from '@/components/ui/ColorChips';
import type { MatchOutcome } from '@/hooks/useMatchResults';
import type { ParticipationDetail } from '@/services/matches';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

interface MatchResultCardProps {
  outcome: MatchOutcome;
  winner: ParticipationDetail | null;
  winConditionDisplay: string | null;
}

// ─── Outcome config ───────────────────────────────────────────────────────────

type OutcomeConfig = {
  icon: string;
  label: string;
  accent: string;
  subtext: string | null;
};

function outcomeConfig(outcome: MatchOutcome, winnerName: string | null): OutcomeConfig {
  switch (outcome) {
    case 'win':
      return {
        icon: '✦',
        label: 'VICTORIA',
        accent: AMBER,
        subtext: winnerName ? `${winnerName} ha ganado` : null,
      };
    case 'draw':
      return {
        icon: '◈',
        label: 'EMPATE',
        accent: colors.accent.primary,
        subtext: 'Todos los jugadores empataron',
      };
    case 'abandoned':
      return {
        icon: '✕',
        label: 'ABANDONADA',
        accent: colors.text.muted,
        subtext: 'Esta partida no cuenta en las estadísticas',
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MatchResultCard({ outcome, winner, winConditionDisplay }: MatchResultCardProps) {
  const cfg = outcomeConfig(outcome, winner?.player.name ?? null);

  return (
    <View style={[styles.card, { borderColor: cfg.accent + '44' }]}>
      {/* Outcome banner */}
      <View style={styles.banner}>
        <Text style={[styles.icon, { color: cfg.accent }]}>{cfg.icon}</Text>
        <Text style={[styles.label, { color: cfg.accent }]}>{cfg.label}</Text>
        {cfg.subtext && (
          <Text style={styles.subtext}>{cfg.subtext}</Text>
        )}
      </View>

      {/* Winner detail — only shown for win */}
      {outcome === 'win' && winner && (
        <View style={styles.winnerBlock}>
          <View style={[styles.divider, { backgroundColor: cfg.accent + '33' }]} />

          {/* Winner avatar + name */}
          <View style={styles.winnerRow}>
            <View style={[styles.avatar, { backgroundColor: AMBER + '33' }]}>
              <Text style={styles.avatarText}>
                {winner.player.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.winnerInfo}>
              <Text style={styles.winnerName}>{winner.player.name}</Text>
              <View style={styles.deckRow}>
                <Text style={styles.deckName} numberOfLines={1}>{winner.deck.name}</Text>
                <ColorChips selected={winner.commander.colors} readonly />
              </View>
            </View>
            <Text style={styles.crown}>👑</Text>
          </View>

          {/* Win condition */}
          {winConditionDisplay && (
            <View style={styles.conditionRow}>
              <Text style={styles.conditionLabel}>Victoria por</Text>
              <View style={styles.conditionBadge}>
                <Text style={styles.conditionText}>{winConditionDisplay}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },

  banner: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  icon: {
    fontSize: 28,
    lineHeight: 32,
  },
  label: {
    fontSize: typography.size['heading-xl'],
    fontWeight: typography.weight.black,
    letterSpacing: 4,
  },
  subtext: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
    marginTop: spacing[1],
  },

  winnerBlock: {
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  divider: {
    height: 1,
  },

  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: AMBER,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.bold,
  },
  winnerInfo: {
    flex: 1,
    gap: 2,
  },
  winnerName: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  deckName: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    flexShrink: 1,
  },
  crown: {
    fontSize: 20,
    flexShrink: 0,
  },

  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  conditionLabel: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  conditionBadge: {
    backgroundColor: AMBER + '22',
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  conditionText: {
    color: AMBER,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },
});
