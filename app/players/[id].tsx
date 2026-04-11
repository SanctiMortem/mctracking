/**
 * SCR-012 — Player Profile FULL.
 *
 * Shows player initials + name, win rate hero (amber large number or
 * "Sin partidas"), W/L/D breakdown, favorite decks (top 5), and
 * favorite commanders (top 5 with color chips).
 *
 * Replaces DATA-008 stub (EPIC-01).
 * HIST-005 (EPIC-04)
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
import { DeckStatRow } from '@/components/match/DeckStatRow';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ label, count }: { label: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {count !== undefined && (
        <Text style={styles.sectionCount}>{count}</Text>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, error } = usePlayerStats(id);

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
          <Text style={styles.errorText}>{error ?? 'Player not found.'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { player, total_matches, wins, losses, draws, win_rate_pct, favorite_decks, favorite_commanders } = data;

  const initials = player.name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const hasMatches = total_matches > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Navigation header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{player.name}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
      >
        {/* ── Hero: avatar + name ── */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.playerName} numberOfLines={2}>{player.name}</Text>
        </View>

        {/* ── Win rate hero ── */}
        <View style={styles.winRateCard}>
          {hasMatches ? (
            <View style={styles.winRateContent}>
              <Text style={styles.winRateNumber}>
                {win_rate_pct !== null ? `${win_rate_pct}%` : '—'}
              </Text>
              <Text style={styles.winRateLabel}>Win Rate</Text>
            </View>
          ) : (
            <Text style={styles.noMatchesText}>Sin partidas registradas</Text>
          )}

          {/* W / L / D breakdown */}
          <View style={styles.wldRow}>
            <View style={styles.wldItem}>
              <Text style={[styles.wldValue, styles.wldWin]}>{wins}</Text>
              <Text style={styles.wldLabel}>Victorias</Text>
            </View>
            <View style={styles.wldDivider} />
            <View style={styles.wldItem}>
              <Text style={styles.wldValue}>{losses}</Text>
              <Text style={styles.wldLabel}>Derrotas</Text>
            </View>
            <View style={styles.wldDivider} />
            <View style={styles.wldItem}>
              <Text style={styles.wldValue}>{draws}</Text>
              <Text style={styles.wldLabel}>Empates</Text>
            </View>
            <View style={styles.wldDivider} />
            <View style={styles.wldItem}>
              <Text style={styles.wldValue}>{total_matches}</Text>
              <Text style={styles.wldLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* ── Decks más usados ── */}
        <View style={styles.section}>
          <SectionTitle label="Decks más usados" count={favorite_decks.length} />
          {favorite_decks.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>Sin datos de decks</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {favorite_decks.map((fd) => (
                <DeckStatRow
                  key={fd.deck.id}
                  deck={fd.deck}
                  commanders={fd.commanders}
                  matches={fd.matches}
                  win_rate_pct={fd.win_rate_pct}
                  onPress={() => router.push(`/decks/${fd.deck.id}`)}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Commanders más usados ── */}
        <View style={styles.section}>
          <SectionTitle label="Commanders más usados" count={favorite_commanders.length} />
          {favorite_commanders.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>Sin datos de commanders</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {favorite_commanders.map((fc) => (
                <TouchableOpacity
                  key={fc.commander.id}
                  style={styles.commanderRow}
                  onPress={() => router.push(`/commanders/${fc.commander.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.commanderInfo}>
                    <Text style={styles.commanderName} numberOfLines={1}>
                      {fc.commander.name}
                    </Text>
                    <ColorChips selected={fc.commander.colors} readonly />
                  </View>
                  <View style={styles.commanderStats}>
                    <Text style={styles.cmdMatchCount}>{fc.matches}p</Text>
                    <View style={[styles.wrBadge, fc.win_rate_pct !== null && styles.wrBadgeActive]}>
                      <Text style={[styles.wrText, fc.win_rate_pct !== null && styles.wrTextActive]}>
                        {fc.win_rate_pct !== null ? `${fc.win_rate_pct}%` : '—'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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

  // Scroll content
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[4],
  },

  // Hero
  hero: { alignItems: 'center', gap: spacing[3] },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.round,
    backgroundColor: colors.accent.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent.primary,
    fontSize: typography.size['heading-xl'],
    fontWeight: typography.weight.bold,
  },
  playerName: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },

  // Win rate card
  winRateCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[4],
    alignItems: 'center',
  },
  winRateContent: { alignItems: 'center', gap: spacing[1] },
  winRateNumber: {
    color: AMBER,
    fontSize: 48,
    fontWeight: typography.weight.bold,
    lineHeight: 56,
  },
  winRateLabel: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noMatchesText: {
    color: colors.text.muted,
    fontSize: typography.size['body-lg'],
    fontStyle: 'italic',
  },

  // W/L/D row
  wldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  wldItem: { flex: 1, alignItems: 'center', gap: 2 },
  wldValue: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.bold,
  },
  wldWin: { color: AMBER },
  wldLabel: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
  },
  wldDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.subtle,
  },

  // Sections
  section: { gap: spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionTitle: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderRadius: radius.round,
    overflow: 'hidden',
  },
  list: { gap: spacing[2] },

  // Empty section
  emptySection: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    fontStyle: 'italic',
  },

  // Commander row
  commanderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  commanderInfo: { flex: 1, gap: 4 },
  commanderName: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  commanderStats: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  cmdMatchCount: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  wrBadge: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  wrBadgeActive: { backgroundColor: AMBER + '22' },
  wrText: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
  },
  wrTextActive: { color: AMBER },
});
