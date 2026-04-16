/**
 * MatchCard — compact history row for SCR-005 (and Home match list).
 *
 * Shows: date · duration · outcome badge · participants with deck names · win condition.
 * Tapping the card is handled by the parent via onPress.
 *
 * CMP-008 (design doc) · HIST-002 (EPIC-04)
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MatchSummary } from '@/services/matches';
import { formatMatchDuration, winConditionLabel } from '@/hooks/useMatchResults';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Outcome helpers ──────────────────────────────────────────────────────────

type Outcome = 'win' | 'draw' | 'abandoned';

function deriveOutcome(summary: MatchSummary): Outcome {
  if (summary.match.status === 'abandoned') return 'abandoned';
  if (summary.result?.isDraw) return 'draw';
  return 'win';
}

type OutcomeStyle = { label: string; bg: string; fg: string };

function getOutcomeStyles(accentPrimary: string): Record<Outcome, OutcomeStyle> {
  return {
    win:       { label: 'Win',       bg: accentPrimary + '33', fg: accentPrimary },
    draw:      { label: 'Draw',      bg: '#5a8abf22',          fg: '#5a8abf' },
    abandoned: { label: 'Abandoned', bg: '#6b5c4c22',          fg: '#a08c7c' },
  };
}

// ─── Participant line helpers ─────────────────────────────────────────────────

const MAX_INLINE = 3;

function participantLabel(summary: MatchSummary): string {
  const parts = summary.participations;
  if (parts.length === 0) return '—';

  const names = parts.map((p) => `${p.player.name} (${p.commander.name})`);
  if (names.length <= MAX_INLINE) return names.join(' · ');

  const visible = names.slice(0, MAX_INLINE - 1).join(' · ');
  return `${visible} +${names.length - (MAX_INLINE - 1)}`;
}

function winnerLabel(summary: MatchSummary): string | null {
  const { result } = summary;
  if (!result || result.isDraw || summary.match.status === 'abandoned') return null;
  const winnerPart = summary.participations.find((p) => p.id === result.winnerParticipationId);
  if (!winnerPart) return null;
  return `${winnerPart.player.name} · ${winnerPart.deck.name}`;
}

// ─── Date formatter ───────────────────────────────────────────────────────────

function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MatchCardProps {
  summary: MatchSummary;
  onPress: () => void;
  onDelete?: () => void;
}

export function MatchCard({ summary, onPress, onDelete }: MatchCardProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const outcome = deriveOutcome(summary);
  const OUTCOME_STYLES = getOutcomeStyles(theme.colors.accent.primary);
  const style = OUTCOME_STYLES[outcome];
  const duration = formatMatchDuration(summary.match.createdAt, summary.match.endedAt);
  const date = formatDate(summary.match.endedAt ?? summary.match.createdAt);
  const players = participantLabel(summary);
  const winner = winnerLabel(summary);
  const condition = summary.result && !summary.result.isDraw
    ? winConditionLabel(summary.result.winCondition)
    : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onDelete}
      delayLongPress={600}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Match ${date} — ${style.label}`}
    >
      {/* Header row: date + duration + outcome badge */}
      <View style={styles.header}>
        <View style={styles.meta}>
          <Text style={styles.date}>{date}</Text>
          {duration !== '–' && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.duration}>{duration}</Text>
            </>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: style.bg }]}>
          <Text style={[styles.badgeText, { color: style.fg }]}>{style.label}</Text>
        </View>
      </View>

      {/* Participants */}
      <Text style={styles.players} numberOfLines={2}>{players}</Text>

      {/* Winner row — only for wins */}
      {winner && (
        <View style={styles.winnerRow}>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.winner} numberOfLines={1}>{winner}</Text>
        </View>
      )}

      {/* Win condition */}
      {condition && (
        <Text style={styles.condition}>{condition}</Text>
      )}
    </Pressable>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function MatchCardSkeleton() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={styles.header}>
        <View style={[styles.skeletonBar, { width: 120 }]} />
        <View style={[styles.skeletonBar, { width: 56, height: 22, borderRadius: theme.radius.sm }]} />
      </View>
      <View style={[styles.skeletonBar, { width: '80%', marginTop: spacing[2] }]} />
      <View style={[styles.skeletonBar, { width: '50%', marginTop: spacing[1] }]} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  card: {
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  cardPressed: {
    opacity: 0.75,
    borderColor: t.colors.border.strong,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexShrink: 1,
  },
  date: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  dot: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },
  duration: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },

  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: t.radius.sm,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
  },

  players: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    lineHeight: t.typography.size['body-sm'] * t.typography.lineHeight.normal,
  },

  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  crown: {
    fontSize: 12,
  },
  winner: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.medium,
    flexShrink: 1,
  },

  condition: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
  },

  // Skeleton
  skeleton: {
    opacity: 0.5,
  },
  skeletonBar: {
    height: 14,
    borderRadius: t.radius.xs,
    backgroundColor: t.colors.background.elevated,
  },
})
