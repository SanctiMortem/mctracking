/**
 * SCR-010: Match Results — post-match summary.
 * Shows outcome (win/draw/abandoned), winner card, participant list,
 * duration, and CTAs (detail / new match / home).
 *
 * MATCH-007 (EPIC-02)
 */
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MatchResultCard } from '@/components/match/MatchResultCard';
import { ParticipantResultRow } from '@/components/match/ParticipantResultRow';
import { useMatchResults } from '@/hooks/useMatchResults';
import { colors, radius, spacing, typography } from '@/styles/tokens';

export default function MatchResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, loading, error } = useMatchResults(id);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? t('match.cannotLoadResult')}</Text>
        <TouchableOpacity style={styles.ctaOutline} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.ctaOutlineText}>{t('match.goHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { outcome, winner, winConditionDisplay, participations, duration } = data;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[4] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero: outcome card ── */}
        <MatchResultCard
          outcome={outcome}
          winner={winner}
          winConditionDisplay={winConditionDisplay}
        />

        {/* ── Participant list ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('match.playersSection')}</Text>
          <View style={styles.participantList}>
            {participations.map((p) => (
              <ParticipantResultRow
                key={p.id}
                participation={p}
                isWinner={winner?.id === p.id}
              />
            ))}
          </View>
        </View>

        {/* ── Duration ── */}
        <View style={styles.durationRow}>
          <Text style={styles.durationLabel}>{t('match.duration')}</Text>
          <Text style={styles.durationValue}>{duration}</Text>
        </View>

        {/* ── CTAs ── */}
        <View style={styles.ctaStack}>
          {/* "Ver detalle" — only if not abandoned */}
          {outcome !== 'abandoned' && (
            <TouchableOpacity
              style={styles.ctaOutline}
              onPress={() => router.push(`/match/${id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.ctaOutlineText}>{t('match.viewDetail')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => router.replace('/match/setup')}
            activeOpacity={0.7}
          >
            <Text style={styles.ctaPrimaryText}>{t('match.newMatch')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctaGhost}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
          >
            <Text style={styles.ctaGhostText}>{t('tabs.home')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[4],
  },

  center: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    padding: spacing[6],
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    textAlign: 'center',
  },

  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  participantList: {
    gap: spacing[2],
  },

  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
  },
  durationLabel: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  durationValue: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },

  ctaStack: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  ctaPrimary: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  ctaPrimaryText: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  ctaOutline: {
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  ctaOutlineText: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  ctaGhost: {
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  ctaGhostText: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
});
