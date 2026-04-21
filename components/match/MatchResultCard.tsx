/**
 * MatchResultCard — hero card for SCR-010 Match Results.
 * Shows outcome banner (VICTORY / DRAW / ABANDONED) + winner details
 * or draw/abandoned contextual message.
 *
 * MATCH-007 (EPIC-02)
 */
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import type { MatchOutcome } from '@/hooks/useMatchResults';
import type { ParticipationDetail } from '@/services/matches';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

interface MatchResultCardProps {
  outcome: MatchOutcome;
  winner: ParticipationDetail | null;
  winConditionDisplay: string | null;
}

export function MatchResultCard({ outcome, winner, winConditionDisplay }: MatchResultCardProps) {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();

  const winnerName = winner?.player.name ?? null;

  const cfg = (() => {
    switch (outcome) {
      case 'win':
        return {
          icon: '✦',
          label: t('match.outcomeVictory').toUpperCase(),
          accent: theme.colors.accent.primary,
          subtext: winnerName ? t('match.outcomeWinSubtext', { name: winnerName }) : null,
        };
      case 'draw':
        return {
          icon: '◈',
          label: t('match.outcomeDraw').toUpperCase(),
          accent: theme.colors.accent.primary,
          subtext: t('match.outcomeDrawSubtext'),
        };
      case 'abandoned':
        return {
          icon: '✕',
          label: t('match.outcomeAbandoned').toUpperCase(),
          accent: theme.colors.text.muted,
          subtext: t('match.outcomeAbandonedSubtext'),
        };
    }
  })();

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
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent.primary + '33' }]}>
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
                <ManaIdentityRow colors={winner.commander.colorIdentity} size="xs" />
              </View>
            </View>
            <Text style={styles.crown}>👑</Text>
          </View>

          {/* Win condition */}
          {winConditionDisplay && (
            <View style={styles.conditionRow}>
              <Text style={styles.conditionLabel}>{t('match.winByLabel')}</Text>
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

const createStyles = (t: AppTheme) => ({
  card: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },

  banner: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[1],
  },
  icon: {
    fontSize: 28,
    lineHeight: 32,
  },
  label: {
    fontSize: t.typography.size['heading-lg'],
    fontWeight: t.typography.weight.black,
    letterSpacing: 4,
  },
  subtext: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size['body-sm'],
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
    borderRadius: t.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.bold,
  },
  winnerInfo: {
    flex: 1,
    gap: 2,
  },
  winnerName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  deckName: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size['body-sm'],
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
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },
  conditionBadge: {
    backgroundColor: t.colors.accent.primary + '22',
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  conditionText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
})
