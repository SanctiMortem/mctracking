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
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CommanderDamagePanel } from '@/components/tracker/CommanderDamagePanel';
import { EventLogPanel } from '@/components/tracker/EventLogPanel';
import { JoinLayoutPicker, type JoinLayoutPickerResult } from '@/components/match/JoinLayoutPicker';
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

/**
 * Match wall clock. Derived from `matches.created_at` rather than counted up
 * from zero, so the header shows the true age of the match on every device
 * that opens it — not the age of this screen's mount. Timestamp-derived also
 * means it stays correct across app backgrounding, where JS interval throttling
 * would otherwise lose seconds.
 *
 * Returns "--:--" until the match loads, since we have no start time yet and
 * showing "00:00" for a two-hour-old match is worse than showing nothing.
 */
function useMatchTimer(startedAt: string | Date | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startMs = startedAt ? new Date(startedAt).getTime() : NaN;
  if (!Number.isFinite(startMs)) return '--:--';
  const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Longest a single in-flight `turn_passed` write may hold off adoption of
 *  remote turn state. See `turnWriteDeadlineRef`. */
const TURN_WRITE_GUARD_MAX_MS = 15000;

// ─── Per-Player Turn Timers ─────────────────────

function useTurnTimers(
  clockwiseOrder: string[],
  deadIds: ReadonlySet<string>,
  /**
   * Fires on every legitimate clockwise rotation. `incomingId` is the player
   * whose turn is starting (the canonical owner of the resulting turn_passed
   * event). `outgoingDurationSeconds` is the wall-time the previous active
   * player spent on the turn that just ended — null on the very first turn
   * of the match (no prior actor).
   */
  onTurnPassed?: (incomingId: string, outgoingDurationSeconds: number | null) => void,
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

  // Cumulative elapsed mirror — kept in a ref so `incrementTurn` (running
  // inside a setState callback) can read the latest values synchronously
  // when computing the outgoing player's just-ended turn duration.
  const elapsedRef = useRef<Record<string, number>>({});
  // Snapshot of `elapsed[playerId]` at the moment that player's current turn
  // started. Diffed against `elapsed[playerId]` on the next legitimate
  // rotation to derive that turn's duration. Pauses don't tick `elapsed`, so
  // paused time is naturally excluded from the diff.
  const turnStartSnapshotRef = useRef<Record<string, number>>({});
  // Set by `hydrate`. The turn that was already in progress when this device
  // opened the match was never observed here, so its real duration is unknown.
  // The next rotation therefore reports `null` rather than a bogus 0, which
  // would otherwise land a 0-second turn in the stats and drag averages down.
  const resumedTurnUnmeasuredRef = useRef(false);
  /**
   * ms timestamp of the last turn this device authored. The server derives
   * `lastActorId` from the last non-undone `turn_passed` event, so a poll
   * issued before our own turn_passed committed reports the PREVIOUS actor.
   * Adopting that rewinds the rotation pointer and restarts the turn clock —
   * compare against the snapshot's `syncedAt` and ignore anything older.
   */
  const lastLocalTurnAtRef = useRef(0);
  /**
   * `turn_passed` writes fired from this device that haven't settled yet.
   *
   * The timestamp above is NOT sufficient on its own. Between taking a turn
   * (stamped) and its POST landing, the server is still building snapshots
   * that legitimately predate the write — those carry `syncedAt` values
   * NEWER than the stamp while still reporting the previous actor, so they
   * sail past the timestamp check and rewind the rotation. The user then sees
   * their turn bounce back, taps again believing it never registered, and the
   * second tap IS the expected clockwise successor — so it counts a second
   * turn. This counter blocks the whole window regardless of timestamps,
   * mirroring `PendingCommit.inFlight` on the life/poison path.
   */
  const turnWriteInFlightRef = useRef(0);
  /**
   * Safety valve. `apiFetch` sets no timeout, so a wedged request would never
   * settle, `.finally` would never run, and the counter above would pin this
   * guard open — leaving the device permanently unable to adopt turn changes
   * from anyone else. Well clear of a normal round trip (<1s) and of the 4s
   * poll, while bounding the damage from a request that never returns.
   */
  const turnWriteDeadlineRef = useRef(0);

  // Tick the active player's timer every second
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!activeId) return;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = { ...prev, [activeId]: (prev[activeId] ?? 0) + 1 };
        elapsedRef.current = next;
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeId]);

  const incrementTurn = useCallback((id: string) => {
    setTurnCounts((counts) => ({ ...counts, [id]: (counts[id] ?? 0) + 1 }));
    // Compute the outgoing player's just-ended turn duration (null on the
    // very first turn — no prior actor — so no duration is recorded).
    const outgoing = lastCorrectActorRef.current;
    let outgoingDuration = outgoing
      ? Math.max(
          0,
          (elapsedRef.current[outgoing] ?? 0) - (turnStartSnapshotRef.current[outgoing] ?? 0),
        )
      : null;
    // First rotation after a resume — we never saw this turn start, so we
    // can't measure it. Report unknown instead of the 0 the diff would give.
    if (resumedTurnUnmeasuredRef.current) {
      outgoingDuration = null;
      resumedTurnUnmeasuredRef.current = false;
    }
    onTurnPassedRef.current?.(id, outgoingDuration);
    // Snapshot the incoming player's cumulative elapsed as their turn start.
    turnStartSnapshotRef.current[id] = elapsedRef.current[id] ?? 0;
    lastCorrectActorRef.current = id;
    lastLocalTurnAtRef.current = Date.now();
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

  /**
   * Restore turn state rebuilt from the server event log (resuming a match,
   * possibly on a different device). Completed turns replay exactly, because
   * `turn_duration_seconds` was measured with pauses already excluded.
   *
   * `activeId` is deliberately left null. A device that didn't watch the
   * current turn begin has no honest basis for a running clock — pauses aren't
   * events, so elapsing from the last turn_passed timestamp would over-count
   * every pause and show absurd numbers for a match reopened the next day.
   * The active player is still highlighted; one tap starts their clock.
   */
  const hydrate = useCallback((snapshot: {
    elapsed: Record<string, number>;
    turnCounts: Record<string, number>;
    lastActorId: string | null;
  }) => {
    setElapsed(snapshot.elapsed);
    elapsedRef.current = snapshot.elapsed;
    setTurnCounts(snapshot.turnCounts);
    lastCorrectActorRef.current = snapshot.lastActorId;
    // Snapshot == cumulative, so the in-flight turn measures from zero here.
    turnStartSnapshotRef.current = { ...snapshot.elapsed };
    if (snapshot.lastActorId) resumedTurnUnmeasuredRef.current = true;
  }, []);

  /**
   * Converge on the server's turn state (live sync). Called on every poll.
   *
   * The server only knows about COMPLETED turns — the turn currently in flight
   * hasn't produced a `turn_passed` event yet, so its seconds exist nowhere but
   * on the device running the clock. That's why the locally-active player is
   * exempt from the elapsed overwrite: adopting the server's lower number would
   * visibly rewind their timer on every poll.
   */
  const applyRemote = useCallback((remote: {
    elapsed: Record<string, number>;
    turnCounts: Record<string, number>;
    lastActorId: string | null;
    turnStartedAtMs: number | null;
    syncedAtMs: number;
  }) => {
    // Built before our own last turn committed, so its `lastActorId` is one
    // rotation behind reality. The monotonic merges below are still safe (a
    // stale snapshot only ever carries lower counters, which max discards),
    // but the rotation pointer must not move.
    const stale =
      (turnWriteInFlightRef.current > 0 && Date.now() < turnWriteDeadlineRef.current) ||
      remote.syncedAtMs < lastLocalTurnAtRef.current;
    // Merge by max, never by replace. Both counters only ever climb, and a
    // poll can easily be older than a local write that hasn't committed yet —
    // replacing would visibly rewind a turn we just took, then restore it a
    // few seconds later. Max converges either way: a higher local value wins
    // until the server catches up, a higher remote value (another device took
    // a turn) is adopted immediately.
    setTurnCounts((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [pid, remoteCount] of Object.entries(remote.turnCounts)) {
        if (remoteCount > (next[pid] ?? 0)) {
          next[pid] = remoteCount;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setElapsed((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [pid, remoteSeconds] of Object.entries(remote.elapsed)) {
        // The locally-active player is exempt: their local value legitimately
        // exceeds the server's by the in-flight turn, and max already keeps it.
        if (remoteSeconds > (next[pid] ?? 0)) {
          next[pid] = remoteSeconds;
          changed = true;
        }
      }
      if (!changed) return prev;
      elapsedRef.current = next;
      return next;
    });

    // A turn started that this device didn't author. We're watching it happen,
    // so — unlike a cold resume — we legitimately know when it began and can
    // run the clock from there. This is what makes the "tick from the moment
    // you observe the turn start" rule hold for synced devices too.
    const incoming = remote.lastActorId;
    if (!stale && incoming && incoming !== lastCorrectActorRef.current) {
      lastCorrectActorRef.current = incoming;
      const base = remote.elapsed[incoming] ?? 0;
      turnStartSnapshotRef.current[incoming] = base;
      const inFlight = remote.turnStartedAtMs
        ? Math.max(0, Math.floor((Date.now() - remote.turnStartedAtMs) / 1000))
        : 0;
      const candidate = base + inFlight;
      setElapsed((prev) => {
        // The one assignment here that bypasses the merge-by-max above, so it
        // needs its own floor: elapsed is cumulative across turns, and a
        // snapshot trailing our local clock must never wind it backwards.
        if (candidate <= (prev[incoming] ?? 0)) return prev;
        const next = { ...prev, [incoming]: candidate };
        elapsedRef.current = next;
        return next;
      });
      setActiveId(incoming);
      // We observed this turn begin, so its duration IS measurable.
      resumedTurnUnmeasuredRef.current = false;
    }
  }, []);

  /**
   * Re-stamp the local-turn clock once a `turn_passed` write has actually
   * settled. `incrementTurn` stamps when the turn is TAKEN, but the POST lands
   * later — a snapshot built in between is newer than that stamp while still
   * predating the write, so it would slip past the staleness check and rewind
   * the rotation anyway. Called from the write's settle handler.
   */
  const beginLocalTurnWrite = useCallback(() => {
    turnWriteInFlightRef.current += 1;
    const now = Date.now();
    lastLocalTurnAtRef.current = now;
    turnWriteDeadlineRef.current = now + TURN_WRITE_GUARD_MAX_MS;
  }, []);

  const endLocalTurnWrite = useCallback(() => {
    turnWriteInFlightRef.current = Math.max(0, turnWriteInFlightRef.current - 1);
    // Only now can a snapshot legitimately speak for the rotation again.
    lastLocalTurnAtRef.current = Date.now();
  }, []);

  return {
    elapsed, activeId, toggle, turnCounts,
    seedActivePlayer, hydrate, applyRemote,
    beginLocalTurnWrite, endLocalTurnWrite,
  };
}

// ─── Screen ─────────────────────────────────────

export default function MatchTrackerScreen() {
  // Prevent device auto-lock (incl. Low Power Mode) while a match is live.
  // expo-keep-awake calls UIApplication.isIdleTimerDisabled on iOS and
  // FLAG_KEEP_SCREEN_ON on Android. Scoped to this screen only — releases on unmount.
  useKeepAwake();

  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { id, rotations: rotationsParam, playerOrder: playerOrderParam, layout: layoutParam } = useLocalSearchParams<{ id: string; rotations?: string; playerOrder?: string; layout?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [logVisible, setLogVisible] = useState(false);
  // Mid-match layout editor — opens the JoinLayoutPicker in a modal
  // pre-filled with the device's current layout so the user can fix a
  // misconfigured seat arrangement without abandoning the match.
  const [layoutEditorVisible, setLayoutEditorVisible] = useState(false);

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
  // `layoutLoadResolved` flips true after the SecureStore load completes
  // (or is skipped because URL params are present). Until then we can't
  // tell whether this device has a layout — so we suppress the picker.
  const [layoutLoadResolved, setLayoutLoadResolved] = useState(false);

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
      setLayoutLoadResolved(true);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const loaded = await loadMatchLayout(id);
      if (cancelled) return;
      if (loaded) setStoredLayout(loaded);
      setLayoutLoadResolved(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, rotationsParam, playerOrderParam, layoutParam]);

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
    remoteSync,
  } = useTracker(id);

  // Declared after useTracker so it can read the match's real start time.
  const timer = useMatchTimer(match?.createdAt);

  // ── Layout resolution — most specific source first ────────────────────────
  //  1. storedLayout — this device's own choice, from the join picker or the
  //     mid-match editor. Always wins, so a local correction is never undone.
  //  2. URL params   — fresh from setup, on the device that created the match.
  //  3. match.layout — the setup arrangement, persisted server-side. This is
  //     what lets a second device reproduce the table automatically instead of
  //     being asked to rebuild it from scratch.
  const serverLayout = match?.layout ?? null;
  const rotationMap: Record<string, number> =
    storedLayout?.rotations ?? paramRotations ?? serverLayout?.rotations ?? {};
  const playerOrder: string[] =
    storedLayout?.playerOrder ?? paramPlayerOrder ?? serverLayout?.playerOrder ?? [];
  const resolvedLayoutVariant: string | undefined =
    storedLayout?.layoutVariant ?? paramLayoutVariant ?? serverLayout?.layoutVariant ?? undefined;

  // Turn timers — initialized once participations load.
  // When a *legitimate* clockwise rotation happens, persist a turn_passed
  // marker for the incoming player (event ownership unchanged), and tag it
  // with the duration of the just-ended turn so per-player time stats can
  // pair consecutive turn_passed events to attribute the duration to the
  // outgoing player.
  // Ref-held because `recordTurnPassed` is passed INTO useTurnTimers, so it
  // cannot close over the hook's return value directly. Same pattern as
  // `onTurnPassedRef` / `flushPendingRef` elsewhere in this file.
  const markTurnWriteRef = useRef<{ begin: () => void; end: () => void } | null>(null);

  const recordTurnPassed = useCallback(
    (participationId: string, outgoingDurationSeconds: number | null) => {
      markTurnWriteRef.current?.begin();
      void recordEvent({
        participationId,
        eventType: 'turn_passed',
        delta: 0,
        ...(outgoingDurationSeconds !== null
          ? { turnDurationSeconds: outgoingDurationSeconds }
          : {}),
      }).finally(() => {
        // The server has it now, so snapshots built from here on may speak
        // for the rotation again.
        markTurnWriteRef.current?.end();
      });
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
  markTurnWriteRef.current = {
    begin: turnTimers.beginLocalTurnWrite,
    end: turnTimers.endLocalTurnWrite,
  };

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

  // ── Resume: rebuild turn state from the server event log ──────────────────
  // Runs once, the first time the match finishes loading. Everything below is
  // derived from events the server already returns, so a device that never saw
  // the match start comes up with the same turn counts, per-player time, dead
  // players and rotation pointer as the device that has been tracking it.
  //
  // Undone events are skipped throughout, so an undo performed before the
  // resume is honoured (a revived player is alive again, their turn uncounted).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || loading || participations.length === 0) return;
    hydratedRef.current = true;

    const dead = new Set<string>();
    const turnCounts: Record<string, number> = {};
    const elapsed: Record<string, number> = {};
    let lastActorId: string | null = null;
    // Duration on a turn_passed event belongs to the OUTGOING player — the
    // participation on the *previous* non-undone turn_passed. Same pairing
    // rule as the read-only match detail screen (hooks/useMatchDetail.ts).
    let prevTurnPassedBy: string | null = null;

    for (const e of events) {
      if (e.isUndone) continue;
      if (e.eventType === 'player_died') {
        dead.add(e.participationId);
        continue;
      }
      if (e.eventType !== 'turn_passed') continue;

      turnCounts[e.participationId] = (turnCounts[e.participationId] ?? 0) + 1;
      if (prevTurnPassedBy && typeof e.turnDurationSeconds === 'number') {
        elapsed[prevTurnPassedBy] = (elapsed[prevTurnPassedBy] ?? 0) + e.turnDurationSeconds;
      }
      prevTurnPassedBy = e.participationId;
      lastActorId = e.participationId;
    }

    if (dead.size > 0) setDeadPlayerIds(dead);
    // A turn has been taken, so the dice roll is spent — offering it again
    // would reseed the rotation onto a random player mid-match.
    if (lastActorId) setHasRolled(true);
    turnTimers.hydrate({ elapsed, turnCounts, lastActorId });
    // `events` is intentionally not a dep: it grows on every local action and
    // this must run exactly once, off the initial load. hydratedRef guards it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, participations.length]);

  // ── Live sync: converge on the server's turn + death state ────────────────
  // Runs on every poll, but only after the initial hydrate — otherwise a poll
  // landing first would start this device's clock on a turn it never saw.
  useEffect(() => {
    if (!remoteSync || !hydratedRef.current) return;

    turnTimers.applyRemote({
      elapsed: remoteSync.elapsed,
      turnCounts: remoteSync.turnCounts,
      lastActorId: remoteSync.lastActorId,
      turnStartedAtMs: remoteSync.lastTurnPassedAt
        ? new Date(remoteSync.lastTurnPassedAt).getTime()
        : null,
      syncedAtMs: new Date(remoteSync.syncedAt).getTime(),
    });

    const nextDead = new Set(remoteSync.deadParticipationIds);
    // A death we recorded after the server built this snapshot isn't missing —
    // it just hasn't been seen yet. Without this, marking a player dead makes
    // them flicker back to alive until the following poll. Comparing against
    // the server's own clock keeps that distinct from "undone on another
    // device", which SHOULD revive them.
    const syncedAtMs = new Date(remoteSync.syncedAt).getTime();
    for (const e of events) {
      if ((e.eventType as string) !== 'player_died' || e.isUndone) continue;
      if (new Date(e.createdAt).getTime() > syncedAtMs) nextDead.add(e.participationId);
    }

    setDeadPlayerIds((prev) => {
      if (prev.size === nextDead.size && [...prev].every((pid) => nextDead.has(pid))) return prev;
      return nextDead;
    });
    // `turnTimers` is stable (all useCallback with [] deps); `events` is read
    // only to reconcile in-flight writes, and re-running on its identity would
    // fire this on every local tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSync]);

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

  // ── Layout-on-join picker ─────────────────────────────────────────────────
  // When a device joins an in-progress match via the active-match banner it
  // arrives at this screen WITHOUT URL params and WITHOUT a SecureStore
  // entry, so the previously-rendered tracker fell back to empty rotations
  // and a default layout. Show a picker so the joining player can pick
  // their own seat order + rotations + layout variant for THIS device. The
  // choice is saved per-device per-match so re-mounts skip the picker.
  const hasUsableLayout =
    (paramRotations && paramPlayerOrder && paramLayoutVariant) ||
    storedLayout !== null ||
    // Match was created with a seat arrangement — use it rather than asking
    // this device to describe a table it can already know about.
    serverLayout !== null;
  if (layoutLoadResolved && !hasUsableLayout && participations.length > 0) {
    const handlePickerConfirm = (result: JoinLayoutPickerResult) => {
      // Persist for this device, then drop straight into the tracker by
      // populating storedLayout — no remount or navigation roundtrip.
      void saveMatchLayout(id, result);
      setStoredLayout({
        rotations: result.rotations,
        playerOrder: result.playerOrder,
        layoutVariant: result.layoutVariant,
      });
    };
    return (
      <JoinLayoutPicker
        players={participations.map((p) => ({
          playerId: p.playerId,
          name: p.player.name,
        }))}
        onConfirm={handlePickerConfirm}
      />
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

  // Undo is enabled if EITHER this session recorded something or the server
  // reports undoable history — the latter covers a resumed match and events
  // another device recorded while this one was watching.
  const hasUndoableEvents =
    events.some((e) => !e.isUndone) || (remoteSync?.undoableEventCount ?? 0) > 0;

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

        <Pressable
          onPress={() => setLayoutEditorVisible(true)}
          style={styles.floatingBtn}
          accessibilityRole="button"
          accessibilityLabel={t('tracker.adjustLayoutLabel')}
        >
          <Text style={styles.floatingBtnText}>{t('tracker.layoutBtn')}</Text>
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

      {/* Mid-match layout editor — reuses JoinLayoutPicker pre-filled with
          the device's current layout. Local-only (per-device SecureStore),
          no API call, no effect on other phones in the pod. */}
      <Modal
        visible={layoutEditorVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLayoutEditorVisible(false)}
      >
        <JoinLayoutPicker
          players={participations.map((p) => ({
            playerId: p.playerId,
            name: p.player.name,
          }))}
          initialLayoutVariant={resolvedLayoutVariant}
          initialRotations={rotationMap}
          initialPlayerOrder={playerOrder}
          confirmLabel={t('tracker.saveLayout')}
          onCancel={() => setLayoutEditorVisible(false)}
          onConfirm={(result) => {
            // Persist for this device, then update local state so the
            // tracker re-renders with the new seat orientation. No remount
            // or navigation roundtrip required.
            void saveMatchLayout(id, result);
            setStoredLayout({
              rotations: result.rotations,
              playerOrder: result.playerOrder,
              layoutVariant: result.layoutVariant,
            });
            setLayoutEditorVisible(false);
          }}
        />
      </Modal>
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
