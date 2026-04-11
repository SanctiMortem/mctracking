/**
 * SCR-013 — Deck Detail (stub)
 * Shows deck info + commander(s) + stats placeholders. Stats in EPIC-04.
 * DATA-009 (EPIC-01)
 */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

import type { DeckWithCommanders } from '@/services/decks';
import { apiFetch } from '@/services/api';
import { ColorChips } from '@/components/ui/ColorChips';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const STAT_PLACEHOLDERS = [
  { label: 'Win Rate', value: '—' },
  { label: 'Matches', value: '0' },
  { label: 'Wins', value: '0' },
];

function CommanderCard({ commander }: { commander: { name: string; colors: string[]; isPartner: boolean } }) {
  return (
    <View style={styles.commanderCard}>
      <View style={styles.commanderHeader}>
        <Text style={styles.commanderName} numberOfLines={1}>{commander.name}</Text>
        {commander.isPartner && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Partner</Text>
          </View>
        )}
      </View>
      <ColorChips selected={commander.colors ?? []} readonly />
    </View>
  );
}

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const [deck, setDeck] = useState<DeckWithCommanders | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch<DeckWithCommanders>(`/api/decks/${id}`, 'GET', undefined, token ?? undefined);
        setDeck(data);
      } catch (e: unknown) {
        if ((e as { status?: number }).status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, getToken]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !deck) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Deck not available</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{deck.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Commander(s) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {deck.commander2 ? 'Partner Commanders' : 'Commander'}
          </Text>
          <CommanderCard commander={deck.commander} />
          {deck.commander2 && (
            <>
              <View style={styles.partnerDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>+</Text>
                <View style={styles.dividerLine} />
              </View>
              <CommanderCard commander={deck.commander2} />
            </>
          )}
        </View>

        {/* Description */}
        {deck.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{deck.description}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            {STAT_PLACEHOLDERS.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.statsHint}>
            Stats will appear after completing matches with this deck.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
    marginHorizontal: spacing[2],
  },
  backBtn: { padding: spacing[1], minWidth: 60 },
  backText: { color: colors.text.link, fontSize: typography.size['body-lg'] },
  content: { padding: spacing[6], gap: spacing[6] },
  section: { gap: spacing[3] },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  commanderCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  commanderHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  commanderName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  badge: {
    backgroundColor: colors.accent.primary + '33',
    borderRadius: radius.xs,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.accent.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  partnerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.default },
  dividerText: {
    color: colors.text.muted,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.bold,
  },
  description: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    lineHeight: 24,
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    padding: spacing[4],
  },
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    padding: spacing[4],
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
  statLabel: { color: colors.text.muted, fontSize: typography.size.caption },
  statsHint: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: { color: colors.status.error, fontSize: typography.size['body-lg'] },
});
