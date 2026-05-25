/**
 * useTracker — core state manager for SCR-008 Match Tracker.
 *
 * Loads the match on mount (GET /api/matches/:id).
 * Maintains an optimistic participation snapshot (life_total, poison_counters,
 * commander_damage) and a local event log for the current session.
 *
 * Components (LifeCounter, PoisonCounter, CommanderDamagePanel) call
 * `recordEvent` after their debounce expires. useTracker applies the
 * optimistic update and POSTs to the API.
 *
 * TRACK-003 (EPIC-03)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Match, MatchEvent, MatchResult } from '@/db/index';
import type { ParticipationDetail } from '@/services/matches';
import type { EventType } from '@/services/matchEvents';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** Live participation state (optimistic snapshot merged with API data). */
export type TrackerParticipation = ParticipationDetail & {
  lifeTotal: number;
  poisonCounters: number;
  commanderDamage: Record<string, number>;
};

/** Lightweight local event log entry (mirrors MatchEvent shape). */
export type LocalEvent = Pick<
  MatchEvent,
  'id' | 'participationId' | 'eventType' | 'delta' | 'commanderIdSource' | 'isUndone' | 'createdAt'
>;

export type UseTrackerReturn = {
  match: Match | null;
  participations: TrackerParticipation[];
  events: LocalEvent[];
  loading: boolean;
  error: string | null;
  toastError: string | null;
  clearToastError: () => void;
  /**
   * Record a one-shot event that fires immediately with no debounce/batching
   * (e.g. player_died). For incremental +/− counters, prefer the
   * `applyLifeChange` / `applyPoisonChange` / `applyCommanderDamage` APIs
   * which update state synchronously on every tap and batch the server commit.
   */
  recordEvent: (input: {
    participationId: string;
    eventType: EventType;
    delta: number;
    commanderIdSource?: string;
  }) => Promise<void>;
  /**
   * Apply a life delta to a participation. Immediately updates local state
   * (no visual lag) and debounces a batched POST /api/match-events for the
   * accumulated delta since the last commit.
   */
  applyLifeChange: (participationId: string, delta: number) => void;
  /** Apply a poison counter delta (same batching semantics as applyLifeChange). */
  applyPoisonChange: (participationId: string, delta: number) => void;
  /**
   * Apply commander damage from `commanderIdSource` to a participation.
   * Immediately subtracts from life total AND increments the per-commander
   * damage map (atomic visual update). Server commit is debounced.
   */
  applyCommanderDamage: (
    participationId: string,
    commanderIdSource: string,
    delta: number,
  ) => void;
  /** Undo the last non-undone event. */
  undoLastEvent: () => Promise<void>;
};

