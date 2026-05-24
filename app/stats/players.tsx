/**
 * /stats/players — full ranked list of players for the active scope.
 *
 * Reached from the "ALL" link in the Stats dashboard's Player Ranking
 * section. Honours the `group_id` query param and exposes the scope
 * picker so the user can switch scopes in place.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PlayerRankRow } from '@/components/stats/PlayerRankRow';
import { StatsAllScreenHeader } from '@/components/stats/StatsAllScreenHeader';
import { StatsScopePicker } from '@/components/stats/StatsScopePicker';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { useGroups } from '@/hooks/useGroups';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

export default function StatsAllPlayersScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ group_id?: string }>();

  const initialGroupId = typeof params.group_id === 'string' && params.group_id.length > 0
    ? params.group_id
    : null;
  const [scopeGroupId, setScopeGroupId] = useState<string | null>(initialGroupId);
  const [scopeBootstrapped, setScopeBootstrapped] = useState(initialGroupId !== null);

  const { groups } = useGroups();
  const { data, loading, error } = useGlobalStats(scopeGroupId);

  useEffect(() => {
    if (scopeBootstrapped) return;
    if (groups.length === 1) {
      setScopeGroupId(groups[0].group.id);
      setScopeBootstrapped(true);
    }
  }, [groups, scopeBootstrapped]);

  const scopeOptions = [
    { id: null as string | null, label: t('stats.scopePersonal') },
    ...groups.map((g) => ({ id: g.group.id, label: g.group.name })),
  ];

  const rankings = data?.player_rankings ?? [];

  // Player → most-used commander name + art crop, surfaced on every row
  // (not just the podium) so the full list reads consistently.
  const playerArt = useMemo(() => {
    const m = new Map<string, { artCrop: string | null; commanderName: string | null }>();
    for (const entry of data?.top_player_decks ?? []) {
      const first = entry.commanders[0];
      m.set(entry.playerId, {
        artCrop: first?.artCrop ?? null,
        commanderName: first?.name ?? null,
      });
    }
    return m;
  }, [data?.top_player_decks]);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <StatsAllScreenHeader
        eyebrow={t('stats.sectionStandingsEyebrow')}
        title={t('stats.playerRanking')}
        subtitle={t('stats.subtitleAllPlayers')}
      />
      <StatsScopePicker options={scopeOptions} value={scopeGroupId} onChange={setScopeGroupId} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : rankings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{t('stats.noRankedPlayers')}</Text>
        </View>
      ) : (
        <FlatList
          data={rankings}
          keyExtractor={(r) => r.player.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const meta = playerArt.get(item.player.id);
            const isPodium = item.rank >= 1 && item.rank <= 3;
            return (
              <PlayerRankRow
                ranking={item}
                topDeckArtCrop={isPodium ? meta?.artCrop ?? null : null}
                topCommanderName={meta?.commanderName ?? null}
                onPress={() => router.push(`/players/${item.player.id}`)}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (t: AppTheme) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing[6],
  },
  empty: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.bodyItalic,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
  },
  error: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
    textAlign: 'center' as const,
  },
  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  separator: {
    height: 1,
    backgroundColor: t.colors.border.subtle,
    opacity: 0.6,
  },
});
