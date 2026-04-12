/**
 * SCR-008: Match Tracker — live tracking screen.
 *
 * Full-screen modal (tab bar hidden). Renders a TrackerLayout with 2/3/4 PlayerSections.
 * Each section contains LifeCounter, PoisonCounter, and CommanderDamagePanel.
 * EventLogPanel + Undo button are accessible via a floating button.
 *
 * TRACK-003 (EPIC-03)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CommanderDamagePanel } from '@/components/tracker/CommanderDamagePanel';
import { EventLogPanel } from '@/components/tracker/EventLogPanel';
import { LifeCounter } from '@/components/tracker/LifeCounter';
import { PoisonCounter } from '@/components/tracker/PoisonCounter';
import { TrackerLayout } from '@/components/match/TrackerLayout';
import { useTracker } from '@/hooks/useTracker';
import { colors, spacing, typography } from '@/styles/tokens';

// ─── Timer ───────────────────────────────────

function useMatchTimer() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ─── Screen ──────────────────────────────────

export default function MatchTrackerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const timer = useMatchTimer();
  const [logVisible, setLogVisible] = useState(false);

  const {
    match,
    participations,
    events,
    loading,
    error,
    toastError,
    clearToastError,
    recordEvent,
    undoLastEvent,
  } = useTracker(id);

  // Clear toast after 3s
  useEffect(() => {
    if (!toastError) return;
    const t = setTimeout(clearToastError, 3000);
    return () => clearTimeout(t);
  }, [toastError, clearToastError]);

  // Redirect if match is not in_progress
  useEffect(() => {
    if (!match) return;
    if (match.status === 'completed') {
      router.replace(`/match/${id}/results`);
    } else if (match.status === 'abandoned') {
      router.back();
    }
  }, [match, id, router]);

  const handleCloseMatch = useCallback(() => {
    router.push(`/match/${id}/close`);
  }, [id, router]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  if (error || !match) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? t('match.matchNotFound')}</Text>
      </View>
    );
  }

  // Build sections for TrackerLayout
  const sections = participations.map((p) => {
    // Enemy commanders: commanders from all other participations
    const enemyCommanders = participations
      .filter((other) => other.id !== p.id)
      .flatMap((other) => {
        const cmds = [{ id: other.commander.id, name: other.commander.name }];
        if (other.commander2) cmds.push({ id: other.commander2.id, name: other.commander2.name });
        return cmds;
      });

    return {
      id: p.id,
      playerName: p.player.name,
      content: (
        <View style={styles.sectionContent}>
          <LifeCounter
            lifeTotal={p.lifeTotal}
            participationId={p.id}
            onEvent={recordEvent}
          />
          <PoisonCounter
            poisonCounters={p.poisonCounters}
            participationId={p.id}
            onEvent={recordEvent}
          />
          <CommanderDamagePanel
            commanderDamage={p.commanderDamage}
            enemyCommanders={enemyCommanders}
            participationId={p.id}
            onEvent={recordEvent}
          />
        </View>
      ),
    };
  });

  const hasUndoableEvents = events.some((e) => !e.isUndone);

  return (
    <SafeAreaView style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.timer}>{timer}</Text>
        <Pressable
          onPress={handleCloseMatch}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel={t('tracker.closeMatch')}
        >
          <Text style={styles.closeBtnText}>{t('tracker.closeBtn')}</Text>
        </Pressable>
      </View>

      {/* ── Tracker layout ── */}
      <View style={styles.layoutContainer}>
        <TrackerLayout sections={sections} />
      </View>

      {/* ── Toast error ── */}
      {toastError && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastError}</Text>
        </View>
      )}

      {/* ── Floating controls: Undo + Event Log toggle ── */}
      <View style={styles.floatingRow}>
        <Pressable
          onPress={undoLastEvent}
          disabled={!hasUndoableEvents}
          style={[styles.floatingBtn, !hasUndoableEvents && styles.floatingBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={t('tracker.undoLastAction')}
        >
          <Text style={[styles.floatingBtnText, !hasUndoableEvents && styles.floatingBtnTextDisabled]}>
            {t('tracker.undoBtn')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setLogVisible((v) => !v)}
          style={styles.floatingBtn}
          accessibilityRole="button"
          accessibilityLabel={t('tracker.toggleEventLog')}
        >
          <Text style={styles.floatingBtnText}>{t('tracker.logBtn')}</Text>
        </Pressable>
      </View>

      {/* ── Event log panel ── */}
      {logVisible && (
        <EventLogPanel
          events={events}
          participations={participations}
          onUndo={undoLastEvent}
          onClose={() => setLogVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.size['body-lg'],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  timer: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
    fontVariant: ['tabular-nums'],
  },
  closeBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.status.error + '22',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.status.error + '55',
  },
  closeBtnText: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },

  // Layout
  layoutContainer: {
    flex: 1,
  },
  sectionContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    gap: spacing[2],
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 80,
    left: spacing[4],
    right: spacing[4],
    backgroundColor: colors.status.error,
    borderRadius: 8,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  toastText: {
    color: '#fff',
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },

  // Floating row
  floatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  floatingBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  floatingBtnDisabled: {
    opacity: 0.4,
  },
  floatingBtnText: {
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  floatingBtnTextDisabled: {
    color: colors.text.muted,
  },
});
