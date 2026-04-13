/**
 * SCR-011: Match Detail FULL — meta, participants, result, and read-only EventLog.
 *
 * Replaces the MATCH-008 stub (EPIC-02). EventLog reuses EventLogItem from
 * TRACK-007 in read-only mode (no Undo button, no interactivity).
 *
 * HIST-003 (EPIC-04)
 */
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { EventLogItem } from '@/components/tracker/EventLogItem';
import { ParticipantResultRow } from '@/components/match/ParticipantResultRow';
import { useMatchDetail } from '@/hooks/useMatchDetail';
import type { Match } from '@/db/index';
import type { MatchOutcome } from '@/hooks/useMatchResults';
import { colors, radius, spacing, typography } from '@/styles/tokens';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

type StatusConfig = { label: string; color: string; bg: string };

function statusConfig(status: Match['status'], t: TFunction): StatusConfig {
  switch (status) {
    case 'completed':   return { label: t('match.statusCompleted'), color: colors.status.success, bg: colors.status.success + '22' };
    case 'in_progress': return { label: t('match.statusInProgress'), color: colors.accent.primary, bg: colors.accent.primary + '22' };
    case 'abandoned':   return { label: t('match.statusAbandoned'), color: colors.text.muted, bg: colors.background.elevated };
  }
}

type OutcomeLabelConfig = { icon: string; label: string; color: string };

function outcomeLabelConfig(outcome: MatchOutcome, t: TFunction): OutcomeLabelConfig {
  switch (outcome) {
    case 'win':       return { icon: '✦', label: t('match.outcomeVictory'), color: colors.accent.primary };
    case 'draw':      return { icon: '◈', label: t('match.outcomeDraw'),    color: colors.accent.primary };
    case 'abandoned': return { icon: '✕', label: t('match.outcomeAbandoned'), color: colors.text.muted };
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionTitle({ label, count }: { label: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {count !== undefined && (
        <Text style={styles.sectionCount}>{count}</Text>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, loading, error } = useMatchDetail(id);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? t('match.cannotLoadDetail')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { match, participations, result, formattedEvents, outcome, winner, winConditionDisplay, duration } = data;
  const sc = statusConfig(match.status, t);
  const oc = outcomeLabelConfig(outcome, t);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('match.detail')}</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={formattedEvents}
        keyExtractor={(e) => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[6] }]}

        // ── In-progress banner ──
        ListHeaderComponent={
          <View style={styles.sections}>
            {match.status === 'in_progress' && (
              <TouchableOpacity
                style={styles.inProgressBanner}
                onPress={() => router.push(`/match/${id}/tracker`)}
                activeOpacity={0.7}
              >
                <Text style={styles.inProgressText}>{t('match.inProgressBanner')}</Text>
                <Text style={styles.inProgressCta}>{t('match.goToTracker')}</Text>
              </TouchableOpacity>
            )}

            {/* ── Match meta ── */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('match.date')}</Text>
                <Text style={styles.metaValue}>{formatDate(match.createdAt)}</Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('match.duration')}</Text>
                <Text style={styles.metaValue}>{duration}</Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('match.status')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>
            </View>

            {/* ── Resultado ── */}
            <View style={styles.section}>
              <SectionTitle label={t('match.result')} />
              <View style={styles.outcomeCard}>
                <View style={styles.outcomeRow}>
                  <Text style={[styles.outcomeIcon, { color: oc.color }]}>{oc.icon}</Text>
                  <Text style={[styles.outcomeLabel, { color: oc.color }]}>{oc.label}</Text>
                  {winner && (
                    <Text style={styles.winnerName} numberOfLines={1}>{winner.player.name}</Text>
                  )}
                </View>
                {winConditionDisplay && (
                  <View style={styles.conditionRow}>
                    <Text style={styles.conditionLabel}>{t('match.winConditionLabel')}</Text>
                    <View style={[styles.conditionBadge, { backgroundColor: colors.accent.primary + '22' }]}>
                      <Text style={[styles.conditionText, { color: colors.accent.primary }]}>{winConditionDisplay}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* ── Jugadores ── */}
            <View style={styles.section}>
              <SectionTitle label={t('match.playersSection')} count={participations.length} />
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

            {/* ── Event Log header ── */}
            <View style={styles.section}>
              <SectionTitle label="Event Log" count={formattedEvents.length} />
            </View>
          </View>
        }

        // ── Event log items ──
        renderItem={({ item }) => (
          <View style={styles.eventItem}>
            <EventLogItem event={item} />
          </View>
        )}

        // ── Empty log state ──
        ListEmptyComponent={
          <View style={styles.emptyLog}>
            <Text style={styles.emptyLogText}>{t('match.noEvents')}</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  center: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    textAlign: 'center',
  },
  linkText: {
    color: colors.text.link,
    fontSize: typography.size['body-lg'],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backBtn: { width: 32, alignItems: 'center' },
  backIcon: {
    color: colors.text.primary,
    fontSize: 28,
    lineHeight: 32,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },

  // Scroll content
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  sections: {
    gap: spacing[4],
    marginBottom: spacing[3],
  },

  // In-progress banner
  inProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent.primary + '22',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.primary + '44',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  inProgressText: {
    color: colors.accent.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },
  inProgressCta: {
    color: colors.accent.primary,
    fontSize: typography.size['body-sm'],
  },

  // Meta card
  metaCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  metaLabel: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  metaValue: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing[4],
  },
  statusBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  statusText: {
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.5,
  },

  // Sections
  section: { gap: spacing[3] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sectionTitle: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderRadius: radius.round,
    overflow: 'hidden',
  },

  // Outcome card
  outcomeCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  outcomeIcon: { fontSize: 18 },
  outcomeLabel: {
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
  winnerName: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    flex: 1,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  conditionLabel: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  conditionBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  conditionText: {
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },

  // Participants
  participantList: { gap: spacing[2] },

  // Event log
  eventItem: {
    paddingHorizontal: spacing[1],
  },
  emptyLog: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  emptyLogText: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    fontStyle: 'italic',
  },
});
