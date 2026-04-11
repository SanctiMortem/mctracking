/**
 * SCR-005 — Historial de partidas.
 *
 * FlatList paginada con filtros (MatchHistoryFilterBar), MatchCards,
 * estado vacío, infinite scroll y pull-to-refresh.
 * Tap en MatchCard → SCR-011 (/match/[id]).
 *
 * HIST-002 (EPIC-04)
 */
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { MatchCard, MatchCardSkeleton } from '@/components/match/MatchCard';
import { MatchHistoryFilterBar } from '@/components/match/MatchHistoryFilterBar';
import { useMatchHistory } from '@/hooks/useMatchHistory';
import { colors, spacing, typography } from '@/styles/tokens';

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🃏</Text>
      {hasFilters ? (
        <>
          <Text style={styles.emptyTitle}>No matches found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>Sin partidas registradas</Text>
          <Text style={styles.emptySubtitle}>¡Inicia tu primera partida!</Text>
        </>
      )}
    </View>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonList() {
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
  if (!loading) return null;
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Loading…</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router = useRouter();
  const {
    matches, hasMore, loading, loadingMore, error,
    filters, setFilters, refresh, loadMore,
  } = useMatchHistory();

  const hasFilters = Object.values(filters).some(Boolean);

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
          data={matches}
          keyExtractor={(item) => item.match.id}
          contentContainerStyle={[
            styles.list,
            matches.length === 0 && styles.listEmpty,
          ]}
          renderItem={({ item }) => (
            <MatchCard
              summary={item}
              onPress={() => router.push(`/match/${item.match.id}`)}
            />
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
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

  errorBanner: {
    backgroundColor: colors.status.error + '22',
    padding: spacing[3],
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    borderRadius: 8,
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },

  footer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  footerText: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
});
