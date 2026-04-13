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
import { colors, radius, spacing, typography } from '@/styles/tokens';

// ─── Outcome helpers ──────────────────────────────────────────────────────────

type Outcome = 'win' | 'draw' | 'abandoned';

function deriveOutcome(summary: MatchSummary): Outcome {
  if (summary.match.status === 'abandoned') return 'abandoned';
  if (summary.result?.isDraw) return 'draw';
  return 'win';
}

type OutcomeStyle = { label: string; bg: string; fg: string };

const OUTCOME_STYLES: Record<Outcome, OutcomeStyle> = {
  win:       { label: 'Win',       bg: '#F39C1222', fg: '#F39C12' },
  draw:      { label: 'Draw',      bg: '#9B59B622', fg: '#9B59B6' },
  abandoned: { label: 'Abandoned', bg: '#50506822', fg: '#9090A8' },
};

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
  const outcome = deriveOutcome(summary);
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
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={styles.header}>
        <View style={[styles.skeletonBar, { width: 120 }]} />
        <View style={[styles.skeletonBar, { width: 56, height: 22, borderRadius: radius.sm }]} />
      </View>
      <View style={[styles.skeletonBar, { width: '80%', marginTop: spacing[2] }]} />
      <View style={[styles.skeletonBar, { width: '50%', marginTop: spacing[1] }]} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardPressed: {
    opacity: 0.75,
    borderColor: colors.border.strong,
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
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  dot: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  duration: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },

  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.5,
  },

  players: {
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
    lineHeight: typography.size['body-sm'] * typography.lineHeight.normal,
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
    color: '#F39C12',
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    flexShrink: 1,
  },

  condition: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
  },

  // Skeleton
  skeleton: {
    opacity: 0.5,
  },
  skeletonBar: {
    height: 14,
    borderRadius: radius.xs,
    backgroundColor: colors.background.elevated,
  },
});
