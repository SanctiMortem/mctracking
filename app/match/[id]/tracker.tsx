/**
 * SCR-008: Match Tracker — live tracking screen.
 *
 * 3-Level Architecture:
 *   Level 1 — TrackerLayout (Grid): divides screen into 2/3/4 slots
 *   Level 2 — PlayerSection (Frame): immovable anchor, handles rotation
 *   Level 3 — PlayerDashboard (Object): scalable content with all widgets
 *
 * Per-player turn timers: tap a player's name to start their timer.
 * Tapping again stops it; tapping another player starts theirs.
 *
 * TRACK-003 (EPIC-03)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { PlayerDashboard } from '@/components/tracker/PlayerDashboard';
import { PoisonCounter } from '@/components/tracker/PoisonCounter';
import { TrackerLayout } from '@/components/match/TrackerLayout';
import { useTracker } from '@/hooks/useTracker';
import { colors, spacing, typography } from '@/styles/tokens';

// ─── Match Timer ────────────────────────────────

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

// ─── Per-Player Turn Timers ─────────────────────

function useTurnTimers(participationIds: string[]) {
  // Elapsed seconds per player (persists across start/stop)
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  // Which player's timer is currently running (null = none)
  const [activeId, setActiveId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the active player's timer every second
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!activeId) return;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => ({ ...prev, [activeId]: (prev[activeId] ?? 0) + 1 }));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeId]);

  const toggle = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  return { elapsed, activeId, toggle };
}

// ─── Screen ─────────────────────────────────────

export default function MatchTrackerScreen() {
  const { id, rotations: rotationsParam, playerOrder: playerOrderParam, layout: layoutParam } = useLocalSearchParams<{ id: string; rotations?: string; playerOrder?: string; layout?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const timer = useMatchTimer();
  const [logVisible, setLogVisible] = useState(false);

  // Parse rotation map from setup screen (playerId → degrees)
  const rotationMap: Record<string, number> = (() => {
    if (!rotationsParam) return {};
    try { return JSON.parse(decodeURIComponent(rotationsParam)); }
    catch { return {}; }
  })();

  // Parse player order from setup screen — used to sort participations into
  // the exact seat arrangement the user configured, since all participations
  // share the same createdAt and DB order is non-deterministic.
  const playerOrder: string[] = (() => {
    if (!playerOrderParam) return [];
    try { return JSON.parse(decodeURIComponent(playerOrderParam)); }
    catch { return []; }
  })();

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
    addLocalEvent,
  } = useTracker(id);

  // Turn timers — initialized once participations load
  const turnTimers = useTurnTimers(participations.map((p) => p.id));

  // Dead players — tracked as local state, only set via the Dead button
  const [deadPlayerIds, setDeadPlayerIds] = useState<Set<string>>(new Set());

  // Clear toast after 3s
  useEffect(() => {
    if (!toastError) return;
    const t = setTimeout(clearToastError, 3000);
    return () => clearTimeout(t);
  }, [toastError, clearToastError]);

  // Redirect if match is not in_progress
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (!match || hasNavigatedRef.current) return;
    if (match.status === 'completed') {
      hasNavigatedRef.current = true;
      router.replace(`/match/${id}/results`);
    } else if (match.status === 'abandoned') {
      hasNavigatedRef.current = true;
      router.back();
    }
  }, [match, id, router]);

  const handleCloseMatch = useCallback(() => {
    router.push(`/match/${id}/close`);
  }, [id, router]);

  const handleUndo = useCallback(async () => {
    const undoneEvent = await undoLastEvent();
    if (undoneEvent && (undoneEvent.eventType as string) === 'player_died') {
      setDeadPlayerIds((prev) => {
        const next = new Set(prev);
        next.delete(undoneEvent.participationId);
        return next;
      });
    }
  }, [undoLastEvent]);

  const [hasRolled, setHasRolled] = useState(false);

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

  // Sort participations into the seat order from setup (if available).
  // Without this, all participations share the same createdAt and DB order is random.
  const sortedParticipations = playerOrder.length > 0
    ? [...participations].sort((a, b) => {
        const idxA = playerOrder.indexOf(a.playerId);
        const idxB = playerOrder.indexOf(b.playerId);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      })
    : participations;

  // ── Random starting player (dice roll) ────────
  const handleRandomStart = () => {
    if (sortedParticipations.length < 2) return;
    const idx = Math.floor(Math.random() * sortedParticipations.length);
    const chosen = sortedParticipations[idx];
    // If someone is already active, stop them first
    if (turnTimers.activeId && turnTimers.activeId !== chosen.id) {
      turnTimers.toggle(turnTimers.activeId);
    }
    if (turnTimers.activeId !== chosen.id) {
      turnTimers.toggle(chosen.id);
    }
    setHasRolled(true);
    Alert.alert('🎲', t('match.randomStarterResult', { name: chosen.player.name }));
  };

  // Build sections: Level 1 (Grid) gets Level 2 (Frame) wrapping Level 3 (Dashboard)
  const sections = sortedParticipations.map((p) => {
    const enemyCommanders = sortedParticipations
      .filter((other) => other.id !== p.id)
      .flatMap((other) => {
        const cmds = [{ id: other.commander.id, name: other.commander.name }];
        if (other.commander2) cmds.push({ id: other.commander2.id, name: other.commander2.name });
        return cmds;
      });

    // Sum all commander damage values for the trigger label
    const cmdDamageTotal = Object.values(p.commanderDamage ?? {}).reduce(
      (sum: number, v: unknown) => sum + (typeof v === 'number' ? v : 0),
      0,
    );

    return {
      id: p.id,
      rotation: rotationMap[p.playerId] ?? 0,
      isActive: turnTimers.activeId === p.id,
      content: (
        <PlayerDashboard
          playerName={p.player.name}
          timerSeconds={turnTimers.elapsed[p.id] ?? 0}
          timerActive={turnTimers.activeId === p.id}
          onToggleTimer={() => turnTimers.toggle(p.id)}
          isDead={deadPlayerIds.has(p.id)}
          onMarkDead={() => {
            setDeadPlayerIds((prev) => new Set(prev).add(p.id));
            addLocalEvent({ participationId: p.id, eventType: 'player_died' });
          }}
          lifeCounter={
            <LifeCounter
              lifeTotal={p.lifeTotal}
              participationId={p.id}
              onEvent={recordEvent}
            />
          }
          poisonOverlay={
            <PoisonCounter
              poisonCounters={p.poisonCounters}
              participationId={p.id}
              onEvent={recordEvent}
            />
          }
          cmdDamageOverlay={
            <CommanderDamagePanel
              commanderDamage={p.commanderDamage}
              enemyCommanders={enemyCommanders}
              participationId={p.id}
              onEvent={recordEvent}
            />
          }
          poisonCount={p.poisonCounters}
          cmdDamageTotal={cmdDamageTotal}
        />
      ),
    };
  });

  const hasUndoableEvents = events.some((e) => !e.isUndone);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            // Go back to home — match stays in_progress and can be resumed from detail
            router.dismissAll();
          }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.timer}>{timer}</Text>
        <View style={styles.headerActions}>
          {!hasRolled && (
            <Pressable
              onPress={handleRandomStart}
              style={styles.diceBtn}
              accessibilityRole="button"
              accessibilityLabel={t('match.randomize')}
            >
              <Text style={styles.diceBtnText}>🎲</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleCloseMatch}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('tracker.closeMatch')}
          >
            <Text style={styles.closeBtnText}>{t('tracker.closeBtn')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Tracker layout (Level 1 → Level 2 → Level 3) */}
      <View style={styles.layoutContainer}>
        <TrackerLayout sections={sections} layoutVariant={layoutParam ? decodeURIComponent(layoutParam) : undefined} />
      </View>

      {/* Toast error */}
      {toastError && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastError}</Text>
        </View>
      )}

      {/* Floating controls */}
      <View style={styles.floatingRow}>
        <Pressable
          onPress={handleUndo}
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

      {/* Event log panel */}
      {logVisible && (
        <EventLogPanel
          events={events}
          participations={participations}
          onUndo={handleUndo}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-md'],
  },
  timer: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
    fontVariant: ['tabular-nums'],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  diceBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.accent.primary + '22',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent.primary + '44',
  },
  diceBtnText: {
    fontSize: typography.size['body-lg'],
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

  layoutContainer: {
    flex: 1,
  },

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
