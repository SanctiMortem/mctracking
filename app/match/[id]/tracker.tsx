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
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CommanderDamagePanel } from '@/components/tracker/CommanderDamagePanel';
import { EventLogPanel } from '@/components/tracker/EventLogPanel';
import { LifeCounter } from '@/components/tracker/LifeCounter';
import { PlayerDashboard } from '@/components/tracker/PlayerDashboard';
import { PoisonCounter } from '@/components/tracker/PoisonCounter';
import { TrackerLayout } from '@/components/match/TrackerLayout';
import { useTracker } from '@/hooks/useTracker';
import { loadMatchLayout, saveMatchLayout } from '@/services/matchLayout';
import { clockwiseParticipationIds, nextAliveClockwise } from '@/services/clockwiseOrder';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

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

function useTurnTimers(
  clockwiseOrder: string[],
  deadIds: ReadonlySet<string>,
  onTurnPassed?: (participationId: string) => void,
) {
  // Elapsed seconds per player (persists across start/stop)
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  // Per-player turn counts. A turn only counts when the new active player is
  // the legitimate clockwise successor (skipping dead) of the last player
  // who legitimately took a turn.
  const [turnCounts, setTurnCounts] = useState<Record<string, number>>({});
  // Which player's timer is currently running (null = paused)
  const [activeId, setActiveId] = useState<string | null>(null);
  // Last player who took a *legitimate* turn. Out-of-order taps don't move it,
  // so the rotation can pick up where it left off once corrected.
  const lastCorrectActorRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTurnPassedRef = useRef(onTurnPassed);
  onTurnPassedRef.current = onTurnPassed;
  const orderRef = useRef(clockwiseOrder);
  orderRef.current = clockwiseOrder;
  const deadRef = useRef(deadIds);
  deadRef.current = deadIds;

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

  const incrementTurn = useCallback((id: string) => {
    setTurnCounts((counts) => ({ ...counts, [id]: (counts[id] ?? 0) + 1 }));
    onTurnPassedRef.current?.(id);
    lastCorrectActorRef.current = id;
  }, []);

  const toggle = useCallback((id: string) => {
    setActiveId((prev) => {
      // Re-tap currently active player → pause; the timer stops but no
      // counters move. Tapping again resumes (handled by the next branch).
      if (prev === id) return null;
      // Resuming the same player who last took a legitimate turn → no count.
      if (prev === null && lastCorrectActorRef.current === id) return id;

      const last = lastCorrectActorRef.current;
      const order = orderRef.current;
      const dead = deadRef.current;

      // First activation of the match → that player owns turn 1.
      if (last === null) {
        incrementTurn(id);
        return id;
      }
      // Out-of-order tap → just hand the timer over, no count, rotation
      // pointer stays where it was so a corrective tap still works.
      const expected = nextAliveClockwise(last, order, dead);
      if (expected !== null && expected === id) {
        incrementTurn(id);
      }
      return id;
    });
  }, [incrementTurn]);

  // Force-set the starting player (used by the dice roll). Bypasses the
  // rotation check so the chosen player anchors a fresh sequence.
  const seedActivePlayer = useCallback((id: string) => {
    incrementTurn(id);
    setActiveId(id);
  }, [incrementTurn]);

  return { elapsed, activeId, toggle, turnCounts, seedActivePlayer };
}

// ─── Screen ─────────────────────────────────────