const COMMIT_DEBOUNCE_MS = 600;

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useTracker(matchId: string): UseTrackerReturn {
  const { getToken } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [participations, setParticipations] = useState<TrackerParticipation[]>([]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  // Keep a ref to participations for use inside async callbacks without stale closure
  const participationsRef = useRef<TrackerParticipation[]>([]);
  participationsRef.current = participations;

  // ── Per-participation accumulators for debounced server commits ──
  // Structure: participationId → { life, poison, cmdDamage: Map<srcId, delta>, timer }
  // These refs track deltas that have been applied to local state but not yet
  // persisted. A single debounce timer per participation flushes the whole
  // bundle in one burst, keeping server load identical to the old design while
  // letting the UI update synchronously on every tap.
  type PendingCommit = {
    life: number;
    poison: number;
    cmdDamage: Map<string, number>;
    timer: ReturnType<typeof setTimeout> | null;
  };
  const pendingRef = useRef<Map<string, PendingCommit>>(new Map());

  // ── Load match on mount ────────────────────
  // CRITICAL: `getToken` from Clerk is an unstable reference — it re-creates
  // on every render. If we depend on it here, this effect re-runs after every
  // setParticipations, refetching from the server and overwriting optimistic
  // state with stale values the instant the user stops tapping. That's the
  // HP "snapback". Ref-hold getToken so the load only runs when matchId
  // changes. See the matching guard on line ~430 for the flush cleanup.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = await getTokenRef.current();
        const res = await apiFetch<{
          success: true;
          data: {
            match: Match;
            participations: ParticipationDetail[];
            result: MatchResult | null;
          };
        }>(`/api/matches/${matchId}`, 'GET', undefined, token ?? undefined);

        if (cancelled) return;

        // Cast commanderDamage to typed Record
        const trackerParticipations: TrackerParticipation[] = res.data.participations.map((p) => ({
          ...p,
          lifeTotal: p.lifeTotal,
          poisonCounters: p.poisonCounters,
          commanderDamage: (p.commanderDamage as Record<string, number>) ?? {},
        }));

        setMatch(res.data.match);
        setParticipations(trackerParticipations);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load match.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [matchId]);

  // ── recordEvent ────────────────────────────
  // Called by counter components AFTER their local debounce fires.
  // The counter already shows the change via pendingDelta, so we commit
  // the delta to the canonical lifeTotal/poisonCounters/commanderDamage
  // (which the counter reads) and POST to the API. On failure we revert.
  const recordEvent = useCallback(async (input: {
    participationId: string;
    eventType: EventType;
    delta: number;
    commanderIdSource?: string;
    /** Only meaningful on eventType = 'turn_passed'. Seconds the outgoing player spent on the turn. */
    turnDurationSeconds?: number;
  }) => {
    const { participationId, eventType, delta, commanderIdSource, turnDurationSeconds } = input;

    // Optimistic update — mirrors applyLifeChange/applyPoisonChange/applyCommanderDamage.
    // We do NOT revert on failure (see commitSingleEvent doc): what the user sees
    // is authoritative; server errors surface as a toast only.
    setParticipations((parts) =>
      parts.map((p) => {
        if (p.id !== participationId) return p;
        if (eventType === 'life_change') {
          return { ...p, lifeTotal: p.lifeTotal + delta };
        }
        if (eventType === 'poison_change') {
          return { ...p, poisonCounters: Math.max(0, p.poisonCounters + delta) };
        }
        if (eventType === 'commander_damage' && commanderIdSource) {
          const current = p.commanderDamage[commanderIdSource] ?? 0;
          return {
            ...p,
            lifeTotal: p.lifeTotal - delta,
            commanderDamage: { ...p.commanderDamage, [commanderIdSource]: current + delta },
          };
        }
        return p;
      }),
    );

    try {
      const token = await getToken();
      const res = await apiFetch<{ success: true; data: MatchEvent }>(
        '/api/match-events',
        'POST',
        {
          match_id: matchId,
          participation_id: participationId,
          event_type: eventType,
          delta,
          commander_id_source: commanderIdSource,
          // Server ignores this on non-turn_passed events; we only forward
          // when it's present so the payload stays minimal in the common case.
          ...(typeof turnDurationSeconds === 'number'
            ? { turn_duration_seconds: turnDurationSeconds }
            : {}),
        },
        token ?? undefined,
      );

      setEvents((prev) => [
        ...prev,
        {
          id: res.data.id,
          participationId: res.data.participationId,
          eventType: res.data.eventType,
          delta: res.data.delta,
          commanderIdSource: res.data.commanderIdSource,
          isUndone: false,
          createdAt: res.data.createdAt,
        },
      ]);
    } catch (e) {
      setToastError((e as Error).message ?? 'Could not sync last change.');
    }
  }, [matchId, getToken]);

  // ── Batched per-tap apply + debounced commit ──────────────────────────
  // The counter components (LifeCounter, PoisonCounter, CommanderDamageRow)
  // call these on EVERY tap. State updates synchronously so the displayed
  // number has no coordination with any second value — eliminating the
  // parent/child state race that caused mid-tap HP bounces. Server commits
  // are debounced per participation and fire independent POSTs for life,
  // poison, and each commander-damage source, each representing the full
  // accumulated delta since the last commit.

  const getPending = useCallback((pid: string): PendingCommit => {
    let p = pendingRef.current.get(pid);
    if (!p) {
      p = { life: 0, poison: 0, cmdDamage: new Map(), timer: null };
      pendingRef.current.set(pid, p);
    }
    return p;
  }, []);

  // Post a single event and append to log on success.
  //
  // UX invariant: the HP/poison/commander-damage value the user sees is
  // authoritative. Server commits retry in the background but NEVER revert
  // what's on screen — a late network failure changing the displayed number
  // under the user's finger is the "snapback" we're eliminating. On failure
  // we surface a toast and keep the optimistic state; the user can Undo if
  // they want to rollback.
  const commitSingleEvent = useCallback(
    async (input: {
      participationId: string;
      eventType: EventType;
      delta: number;
      commanderIdSource?: string;
    }) => {
      const MAX_ATTEMPTS = 3;
      const BACKOFF_MS = [0, 400, 1000];
      let lastError: unknown = null;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (BACKOFF_MS[attempt] > 0) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
        }
        try {
          const token = await getToken();
          const res = await apiFetch<{ success: true; data: MatchEvent }>(
            '/api/match-events',
            'POST',
            {
              match_id: matchId,
              participation_id: input.participationId,
              event_type: input.eventType,
              delta: input.delta,
              commander_id_source: input.commanderIdSource,
            },
            token ?? undefined,
          );
          setEvents((prev) => [
            ...prev,
            {
              id: res.data.id,
              participationId: res.data.participationId,
              eventType: res.data.eventType,
              delta: res.data.delta,
              commanderIdSource: res.data.commanderIdSource,
              isUndone: false,
              createdAt: res.data.createdAt,
            },
          ]);
          return;
        } catch (e) {
          lastError = e;
        }
      }

      setToastError(
        (lastError as Error)?.message ?? 'Could not sync last change. Your taps are preserved — try again if this persists.',
      );
    },
    [matchId, getToken],
  );

  // Flush the accumulated deltas for one participation to the server.
  const flushPending = useCallback(
    (pid: string) => {
      const p = pendingRef.current.get(pid);
      if (!p) return;
      if (p.timer) {
        clearTimeout(p.timer);
        p.timer = null;
      }
      const lifeDelta = p.life;
      const poisonDelta = p.poison;
      const cmdEntries = Array.from(p.cmdDamage.entries()).filter(
        ([, v]) => v !== 0,
      );
      // Clear accumulators BEFORE firing so concurrent taps accumulate into a
      // fresh bucket for the next commit window.
      p.life = 0;
      p.poison = 0;
      p.cmdDamage.clear();

      if (lifeDelta !== 0) {
        void commitSingleEvent({
          participationId: pid,
          eventType: 'life_change',
          delta: lifeDelta,
        });
      }
      if (poisonDelta !== 0) {
        void commitSingleEvent({
          participationId: pid,
          eventType: 'poison_change',
          delta: poisonDelta,
        });
      }
      for (const [cmdId, delta] of cmdEntries) {
        void commitSingleEvent({
          participationId: pid,
          eventType: 'commander_damage',
          delta,
          commanderIdSource: cmdId,
        });
      }
    },
    [commitSingleEvent],
  );

  const scheduleCommit = useCallback(
    (pid: string) => {
      const p = getPending(pid);
      if (p.timer) clearTimeout(p.timer);
      p.timer = setTimeout(() => flushPending(pid), COMMIT_DEBOUNCE_MS);
    },
    [getPending, flushPending],
  );

  const applyLifeChange = useCallback(
    (pid: string, delta: number) => {
      if (delta === 0) return;
      setParticipations((parts) =>
        parts.map((p) =>
          p.id === pid ? { ...p, lifeTotal: p.lifeTotal + delta } : p,
        ),
      );
      const pend = getPending(pid);
      pend.life += delta;
      scheduleCommit(pid);
    },
    [getPending, scheduleCommit],
  );

  const applyPoisonChange = useCallback(
    (pid: string, delta: number) => {
      if (delta === 0) return;
      // Track the actual delta applied (may be clamped by floor) so the
      // server commit matches what the user saw.
      let appliedDelta = delta;
      setParticipations((parts) =>
        parts.map((p) => {
          if (p.id !== pid) return p;
          const next = Math.max(0, p.poisonCounters + delta);
          appliedDelta = next - p.poisonCounters;
          return { ...p, poisonCounters: next };
        }),
      );
      // Defer the accumulator update until after the state updater has run,
      // so `appliedDelta` reflects the clamped value.
      queueMicrotask(() => {
        if (appliedDelta === 0) return;
        const pend = getPending(pid);
        pend.poison += appliedDelta;
        scheduleCommit(pid);
      });
    },
    [getPending, scheduleCommit],
  );

  const applyCommanderDamage = useCallback(
    (pid: string, commanderIdSource: string, delta: number) => {
      if (delta === 0) return;
      setParticipations((parts) =>
        parts.map((p) => {
          if (p.id !== pid) return p;
          const current = p.commanderDamage[commanderIdSource] ?? 0;
          return {
            ...p,
            lifeTotal: p.lifeTotal - delta,
            commanderDamage: {
              ...p.commanderDamage,
              [commanderIdSource]: Math.max(0, current + delta),
            },
          };
        }),
      );
      const pend = getPending(pid);
      pend.cmdDamage.set(
        commanderIdSource,
        (pend.cmdDamage.get(commanderIdSource) ?? 0) + delta,
      );
      scheduleCommit(pid);
    },
    [getPending, scheduleCommit],
  );

  // Flush any pending commits on unmount so a navigation-away doesn't drop
  // the last burst of taps.
  //
  // CRITICAL: we ref-hold `flushPending` so this effect runs once per mount.
  // If we put `flushPending` in the deps array, Clerk's unstable `getToken`
  // reference would make `commitSingleEvent` → `flushPending` re-create on
  // every render, triggering this cleanup on every setParticipations call —
  // which would flush the debounce on every single tap.
  const flushPendingRef = useRef(flushPending);
  flushPendingRef.current = flushPending;
  useEffect(() => {
    const map = pendingRef.current;
    return () => {
      for (const pid of map.keys()) flushPendingRef.current(pid);
    };
  }, []);

  // ── undoLastEvent ──────────────────────────
  // Returns the undone event so callers can react (e.g. undo death).
  const undoLastEvent = useCallback(async (): Promise<LocalEvent | null> => {
    // Find the last non-undone local event
    const lastEvent = [...events].reverse().find((e) => !e.isUndone);
    if (!lastEvent) return null;

    const isLocalOnly = lastEvent.id.startsWith('local-');

    // For local-only events (player_died), just mark undone — no API call needed
    if (isLocalOnly) {
      setEvents((evts) =>
        evts.map((e) => (e.id === lastEvent.id ? { ...e, isUndone: true } : e)),
      );
      return lastEvent;
    }

    // Snapshot for rollback
    const prev = participationsRef.current.map((p) => ({ ...p, commanderDamage: { ...p.commanderDamage } }));

    // Optimistic revert
    setParticipations((parts) =>
      parts.map((p) => {
        if (p.id !== lastEvent.participationId) return p;
        if (lastEvent.eventType === 'life_change') {
          return { ...p, lifeTotal: p.lifeTotal - lastEvent.delta };
        }
        if (lastEvent.eventType === 'poison_change') {
          return { ...p, poisonCounters: Math.max(0, p.poisonCounters - lastEvent.delta) };
        }
        if (lastEvent.eventType === 'commander_damage' && lastEvent.commanderIdSource) {
          const current = p.commanderDamage[lastEvent.commanderIdSource] ?? 0;
          return {
            ...p,
            lifeTotal: p.lifeTotal + lastEvent.delta, // restore HP that was lost
            commanderDamage: {
              ...p.commanderDamage,
              [lastEvent.commanderIdSource]: Math.max(0, current - lastEvent.delta),
            },
          };
        }
        return p;
      }),
    );

    // Mark undone in local log
    setEvents((evts) =>
      evts.map((e) => (e.id === lastEvent.id ? { ...e, isUndone: true } : e)),
    );

    try {
      const token = await getToken();
      await apiFetch(
        `/api/match-events/undo?match_id=${matchId}`,
        'POST',
        undefined,
        token ?? undefined,
      );
    } catch (e) {
      // Revert on failure
      setParticipations(prev);
      setEvents((evts) =>
        evts.map((ev) => (ev.id === lastEvent.id ? { ...ev, isUndone: false } : ev)),
      );
      setToastError((e as Error).message ?? 'Undo failed. Please try again.');
    }

    return lastEvent;
  }, [events, matchId, getToken]);

  const clearToastError = useCallback(() => setToastError(null), []);

  /** Inject a local-only event into the log (not sent to API). */
  const addLocalEvent = useCallback((input: {
    participationId: string;
    eventType: string;
    delta?: number;
  }) => {
    setEvents((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        participationId: input.participationId,
        eventType: input.eventType as EventType,
        delta: input.delta ?? 0,
        commanderIdSource: undefined,
        isUndone: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  return {
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
  };
}
