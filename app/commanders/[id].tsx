/**
 * SCR-014 — Commander Detail (stub)
 * Shows commander info + stats placeholders + decks using it. Stats in EPIC-04.
 * DATA-010 (EPIC-01)
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

import type { Commander } from '@/db/index';
import { apiFetch } from '@/services/api';
import { ColorChips } from '@/components/ui/ColorChips';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const STAT_PLACEHOLDERS = [
  { label: 'Win Rate', value: '—' },
  { label: 'Matches', value: '0' },
  { label: 'Decks', value: '0' },
];

export default function CommanderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const [commander, setCommander] = useState<Commander | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch<Commander>(`/api/commanders/${id}`, 'GET', undefined, token ?? undefined);
        setCommander(data);
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

  if (notFound || !commander) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Commander not available</Text>
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
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{commander.name}</Text>
            {commander.isPartner && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Partner</Text>
              </View>
            )}
          </View>
          <ColorChips selected={commander.colors ?? []} readonly />
          {commander.colors.length === 0 && (
            <Text style={styles.colorlessNote}>Colorless commander</Text>
          )}
        </View>

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
            Stats will appear after completing matches with this commander.
          </Text>
        </View>

        {/* Decks using this commander */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Decks Using This Commander</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Deck list will appear here in a future update.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backBtn: { padding: spacing[1] },
  backText: { color: colors.text.link, fontSize: typography.size['body-lg'] },
  content: { padding: spacing[6], gap: spacing[6] },
  hero: { gap: spacing[3] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flexWrap: 'wrap' },
  name: {
    color: colors.text.primary,
    fontSize: typography.size['heading-lg'],
    fontWeight: typography.weight.bold,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: colors.accent.primary + '33',
    borderRadius: radius.xs,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  badgeText: {
    color: colors.accent.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },
  colorlessNote: { color: colors.text.muted, fontSize: typography.size['body-sm'] },
  section: { gap: spacing[3] },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  placeholder: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  placeholderText: { color: colors.text.muted, fontSize: typography.size['body-sm'], textAlign: 'center' },
});
