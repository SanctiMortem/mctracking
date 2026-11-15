/**
 * All of a player's own decks — every deck their account created, played or
 * not, ordered by commander. Reached from "All of X's decks" on the player
 * page. Each row opens the deck.
 *
 * The player page itself keeps listing the decks the player has PLAYED,
 * which can include other people's decks.
 */
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DeckStatRow } from '@/components/match/DeckStatRow';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

export default function PlayerDecksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { contentMaxWidth, contentPadding } = useResponsive();
  const { data, loading, error } = usePlayerStats(id);

  // `owned_decks` is missing when the API predates this screen.
  const decks = data?.owned_decks ?? [];
  const title = data ? t('player.allDecksTitle', { name: data.player.name }) : t('deck.decks');

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title,
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.background.primary },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent.primary} size="large" />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{error ?? t('common.error')}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: contentPadding },
            contentMaxWidth
              ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number }
              : undefined,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.count}>{t('player.deckCount', { count: decks.length })}</Text>
          {decks.length === 0 ? (
            <Text style={styles.muted}>{t('player.noOwnedDecks')}</Text>
          ) : (
            <View style={styles.list}>
              {decks.map((d) => (
                <DeckStatRow
                  key={d.deck.id}
                  deck={d.deck}
                  commanders={d.commanders}
                  matches={d.matches}
                  win_rate_pct={d.win_rate_pct}
                  onPress={() => router.push(`/decks/${d.deck.id}`)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  root: { flex: 1, backgroundColor: t.colors.background.primary },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing[3] },
  content: { paddingVertical: spacing[4], gap: spacing[3] },
  list: { gap: spacing[2] },
  count: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  muted: { color: t.colors.text.muted, fontSize: t.typography.size['body-sm'] },
  link: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
  },
});
