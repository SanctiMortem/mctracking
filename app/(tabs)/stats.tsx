/**
 * SCR-006 — Stats Dashboard.
 *
 * Displays:
 *   - Hero metric: total completed matches
 *   - CTA to SCR-015 Matchup Stats
 *   - Player Rankings (PlayerRankingRow list)
 *   - Top Decks (DeckStatRow reuse)
 *   - Top Commanders (color chips + win rate)
 *
 * Empty state when no completed matches exist yet.
 *
 * HIST-011 (EPIC-04)
 */
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DeckStatRow } from '@/components/match/DeckStatRow';
import { PlayerRankingRow } from '@/components/stats/PlayerRankingRow';
import { TopDeckPodiumCard, type PodiumTier } from '@/components/stats/TopDeckPodiumCard';
import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { useGroups } from '@/hooks/useGroups';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const styles = useThemedStyles(createStyles);

  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyTitle}>{t('stats.noStatsYet')}</Text>
      <Text style={styles.emptySubtitle}>{t('stats.completeFirst')}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const router = useRouter();
  const { t } = useTranslation();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const [scopeGroupId, setScopeGroupId] = useState<string | null>(null);
  const { groups } = useGroups();
  const { data, loading, error } = useGlobalStats(scopeGroupId);

  const scopeOptions: Array<{ id: string | null; label: string }> = [
    { id: null, label: t('stats.scopePersonal') },
    ...groups.map((g) => ({ id: g.group.id, label: g.group.name })),
  ];

  const header = (
    <View
      style={[
        styles.header,
        { paddingHorizontal: contentPadding },
        contentMaxWidth
          ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number }
          : undefined,
      ]}
    >
      <Text style={styles.title}>{t('tabs.stats')}</Text>
      <Text style={styles.subtitle}>
        The ledger of triumphs and defeats — take measure of your legend.
      </Text>
    </View>
  );

  const scopePicker = scopeOptions.length > 1 ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scopeRow}
      style={styles.scopeScroll}
    >
      {scopeOptions.map((opt) => {
        const selected = opt.id === scopeGroupId;
        return (
          <TouchableOpacity
            key={opt.id ?? 'personal'}
            style={[styles.scopeChip, selected && styles.scopeChipActive]}
            onPress={() => setScopeGroupId(opt.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.scopeChipText, selected && styles.scopeChipTextActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  ) : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        {scopePicker}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        {scopePicker}
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data || data.total_matches === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        {scopePicker}
        <View style={styles.center}>
          <EmptyState />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {header}
      {scopePicker}
      <ScrollView style={styles.mainScroll} contentContainerStyle={[styles.content, { paddingHorizontal: contentPadding }, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]} showsVerticalScrollIndicator={false}>
      {/* Hero — total matches */}
      <View style={styles.hero}>
        <Text style={styles.heroNumber}>{data.total_matches}</Text>
        <Text style={styles.heroLabel}>{t('stats.completedMatches')}</Text>
        <Text style={styles.heroSub}>{data.total_players} {data.total_players === 1 ? t('stats.activePlayer') : t('stats.activePlayers')}</Text>
      </View>

      {/* Matchup CTA */}
      <TouchableOpacity
        style={styles.matchupCta}
        onPress={() => router.push('/stats/matchup')}
        activeOpacity={0.8}
      >
        <View>
          <Text style={styles.matchupCtaTitle}>{t('stats.viewMatchup')}</Text>
          <Text style={styles.matchupCtaSub}>{t('stats.headToHead')}</Text>
        </View>
        <Text style={styles.matchupCtaArrow}>›</Text>
      </TouchableOpacity>

      {/* Top Decks — podium: #1 big art, #2 @ 2/3, #3 @ 1/2, ranks 4–5 as plain rows */}
      {data.top_decks.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t('stats.topDecks')} />
          <View style={styles.podiumList}>
            {data.top_decks.slice(0, 3).map((entry, i) => (
              <TopDeckPodiumCard
                key={entry.deck.id}
                tier={(i + 1) as PodiumTier}
                deck={entry.deck}
                commanders={entry.commanders}
                matches={entry.total_matches}
                win_rate_pct={entry.win_rate_pct}
                current_streak={entry.current_streak}
                onPress={() => router.push(`/decks/${entry.deck.id}`)}
              />
            ))}
            {data.top_decks.slice(3).map((entry) => (
              <DeckStatRow
                key={entry.deck.id}
                deck={entry.deck}
                commanders={entry.commanders}
                matches={entry.total_matches}
                win_rate_pct={entry.win_rate_pct}
                onPress={() => router.push(`/decks/${entry.deck.id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Player Rankings — ranks #1–3 get a commander art thumbnail of their most-used deck */}
      {data.player_rankings.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t('stats.playerRanking')} />
          <View style={styles.list}>
            {data.player_rankings.map((ranking) => {
              const isPodium = ranking.rank >= 1 && ranking.rank <= 3;
              const podiumDeck = isPodium
                ? data.top_player_decks?.find((e) => e.playerId === ranking.player.id) ?? null
                : null;
              return (
                <PlayerRankingRow
                  key={ranking.player.id}
                  ranking={ranking}
                  topDeckArtCrop={podiumDeck?.commanders[0]?.artCrop ?? null}
                  topDeckLabel={ranking.rank === 1 ? podiumDeck?.deck.name ?? null : null}
                  onPress={() => router.push(`/players/${ranking.player.id}`)}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Top Commanders */}
      {data.top_commanders.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t('stats.topCommanders')} />
          <View style={styles.list}>
            {data.top_commanders.map((entry) => {
              const winRateText = entry.win_rate_pct !== null ? `${entry.win_rate_pct}%` : '—';
              return (
                <TouchableOpacity
                  key={entry.commander.id}
                  style={styles.commanderRow}
                  onPress={() => router.push(`/commanders/${entry.commander.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.commanderInfo}>
                    <Text style={styles.commanderName} numberOfLines={1}>{entry.commander.name}</Text>
                    <ManaIdentityRow colors={entry.commander.colorIdentity} size="xs" />
                  </View>
                  <View style={styles.commanderStats}>
                    <Text style={styles.matchCount}>{entry.total_matches}p</Text>
                    <View style={[styles.wrBadge, entry.win_rate_pct !== null && styles.wrBadgeActive]}>
                      <Text style={[styles.wrText, entry.win_rate_pct !== null && styles.wrTextActive]}>
                        {winRateText}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  content: {
    padding: spacing[4],
    gap: spacing[6],
  },
  center: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    gap: 2,
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  title: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.bold,
  },
  subtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.body,
    fontStyle: 'italic' as const,
    letterSpacing: 0.2,
  },

  // flexShrink: 0 prevents the strip from being squeezed by the main
  // ScrollView below once it fills with content. flexGrow: 0 stops it from
  // expanding to fill remaining vertical space.
  scopeScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  // The main scroll view explicitly takes the remaining space and scrolls
  // internally — without flex: 1 it sizes to its content height, which causes
  // the column to overflow and forces sibling shrink.
  mainScroll: {
    flex: 1,
  },
  // Padding hardcoded (not driven by useResponsive's contentPadding) so the
  // chip strip's metrics never change when the page below it loads/reflows.
  scopeRow: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
    gap: spacing[2],
    alignItems: 'center' as const,
  },
  scopeChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: t.radius.round,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    backgroundColor: t.colors.background.surface,
  },
  scopeChipActive: {
    backgroundColor: t.colors.accent.primary + '22',
    borderColor: t.colors.accent.primary + '99',
  },
  scopeChipText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
  },
  scopeChipTextActive: {
    color: t.colors.accent.primary,
  },

  hero: {
    alignItems: 'center',
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
    gap: spacing[1],
  },
  heroNumber: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['heading-xl'],
    fontFamily: t.typography.fontFamily.display,
    fontWeight: t.typography.weight.black,
  },
  heroLabel: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
  },
  heroSub: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
  },
  matchupCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.colors.accent.primary + '22',
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.accent.primary + '44',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  matchupCtaTitle: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
  },
  matchupCtaSub: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
    marginTop: 2,
  },
  matchupCtaArrow: {
    color: t.colors.accent.primary,
    fontSize: 28,
    lineHeight: 32,
  },

  section: { gap: spacing[3] },
  sectionHeader: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  list: { gap: spacing[2] },
  podiumList: { gap: spacing[4] + 4 },

  commanderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  commanderInfo: { flex: 1, gap: 4 },
  commanderName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.medium,
  },
  commanderStats: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  matchCount: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
  },
  wrBadge: {
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  wrBadgeActive: { backgroundColor: t.colors.accent.primary + '22' },
  wrText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
  },
  wrTextActive: { color: t.colors.accent.primary },

  empty: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[12],
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
    textAlign: 'center',
  },

  errorText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
})
