/**
 * ParticipantResultRow — one row per participation on the match results and
 * match detail screens.
 *
 * Two frames on one line, joined by a link:
 *
 *   ┌─ player ─────────────┐      ┌─ deck ──────────┐
 *   │ (GA) Gabo 👑   [WIN] │──◆───│ Commander name  │
 *   │ flavor line          │      │ deck name       │
 *   │ ↻ 9   ⏱ 1:12 avg     │      │ W U B G         │
 *   └──────────────────────┘      └─────────────────┘
 *
 * The player frame opens the player page; the deck frame opens the deck.
 * The deck frame leads with the commander (how decks are named at the
 * table), shows the deck name under it, and carries the commander's art as
 * a faint backdrop.
 *
 * MATCH-007 (EPIC-02)
 */
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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
  const router = useRouter();

  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const badge = resolveBadge(participation.result, isWinner, theme);
  const flavor = pickFlavor(participation, isWinner, t);

  const commanderLabel = participation.commander2
    ? `${commander.name} / ${participation.commander2.name}`
    : commander.name;
  // Drop the deck name when it only repeats the commander.
  const showDeckName =
    deck.name.trim().toLowerCase() !== commanderLabel.toLowerCase() &&
    deck.name.trim().toLowerCase() !== commander.name.toLowerCase();
  const colors = participation.commander2
    ? [...new Set([...commander.colorIdentity, ...participation.commander2.colorIdentity])]
    : commander.colorIdentity;
  const hasTurnTime = !!turnTimeStats && turnTimeStats.turns > 0;
  const hasTurnCount = turnCount !== undefined && turnCount > 0;

  return (
    <View style={styles.row}>
      {/* ── Player frame ── */}
      <Pressable
        onPress={() => router.push(`/players/${player.id}`)}
        style={({ pressed }) => [styles.frame, styles.playerFrame, isWinner && styles.frameWinner, pressed && styles.framePressed]}
        accessibilityRole="button"
        accessibilityLabel={player.name}
      >
        <View style={styles.playerHeader}>
          <View style={[styles.avatar, isWinner && styles.avatarWinner]}>
            <Text style={[styles.avatarText, isWinner && styles.avatarTextWinner]}>{initials}</Text>
          </View>
          <View style={styles.playerHeaderText}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.playerName, isWinner && styles.playerNameWinner]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {player.name}
              </Text>
              {isWinner && <Text style={styles.crownIcon}>👑</Text>}
            </View>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
            </View>
          </View>
        </View>

        {flavor && (
          <Text style={[styles.flavorLine, isWinner && styles.flavorLineWinner]} numberOfLines={2}>
            {flavor}
          </Text>
        )}

        {(hasTurnCount || hasTurnTime) && (
          <View style={styles.chipRow}>
            {hasTurnCount && (
              <View style={styles.turnChip}>
                <Text style={styles.turnChipText}>↻ {turnCount}</Text>
              </View>
            )}
            {hasTurnTime && (
              <View style={styles.turnChip}>
                <Text style={styles.turnChipText}>
                  ⏱ {formatTurnTime(Math.round(turnTimeStats!.totalSeconds / turnTimeStats!.turns))}
                  {' avg · '}
                  {formatTurnTime(turnTimeStats!.longestSeconds)} max
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>

      {/* ── Link: a rule with a diamond on it, joining the two frames ── */}
      <View style={styles.link} pointerEvents="none">
        <View style={[styles.linkLine, isWinner && styles.linkLineWinner]} />
        <View style={[styles.linkKnot, isWinner && styles.linkKnotWinner]} />
      </View>

      {/* ── Deck frame ── */}
      <Pressable
        onPress={() => router.push(`/decks/${deck.id}`)}
        style={({ pressed }) => [styles.frame, styles.deckFrame, isWinner && styles.frameWinner, pressed && styles.framePressed]}
        accessibilityRole="button"
        accessibilityLabel={`${commanderLabel}${showDeckName ? `, ${deck.name}` : ''}`}
      >
        {commander.artCrop ? (
          <View style={styles.artWrap} pointerEvents="none">
            <Image source={{ uri: commander.artCrop }} style={styles.art} resizeMode="cover" />
            <View style={styles.artScrim} />
          </View>
        ) : null}
        <Text style={styles.commanderName} numberOfLines={2}>
          {commanderLabel}
        </Text>
        {showDeckName && (
          <Text style={styles.deckName} numberOfLines={1}>
            {deck.name}
          </Text>
        )}
        <View style={styles.deckFooter}>
          <ManaIdentityRow colors={colors} size="xs" />
          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>
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

const LINK_WIDTH = 18;

const createStyles = (t: AppTheme) => ({
  // Two frames + the link between them, stretched to the same height.
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  frame: {
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background.surface,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    overflow: 'hidden',
  },
  frameWinner: {
    backgroundColor: t.colors.accent.primary + '0F',
    borderColor: t.colors.accent.primary + '66',
  },
  framePressed: { opacity: 0.75 },
  // The player gets a little more of the line than the deck.
  playerFrame: { flex: 1.15, minWidth: 0, gap: spacing[2] },
  deckFrame: { flex: 1, minWidth: 0, gap: 2, justifyContent: 'center' },

  // ── Link ──
  link: {
    width: LINK_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: t.colors.border.strong,
  },
  linkLineWinner: { backgroundColor: t.colors.accent.primary + '99' },
  linkKnot: {
    width: 9,
    height: 9,
    transform: [{ rotate: '45deg' }],
    backgroundColor: t.colors.background.primary,
    borderWidth: 1.5,
    borderColor: t.colors.border.strong,
  },
  linkKnotWinner: { borderColor: t.colors.accent.primary },

  // ── Player frame ──
  playerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  playerHeaderText: { flex: 1, minWidth: 0, gap: 4, alignItems: 'flex-start' },
  avatar: {
    width: 36,
    height: 36,
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

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], alignSelf: 'stretch' },
  playerName: {
    flexShrink: 1,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
  },
  playerNameWinner: { fontWeight: t.typography.weight.semibold },
  crownIcon: { fontSize: 14 },

  flavorLine: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.body,
    fontStyle: 'italic',
    lineHeight: t.typography.size.caption * 1.35,
  },
  flavorLineWinner: {
    color: t.colors.accent.primary,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
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
    paddingVertical: 2,
    borderRadius: t.radius.sm,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.bold,
    letterSpacing: 0.5,
  },

  // ── Deck frame ──
  artWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  art: { width: '100%', height: '100%', opacity: 0.22 },
  artScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.background.surface + '66',
  },
  commanderName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
    lineHeight: t.typography.size['body-md'] * 1.25,
  },
  deckName: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
  },
  deckFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  chevron: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-lg'],
    lineHeight: t.typography.size['body-lg'],
  },
})
