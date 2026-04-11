/**
 * SCR-014 — Commander Detail FULL.
 *
 * Shows commander name, color chips, partner badge, win rate stats,
 * decks using this commander, and players who piloted it.
 *
 * Replaces DATA-010 stub (EPIC-01).
 * HIST-009 (EPIC-04)
 */
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorChips } from '@/components/ui/ColorChips';
import { useCommanderStats } from '@/hooks/useCommanderStats';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CommanderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, error } = useCommanderStats(id);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Commander not found.'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { commander, total_matches, wins, win_rate_pct, decks_using, players_using } = data;
  const hasMatches = total_matches > 0;
  const winRateDisplay = win_rate_pct !== null ? `${win_rate_pct}%` : '—';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Nav header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{commander.name}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
      >
        {/* ── Hero: name + colors + partner badge ── */}
        <View style={styles.hero}>
          <View style={styles.nameRow}>
            <Text style={styles.commanderName} numberOfLines={2}>{commander.name}</Text>
            {commander.isPartner && (
              <View style={styles.partnerBadge}>
                <Text style={styles.partnerBadgeText}>Partner</Text>
              </View>
            )}
          </View>
          <ColorChips selected={commander.colors} readonly />
          {commander.colors.length === 0 && (
            <Text style={styles.colorlessNote}>Colorless commander</Text>
          )}
        </View>

        {/* ── Stats bar ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          {hasMatches ? (
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={[styles.statValue, styles.statValueHighlight]}>{winRateDisplay}</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{total_matches}</Text>
                <Text style={styles.statLabel}>Partidas</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{wins}</Text>
                <Text style={styles.statLabel}>Victorias</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Sin partidas con este commander</Text>
            </View>
          )}
        </View>

        {/* ── Decks using ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Decks{decks_using.length > 0 ? ` (${decks_using.length})` : ''}
          </Text>
          {decks_using.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Sin decks que usen este commander</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {decks_using.map((du) => (
                <TouchableOpacity
                  key={du.deck.id}
                  style={styles.deckRow}
                  onPress={() => router.push(`/decks/${du.deck.id}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deckName} numberOfLines={1}>{du.deck.name}</Text>
                  <Text style={styles.deckMatches}>{du.matches}p</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Players using ── */}
        {players_using.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Jugadores ({players_using.length})</Text>
            <View style={styles.list}>
              {players_using.map((pu) => {
                const initials = pu.player.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <View key={pu.player.id} style={styles.playerRow}>
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerAvatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.playerName} numberOfLines={1}>{pu.player.name}</Text>
                    <Text style={styles.playerMatches}>{pu.matches}p</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    textAlign: 'center',
  },
  linkText: {
    color: colors.text.link,
    fontSize: typography.size['body-lg'],
  },

  // Nav header
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backBtn: { width: 32, alignItems: 'center' },
  backIcon: {
    color: colors.text.primary,
    fontSize: 28,
    lineHeight: 32,
  },
  navTitle: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
    flex: 1,
    textAlign: 'center',
  },

  // Content
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[6],
  },

  // Hero
  hero: { gap: spacing[3] },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  commanderName: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.bold,
    flexShrink: 1,
  },
  partnerBadge: {
    backgroundColor: colors.accent.primary + '33',
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  partnerBadgeText: {
    color: colors.accent.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },
  colorlessNote: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    fontStyle: 'italic',
  },

  // Sections
  section: { gap: spacing[3] },
  sectionTitle: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  list: { gap: spacing[2] },

  // Stats
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statPill: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statValue: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.bold,
  },
  statValueHighlight: { color: AMBER },
  statLabel: { color: colors.text.muted, fontSize: typography.size.caption },
  emptyCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    fontStyle: 'italic',
  },

  // Deck row
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  deckName: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  deckMatches: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    flexShrink: 0,
  },

  // Player row
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[3],
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playerAvatarText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
  },
  playerName: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  playerMatches: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    flexShrink: 0,
  },
});
