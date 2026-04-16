/**
 * SCR-005 — Historial de partidas.
 *
 * FlatList paginada con filtros (MatchHistoryFilterBar), MatchCards,
 * estado vacío, infinite scroll y pull-to-refresh.
 * Tap en MatchCard → SCR-011 (/match/[id]).
 *
 * HIST-002 (EPIC-04)
 */
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

import { MatchCard, MatchCardSkeleton } from '@/components/match/MatchCard';
import { MatchHistoryFilterBar } from '@/components/match/MatchHistoryFilterBar';
import { useGroupContext } from '@/contexts/GroupContext';
import { useMatchHistory } from '@/hooks/useMatchHistory';
import { useResponsive } from '@/hooks/useResponsive';
import { apiFetch } from '@/services/api';
import { BannerAdWrapper } from '@/components/ads/BannerAdWrapper';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🃏</Text>
      {hasFilters ? (
        <>
          <Text style={styles.emptyTitle}>{t('history.noMatchesFound')}</Text>
          <Text style={styles.emptySubtitle}>{t('history.adjustFilters')}</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>{t('history.noMatchesYet')}</Text>
          <Text style={styles.emptySubtitle}>{t('history.startFirst')}</Text>
        </>
      )}
    </View>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonList() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.list}>
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
    </View>
  );
}

// ─── Footer spinner ───────────────────────────────────────────────────────────

function LoadMoreFooter({ loading }: { loading: boolean }) {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  if (!loading) return null;
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{t('history.loadingMore')}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const styles = useThemedStyles(createStyles);

  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const { activeContext } = useGroupContext();
  const groupId = activeContext !== 'personal' ? activeContext : null;
  const { isTablet, columns, contentMaxWidth, contentPadding } = useResponsive();
  const {
    matches, hasMore, loading, loadingMore, error,
    filters, setFilters, refresh, loadMore,
  } = useMatchHistory(groupId);

  const hasFilters = Object.values(filters).some(Boolean);

  const handleDeleteMatch = (matchId: string) => {
    Alert.alert(
      t('common.delete'),
      t('common.confirm') + '?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await apiFetch(`/api/matches/${matchId}`, 'DELETE', undefined, token ?? undefined);
              refresh();
            } catch {
              Alert.alert(t('common.error'));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      {/* Filter bar — always visible */}
      <MatchHistoryFilterBar filters={filters} onChange={setFilters} />

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          key={`history-cols-${columns}`}
          data={matches}
          keyExtractor={(item) => item.match.id}
          numColumns={columns}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: contentPadding },
            contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined,
            matches.length === 0 && styles.listEmpty,
          ]}
          columnWrapperStyle={columns > 1 ? { gap: spacing[3] } : undefined}
          renderItem={({ item }) => (
            <View style={columns > 1 ? { flex: 1 } : undefined}>
              <MatchCard
                summary={item}
                onPress={() => router.push(`/match/${item.match.id}`)}
                onDelete={() => handleDeleteMatch(item.match.id)}
              />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<EmptyState hasFilters={hasFilters} />}
          ListFooterComponent={<LoadMoreFooter loading={loadingMore} />}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          onRefresh={refresh}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Banner ad — hidden for premium users (BR-AUTH-04) */}
      <BannerAdWrapper />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },

  list: {
    padding: spacing[4],
    gap: spacing[3],
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  separator: {
    height: spacing[3],
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[12],
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
  },

  errorBanner: {
    backgroundColor: t.colors.status.error + '22',
    padding: spacing[3],
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    borderRadius: 8,
  },
  errorText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
  },

  footer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  footerText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },
})
