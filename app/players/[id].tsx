/**
 * SCR-012 — Player Profile (stub)
 * Shows player info + stats placeholders. Stats filled in EPIC-04.
 * DATA-008 (EPIC-01)
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

import type { Player } from '@/db/index';
import { apiFetch } from '@/services/api';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const STAT_PLACEHOLDERS = [
  { label: 'Win Rate', value: '—' },
  { label: 'Matches', value: '0' },
  { label: 'Wins', value: '0' },
  { label: 'Win Streak', value: '0' },
];

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch<Player>(`/api/players/${id}`, 'GET', undefined, token ?? undefined);
        setPlayer(data);
      } catch (e: unknown) {
        if ((e as { status?: number }).status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, getToken]);

  const initials = player?.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !player) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Player not available</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const joinedDate = new Date(player.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar + name */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{player.name}</Text>
          <Text style={styles.joined}>Player since {joinedDate}</Text>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsGrid}>
            {STAT_PLACEHOLDERS.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.statsHint}>
            Stats will appear once {player.name} plays their first completed match.
          </Text>
        </View>

        {/* Match history placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Matches</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Match history available in a future update.</Text>
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
  hero: { alignItems: 'center', gap: spacing[3] },
  avatar: {
    width: 80,
    height: 80,
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
  name: {
    color: colors.text.primary,
    fontSize: typography.size['heading-lg'],
    fontWeight: typography.weight.bold,
  },
  joined: { color: colors.text.muted, fontSize: typography.size['body-sm'] },
  section: { gap: spacing[3] },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard: {
    flex: 1,
    minWidth: '40%',
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
