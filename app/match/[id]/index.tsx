/**
 * SCR-011: Match Detail — shows match meta, participants, result, and
 * an Event Log placeholder (filled in EPIC-03).
 *
 * MATCH-008 (EPIC-02)
 */
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ParticipantResultRow } from '@/components/match/ParticipantResultRow';
import type { MatchOutcome } from '@/hooks/useMatchResults';
import { useMatchResults, winConditionLabel } from '@/hooks/useMatchResults';
import type { Match } from '@/db/index';
import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value: string | Date): string {
  const d = new Date(value);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

type StatusConfig = { label: string; color: string; bg: string };

function statusConfig(status: Match['status']): StatusConfig {
  switch (status) {
    case 'completed':  return { label: 'Completada',    color: colors.status.success, bg: colors.status.success + '22' };
    case 'in_progress': return { label: 'En curso',     color: AMBER,                 bg: AMBER + '22' };
    case 'abandoned':  return { label: 'Abandonada',    color: colors.text.muted,     bg: colors.background.elevated };
    default:           return { label: status,          color: colors.text.muted,     bg: colors.background.elevated };
  }
}

type OutcomeLabelConfig = { icon: string; label: string; color: string };

function outcomeLabelConfig(outcome: MatchOutcome): OutcomeLabelConfig {
  switch (outcome) {
    case 'win':       return { icon: '✦', label: 'Victoria',  color: AMBER };
    case 'draw':      return { icon: '◈', label: 'Empate',    color: colors.accent.primary };
    case 'abandoned': return { icon: '✕', label: 'Abandonada', color: colors.text.muted };
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, error } = useMatchResults(id);

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'No se pudo cargar el detalle.'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { match, participations, result, outcome, winner, duration } = data;
  const sc = statusConfig(match.status);
  const oc = outcomeLabelConfig(outcome);
  const winCond = result && !result.isDraw ? winConditionLabel(result.winCondition) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del match</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[6] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── In-progress banner ── */}
        {match.status === 'in_progress' && (
          <TouchableOpacity
            style={styles.inProgressBanner}
            onPress={() => router.push(`/match/${id}/tracker`)}
            activeOpacity={0.7}
          >
            <Text style={styles.inProgressText}>⚡ Partida en curso</Text>
            <Text style={styles.inProgressCta}>Ir al tracker →</Text>
          </TouchableOpacity>
        )}

        {/* ── Match meta ── */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>{formatDate(match.createdAt)}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Duración</Text>
            <Text style={styles.metaValue}>{duration}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Estado</Text>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>
        </View>

        {/* ── Outcome / result ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resultado</Text>
          <View style={styles.outcomeCard}>
            <View style={styles.outcomeRow}>
              <Text style={[styles.outcomeIcon, { color: oc.color }]}>{oc.icon}</Text>
              <Text style={[styles.outcomeLabel, { color: oc.color }]}>{oc.label}</Text>
              {winner && (
                <Text style={styles.winnerName} numberOfLines={1}>{winner.player.name}</Text>
              )}
            </View>
            {winCond && (
              <View style={styles.conditionRow}>
                <Text style={styles.conditionLabel}>Win condition</Text>
                <View style={[styles.conditionBadge, { backgroundColor: AMBER + '22' }]}>
                  <Text style={[styles.conditionText, { color: AMBER }]}>{winCond}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Participants ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jugadores</Text>
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

        {/* ── Event Log placeholder ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Log</Text>
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderIcon}>📜</Text>
            <Text style={styles.placeholderText}>Próximamente</Text>
            <Text style={styles.placeholderSub}>El historial de eventos se implementa en EPIC-03.</Text>
          </View>
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
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    gap: spacing[4],
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
  backBtn: {
    width: 32,
    alignItems: 'center',
  },
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

  // In-progress banner
  inProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AMBER + '22',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: AMBER + '44',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  inProgressText: {
    color: AMBER,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },
  inProgressCta: {
    color: AMBER,
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

  // Section
  section: { gap: spacing[3] },
  sectionTitle: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
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

  // Event log placeholder
  placeholderCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  placeholderIcon: { fontSize: 28 },
  placeholderText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  placeholderSub: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },
});