export default function MatchTrackerScreen() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { id, rotations: rotationsParam, playerOrder: playerOrderParam, layout: layoutParam } = useLocalSearchParams<{ id: string; rotations?: string; playerOrder?: string; layout?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const timer = useMatchTimer();
  const insets = useSafeAreaInsets();
  const [logVisible, setLogVisible] = useState(false);

  // Parse rotation map from setup screen (playerId → degrees). If the URL
  // params are missing (user resumed after closing the app), we fall back to
  // the values in `storedLayout` below.
  const paramRotations: Record<string, number> | null = (() => {
    if (!rotationsParam) return null;
    try { return JSON.parse(decodeURIComponent(rotationsParam)); }
    catch { return null; }
  })();

  const paramPlayerOrder: string[] | null = (() => {
    if (!playerOrderParam) return null;
    try { return JSON.parse(decodeURIComponent(playerOrderParam)); }
    catch { return null; }
  })();

  const paramLayoutVariant: string | null = layoutParam
    ? decodeURIComponent(layoutParam)
    : null;

  // Hydrate from SecureStore when URL params are missing, and save back so
  // resuming keeps working after a reload.
  const [storedLayout, setStoredLayout] = useState<{
    rotations: Record<string, number>;
    playerOrder: string[];
    layoutVariant: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Prefer URL params (fresh from setup); write them through so next resume
    // can recover. Otherwise, load from SecureStore.
    if (paramRotations && paramPlayerOrder && paramLayoutVariant) {
      void saveMatchLayout(id, {
        rotations: paramRotations,
        playerOrder: paramPlayerOrder,
        layoutVariant: paramLayoutVariant,
      });
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const loaded = await loadMatchLayout(id);
      if (!cancelled && loaded) setStoredLayout(loaded);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, rotationsParam, playerOrderParam, layoutParam]);

  const rotationMap: Record<string, number> =
    paramRotations ?? storedLayout?.rotations ?? {};
  const playerOrder: string[] =
    paramPlayerOrder ?? storedLayout?.playerOrder ?? [];
  const resolvedLayoutVariant: string | undefined =
    paramLayoutVariant ?? storedLayout?.layoutVariant ?? undefined;

  const {
    match,
    participations,
    events,
    loading,
    error,
    toastError,
    clearToastError,
    recordEvent,
    applyLifeChange,
    applyPoisonChange,
    applyCommanderDamage,
    undoLastEvent,
    addLocalEvent,
  } = useTracker(id);

  // Turn timers — initialized once participations load.
  // When a *legitimate* clockwise rotation happens, persist a turn_passed marker.
  const recordTurnPassed = useCallback(
    (participationId: string) => {
      void recordEvent({ participationId, eventType: 'turn_passed', delta: 0 });
    },
    [recordEvent],
  );

  // Dead players — tracked as local state, only set via the Dead button.
  // Declared before useTurnTimers so the rotation can skip them.
  const [deadPlayerIds, setDeadPlayerIds] = useState<Set<string>>(new Set());

  // Clockwise participation order — derived from seat order + layout variant.
  // Sortedness comes from playerOrder (set during match setup); clockwise
  // sequencing then maps section indices to ids.
  const sortedParticipationIds = playerOrder.length > 0
    ? [...participations]
        .sort((a, b) => {
          const idxA = playerOrder.indexOf(a.playerId);
          const idxB = playerOrder.indexOf(b.playerId);
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        })
        .map((p) => p.id)
    : participations.map((p) => p.id);
  const clockwiseIds = clockwiseParticipationIds(resolvedLayoutVariant, sortedParticipationIds);
  const turnTimers = useTurnTimers(clockwiseIds, deadPlayerIds, recordTurnPassed);

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
        <ActivityIndicator color={theme.colors.accent.primary} size="large" />
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

  // Reuse the seat-sorted ids resolved before useTurnTimers to keep one
  // canonical order between the rotation engine and the rendered grid.
  const partById = new Map(participations.map((p) => [p.id, p]));
  const sortedParticipations = sortedParticipationIds
    .map((id) => partById.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // ── Random starting player (dice roll) ────────
  const handleRandomStart = () => {
    if (sortedParticipations.length < 2) return;
    const idx = Math.floor(Math.random() * sortedParticipations.length);
    const chosen = sortedParticipations[idx];
    // Seed the rotation: anchor on the dice-picked player, bypassing the
    // clockwise-successor check so the chosen seat owns turn 1.
    turnTimers.seedActivePlayer(chosen.id);
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
          artCrop={p.commander.artCrop ?? p.commander2?.artCrop ?? null}
          timerSeconds={turnTimers.elapsed[p.id] ?? 0}
          timerActive={turnTimers.activeId === p.id}
          turnCount={turnTimers.turnCounts[p.id] ?? 0}
          onToggleTimer={() => turnTimers.toggle(p.id)}
          isDead={deadPlayerIds.has(p.id)}
          onMarkDead={() => {
            setDeadPlayerIds((prev) => new Set(prev).add(p.id));
            recordEvent({ participationId: p.id, eventType: 'player_died', delta: 0 });
          }}
          lifeCounter={
            <LifeCounter
              lifeTotal={p.lifeTotal}
              participationId={p.id}
              onDelta={applyLifeChange}
            />
          }
          poisonOverlay={
            <PoisonCounter
              poisonCounters={p.poisonCounters}
              participationId={p.id}
              onDelta={applyPoisonChange}
            />
          }
          cmdDamageOverlay={
            <CommanderDamagePanel
              commanderDamage={p.commanderDamage}
              enemyCommanders={enemyCommanders}
              participationId={p.id}
              onDelta={applyCommanderDamage}
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
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      {/* Header — explicit insets.top so it sits below the notch on
          fullScreenModal presentations where SafeAreaView's top inset
          doesn't reliably apply. */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
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
        <TrackerLayout sections={sections} layoutVariant={resolvedLayoutVariant} />
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

const createStyles = (t: AppTheme) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  centered: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-lg'],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-md'],
  },
  timer: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
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
    backgroundColor: t.colors.accent.primary + '22',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: t.colors.accent.primary + '44',
  },
  diceBtnText: {
    fontSize: t.typography.size['body-lg'],
  },
  closeBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: t.colors.status.error + '22',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: t.colors.status.error + '55',
  },
  closeBtnText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },

  layoutContainer: {
    flex: 1,
  },

  toast: {
    position: 'absolute',
    bottom: 80,
    left: spacing[4],
    right: spacing[4],
    backgroundColor: t.colors.status.error,
    borderRadius: 8,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  toastText: {
    color: '#fff',
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
  },

  floatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    borderTopColor: t.colors.border.subtle,
  },
  floatingBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: t.colors.background.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  floatingBtnDisabled: {
    opacity: 0.4,
  },
  floatingBtnText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  floatingBtnTextDisabled: {
    color: t.colors.text.muted,
  },
})
