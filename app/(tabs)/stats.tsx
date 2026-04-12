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
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DeckStatRow } from '@/components/match/DeckStatRow';
import { PlayerRankingRow } from '@/components/stats/PlayerRankingRow';
import { ColorChips } from '@/components/ui/ColorChips';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { BannerAdWrapper } from '@/components/ads/BannerAdWrapper';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
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
  const router = useRouter();
  const { t } = useTranslation();
  const { data, loading, error } = useGlobalStats();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data || data.total_matches === 0) {
    return (
      <View style={[styles.screen, styles.center]}>
        <EmptyState />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

      {/* Player Rankings */}
      {data.player_rankings.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t('stats.playerRanking')} />
          <View style={styles.list}>
            {data.player_rankings.map((ranking) => (
              <PlayerRankingRow key={ranking.player.id} ranking={ranking} />
            ))}
          </View>
        </View>
      )}

      {/* Top Decks */}
      {data.top_decks.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t('stats.topDecks')} />
          <View style={styles.list}>
            {data.top_decks.map((entry) => (
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
                    <ColorChips selected={entry.commander.colors} readonly />
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

      {/* Banner ad — hidden for premium users (BR-AUTH-04) */}
      <BannerAdWrapper />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing[4],
    gap: spacing[6],
  },
  center: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[1],
  },
  heroNumber: {
    color: AMBER,
    fontSize: typography.size['heading-xl'],
    fontWeight: typography.weight.black,
  },
  heroLabel: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  heroSub: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
  },

  matchupCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent.primary + '22',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.primary + '44',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  matchupCtaTitle: {
    color: colors.accent.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  matchupCtaSub: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    marginTop: 2,
  },
  matchupCtaArrow: {
    color: colors.accent.primary,
    fontSize: 28,
    lineHeight: 32,
  },

  section: { gap: spacing[3] },
  sectionHeader: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  list: { gap: spacing[2] },

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
  matchCount: {
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

  empty: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[12],
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },

  errorText: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
});
