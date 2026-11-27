/**
 * SCR-006 — Stats Dashboard.
 *
 * Composes the redesigned stats experience:
 *   - Hero: "Stats" + italic-serif tagline
 *   - Scope chip strip (eye-icon on the active "All my matches" pill)
 *   - Highlights carousel (compass-dial medallions — shipped separately)
 *   - "THE HALL — Top Decks" 3-up podium + ranks 4-5 rows
 *   - "View Matchup" callout
 *   - "THE STANDINGS — Player Ranking"
 *   - "MOST HONOURED — Top Commanders"
 *
 * Empty state when no completed matches exist yet.
 *
 * HIST-011 (EPIC-04)
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CommanderRankRow } from '@/components/stats/CommanderRankRow';
import { DeckRankRow } from '@/components/stats/DeckRankRow';
import { MatchupCallout } from '@/components/stats/MatchupCallout';
import { PlayerRankRow } from '@/components/stats/PlayerRankRow';
import { PodHighlightsCarousel } from '@/components/stats/PodHighlightsCarousel';
import { SectionHeader } from '@/components/stats/SectionHeader';
import { StatsScopePicker } from '@/components/stats/StatsScopePicker';
import { TopDecksPodium, type PodiumDeckEntry } from '@/components/stats/TopDecksPodium';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { useGroups } from '@/hooks/useGroups';
import { useStatsHighlights } from '@/hooks/useStatsHighlights';
import { fullGlobalStatsPath, useNewStatsEnabled, useRankingsV2, useStatsV2 } from '@/hooks/useStatsV2';
import { useResponsive } from '@/hooks/useResponsive';
import type { GlobalStats } from '@/services/stats';
import { mergePlayerRankings, orderByRanking } from '@/services/stats2/view';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

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
  const [scopeAutoSet, setScopeAutoSet] = useState(false);
  const { groups } = useGroups();
  const { data, loading, error } = useGlobalStats(scopeGroupId);
  const { data: podHighlightsData, loading: podHighlightsLoading } = useStatsHighlights(scopeGroupId);

  // LABS — stats v2. v2 decides who is ranked and in what order; the rows
  // themselves are still the current ones. `full` is the current payload
  // without its top-5 cap, so every deck and commander v2 ranks has its row.
  // If either request fails or is still loading, the current lists show.
  const newStats = useNewStatsEnabled();
  const v2 = useRankingsV2(scopeGroupId, newStats);
  const full = useStatsV2<GlobalStats>(newStats ? fullGlobalStatsPath(scopeGroupId) : null);

  // If the user belongs to exactly one pod and hasn't picked a scope yet,
  // default to that pod on first render so the carousel + rankings show
  // pod data instead of personal. Only fires once.
  useEffect(() => {
    if (scopeAutoSet) return;
    if (scopeGroupId !== null) return;
    if (groups.length === 1) {
      setScopeGroupId(groups[0].group.id);
      setScopeAutoSet(true);
    }
  }, [groups, scopeGroupId, scopeAutoSet]);

  const scopeOptions: Array<{ id: string | null; label: string }> = [
    { id: null, label: t('stats.scopePersonal') },
    ...groups.map((g) => ({ id: g.group.id, label: g.group.name })),
  ];

  // One subtitle for every scope — the line is doing brand work, not
  // narrating the data. Scope picker carries the "what am I looking at"
  // job on its own.
  const subtitle = t('stats.subtitle');

  // Map player → top commander name for the "often [Commander]" subline
  // on the ranking rows. Built off top_player_decks already returned by
  // the global stats endpoint.
  const playerTopCommanderName = useMemo(() => {
    const m = new Map<string, string>();
    for (const entry of data?.top_player_decks ?? []) {
      const first = entry.commanders[0];
      if (first) m.set(entry.playerId, first.name);
    }
    return m;
  }, [data?.top_player_decks]);

  // ALL links → dedicated per-entity screens. Forward the active scope so
  // the user lands on the same lens they were viewing in the dashboard;
  // the in-screen picker can still override it.
  const allParams = scopeGroupId ? { group_id: scopeGroupId } : undefined;
  const navigateToAllDecks = () => router.push({ pathname: '/stats/decks', params: allParams });
  const navigateToAllPlayers = () => router.push({ pathname: '/stats/players', params: allParams });
  const navigateToAllCommanders = () => router.push({ pathname: '/stats/commanders', params: allParams });

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
      <Text style={styles.title}>{t('stats.title')}</Text>
      <View style={styles.subtitleRow}>
        <View style={styles.subtitleDash} />
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );

  const scopePicker = (
    <StatsScopePicker options={scopeOptions} value={scopeGroupId} onChange={setScopeGroupId} />
  );

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

  const v2Lists = v2.data && full.data && Array.isArray(full.data.top_decks) && Array.isArray(full.data.top_commanders);
  const topDecks = v2Lists
    ? orderByRanking(full.data!.top_decks, (e) => e.deck.id, v2.data!.decks).slice(0, 5)
    : data.top_decks;
  const topCommanders = v2Lists
    ? orderByRanking(full.data!.top_commanders, (e) => e.commander.id, v2.data!.commanders).slice(0, 5)
    : data.top_commanders;
  const playerRows = mergePlayerRankings(data.player_rankings, v2.data?.players).slice(0, 6);
  const firstUnranked = playerRows.findIndex((row) => row.unranked);

  const podiumEntries: PodiumDeckEntry[] = topDecks.slice(0, 3).map((e) => ({
    deck: e.deck,
    commanders: e.commanders,
    total_matches: e.total_matches,
    win_rate_pct: e.win_rate_pct,
  }));

  return (
    <SafeAreaView style={styles.screen}>
      {header}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: contentPadding },
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Scope chip strip scrolls with the content — keeps the page light
            and avoids a sticky bar fighting with the carousel underneath. */}
        {scopePicker}

        {/* Highlights carousel — locked design, shipped previously. */}
        <PodHighlightsCarousel data={podHighlightsData} loading={podHighlightsLoading} />

        {/* THE HALL — Top Decks */}
        {topDecks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              eyebrow={t('stats.sectionHallEyebrow')}
              title={t('stats.topDecks')}
              onAllPress={navigateToAllDecks}
            />
            <TopDecksPodium decks={podiumEntries} onPressDeck={(deck) => router.push(`/decks/${deck.id}`)} />
            {topDecks.slice(3).map((entry, idx) => (
              <DeckRankRow
                key={entry.deck.id}
                rank={idx + 4}
                deck={entry.deck}
                commanders={entry.commanders}
                matches={entry.total_matches}
                win_rate_pct={entry.win_rate_pct}
                ownerName={entry.commanders[0]?.name ?? null}
                onPress={() => router.push(`/decks/${entry.deck.id}`)}
              />
            ))}
          </View>
        )}

        {/* View Matchup — pivot from deck stats to head-to-head. */}
        <MatchupCallout
          title={t('stats.viewMatchup')}
          subtitle={t('stats.headToHead')}
          onPress={() => router.push('/stats/matchup')}
        />

        {/* THE STANDINGS — Player Ranking */}
        {playerRows.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              eyebrow={t('stats.sectionStandingsEyebrow')}
              title={t('stats.playerRanking')}
              onAllPress={navigateToAllPlayers}
            />
            <View>
              {playerRows.map((row, idx) => {
                const { ranking } = row;
                const isPodium = ranking.rank >= 1 && ranking.rank <= 3;
                const podiumDeck = isPodium
                  ? data.top_player_decks?.find((e) => e.playerId === ranking.player.id) ?? null
                  : null;
                return (
                  <Fragment key={ranking.player.id}>
                    {idx === firstUnranked && (
                      <Text style={styles.unrankedLabel}>
                        {t('stats2.unranked', { count: v2.data?.players.min_matches ?? 3 })}
                      </Text>
                    )}
                    <PlayerRankRow
                      ranking={ranking}
                      topDeckArtCrop={podiumDeck?.commanders[0]?.artCrop ?? null}
                      topCommanderName={playerTopCommanderName.get(ranking.player.id) ?? null}
                      onPress={() => router.push(`/players/${ranking.player.id}`)}
                      winsVsExpected={row.winsVsExpected}
                      unranked={row.unranked}
                    />
                  </Fragment>
                );
              })}
            </View>
          </View>
        )}

        {/* MOST HONOURED — Top Commanders */}
        {topCommanders.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              eyebrow={t('stats.sectionHonouredEyebrow')}
              title={t('stats.topCommanders')}
              onAllPress={navigateToAllCommanders}
            />
            <View>
              {topCommanders.map((entry, idx) => (
                <CommanderRankRow
                  key={entry.commander.id}
                  rank={idx + 1}
                  commander={entry.commander}
                  matches={entry.total_matches}
                  win_rate_pct={entry.win_rate_pct}
                  onPress={() => router.push(`/commanders/${entry.commander.id}`)}
                />
              ))}
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
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
    gap: spacing[6],
  },
  center: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  header: {
    gap: 6,
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
  },
  title: {
    color: t.colors.text.primary,
    fontSize: 40,
    lineHeight: 46,
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  subtitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  subtitleDash: {
    width: 18,
    height: 1,
    backgroundColor: t.colors.text.muted,
  },
  subtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.bodyItalic,
    fontStyle: 'italic' as const,
  },

  // Main scroll fills the remaining viewport — without flex:1 the content
  // would size to its own height and force siblings to shrink awkwardly.
  mainScroll: {
    flex: 1,
  },

  section: { gap: spacing[3] },

  // Stats v2 (Labs): divider above the players under the minimum.
  unrankedLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.body,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    paddingTop: spacing[3],
  },

  empty: {
    alignItems: 'center' as const,
    gap: spacing[3],
    paddingVertical: spacing[12],
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    textAlign: 'center' as const,
  },
  emptySubtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
    textAlign: 'center' as const,
  },

  errorText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
    textAlign: 'center' as const,
    paddingHorizontal: spacing[4],
  },
});
