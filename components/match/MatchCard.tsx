/**
 * MatchCard — compact history row for SCR-005 (and Home match list).
 *
 * Header: winner (or status) player · deck on the left, date+time on the right.
 * Body: other participants with deck names.
 * Footer: outcome badge + win condition.
 *
 * CMP-008 (design doc) · HIST-002 (EPIC-04)
 */
import { Pressable, Text, View } from 'react-native';

import type { MatchSummary } from '@/services/matches';
import { formatMatchDuration, winConditionLabel } from '@/hooks/useMatchResults';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useAccountPlayer } from '@/contexts/AccountPlayerContext';

const LEFT_STRIPE_NEUTRAL = '#A8B2C1';
const LEFT_STRIPE_WIDTH = 4;

function didAccountPlayerWin(summary: MatchSummary, accountPlayerId: string | null): boolean {
  if (!accountPlayerId) return false;
  const winnerId = summary.result && !summary.result.isDraw ? summary.result.winnerParticipationId : null;
  if (!winnerId) return false;
  const winner = summary.participations.find((p) => p.id === winnerId);
  return winner?.playerId === accountPlayerId;
}

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

// ─── Header helpers ───────────────────────────────────────────────────────────

/** The subject of the match — the winner, or the first participant on draw/abandoned. */
function headerSubject(summary: MatchSummary): { name: string; deck: string; isWinner: boolean } | null {
  const { result, participations, match } = summary;
  const winnerId = result && !result.isDraw ? result.winnerParticipationId : null;
  if (winnerId) {
    const p = participations.find((pp) => pp.id === winnerId);
    if (p) return { name: p.player.name, deck: p.deck.name, isWinner: true };
  }
  const first = participations[0];
  if (first) return { name: first.player.name, deck: first.deck.name, isWinner: false };
  // Fallback label if we somehow have no participations
  const status = match.status === 'abandoned' ? 'Abandoned' : result?.isDraw ? 'Draw' : 'Match';
  return { name: status, deck: '', isWinner: false };
}

function otherParticipants(summary: MatchSummary, subjectName: string | null): string {
  const parts = summary.participations;
  const rest = subjectName
    ? parts.filter((p) => p.player.name !== subjectName)
    : parts;
  if (rest.length === 0) return '';
  return rest.map((p) => `${p.player.name} (${p.deck.name})`).join(' · ');
}

// ─── Date+time formatter ──────────────────────────────────────────────────────

function formatDateTime(dateStr: string | Date | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: '2-digit',
  });
  const time = d.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return `${date} · ${time}`;
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
  const { accountPlayer } = useAccountPlayer();

  const outcome = deriveOutcome(summary);
  const OUTCOME_STYLES = getOutcomeStyles(theme.colors.accent.primary);
  const style = OUTCOME_STYLES[outcome];
  const stripeColor = didAccountPlayerWin(summary, accountPlayer?.id ?? null)
    ? theme.colors.accent.primary
    : LEFT_STRIPE_NEUTRAL;
  const duration = formatMatchDuration(summary.match.createdAt, summary.match.endedAt);
  const dateTime = formatDateTime(summary.match.endedAt ?? summary.match.createdAt);
  const subject = headerSubject(summary);
  const others = otherParticipants(summary, subject?.name ?? null);
  const condition = summary.result && !summary.result.isDraw
    ? winConditionLabel(summary.result.winCondition)
    : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onDelete}
      delayLongPress={600}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        { borderLeftWidth: LEFT_STRIPE_WIDTH, borderLeftColor: stripeColor },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Match ${dateTime} — ${style.label}`}
    >
      {/* Header — subject player · deck on the left, date/time on the right */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {subject && (
            <>
              <View style={styles.subjectLine}>
                {subject.isWinner && <Text style={styles.crown}>👑</Text>}
                <Text
                  style={[styles.subjectName, subject.isWinner && styles.subjectNameWinner]}
                  numberOfLines={1}
                >
                  {subject.name}
                </Text>
              </View>
              {subject.deck ? (
                <Text style={styles.subjectDeck} numberOfLines={1}>
                  {subject.deck}
                </Text>
              ) : null}
            </>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.dateTime}>{dateTime}</Text>
          {duration !== '–' && (
            <Text style={styles.duration}>{duration}</Text>
          )}
        </View>
      </View>

      {/* Other participants */}
      {others.length > 0 && (
        <Text style={styles.others} numberOfLines={2}>
          {others}
        </Text>
      )}

      {/* Footer — outcome + win condition */}
      <View style={styles.footer}>
        <View style={[styles.badge, { backgroundColor: style.bg }]}>
          <Text style={[styles.badgeText, { color: style.fg }]}>{style.label}</Text>
        </View>
        {condition && <Text style={styles.condition}>{condition}</Text>}
      </View>
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
        <View style={[styles.skeletonBar, { width: 160 }]} />
        <View style={[styles.skeletonBar, { width: 90, height: 14 }]} />
      </View>
      <View style={[styles.skeletonBar, { width: '80%', marginTop: spacing[2] }]} />
      <View style={[styles.skeletonBar, { width: 56, height: 20, borderRadius: theme.radius.sm, marginTop: spacing[2] }]} />
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
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: spacing[3],
  },
  headerLeft: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  subjectLine: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[1] + 2,
  },
  crown: {
    fontSize: 14,
  },
  subjectName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    flexShrink: 1,
  },
  subjectNameWinner: {
    color: t.colors.accent.primary,
  },
  subjectDeck: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
  },

  headerRight: {
    alignItems: 'flex-end' as const,
    flexShrink: 0,
    gap: 2,
  },
  dateTime: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.medium,
  },
  duration: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.body,
  },

  others: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
    lineHeight: t.typography.size['body-sm'] * t.typography.lineHeight.normal,
  },

  footer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    marginTop: spacing[1],
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: t.radius.sm,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
  },
  condition: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.body,
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
