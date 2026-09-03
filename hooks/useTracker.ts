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
import { AppState } from 'react-native';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Match, MatchEvent, MatchResult } from '@/db/index';
import type { MatchSyncState, ParticipationDetail } from '@/services/matches';
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
  | 'id'
  | 'participationId'
  | 'eventType'
  | 'delta'
  | 'commanderIdSource'
  | 'isUndone'
  | 'createdAt'
  // Needed to rebuild per-player elapsed time when resuming a match on a
  // device that never saw the turns happen. Only ever set on turn_passed.
  | 'turnDurationSeconds'
>;

export type UseTrackerReturn = {
  match: Match | null;
  participations: TrackerParticipation[];
  events: LocalEvent[];
  /**
   * Latest live snapshot from the server, or null before the first poll lands.
   * Life/poison/commander damage are already merged into `participations`;
   * this carries the turn, death and undo state for the tracker to apply.
   */
  remoteSync: MatchSyncState | null;
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

/**
 * How often each open tracker asks the server for live state. Every device
 * with the match open polls, so this is a direct multiplier on Neon reads —
 * four phones on a 90-minute game is already ~5,400 requests. Fast enough that
 * a life change lands on the other phones within a beat, slow enough not to
 * hammer a serverless Postgres.
 */
const SYNC_POLL_MS = 4000;

function sameCommanderDamage(a: Record<string, number>, b: Record<string, number>): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

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
    /**
     * POSTs fired for this participation that haven't settled yet.
     *
     * `flushPending` zeroes the accumulators and nulls the timer BEFORE firing,
     * so between the debounce expiring and the response landing every other
     * "is there local work?" signal reads clean while the server still holds
     * the pre-tap value. A sync poll arriving in that window used to adopt the
     * stale snapshot and visibly bounce the counter back. Retries make the
     * window up to ~1.5s wide, so it is hit routinely during active play.
     */
    inFlight: number;
  };
  const pendingRef = useRef<Map<string, PendingCommit>>(new Map());

  /**
   * participationId → ms timestamp of this device's last local mutation
   * (tap scheduled, or commit settled). A server snapshot built before this
   * instant cannot contain our write, so adopting it would rewind the user's
   * own change. Compared against the snapshot's `syncedAt`, which is the same
   * mechanism the tracker already uses to reconcile in-flight deaths.
   */
  const lastLocalWriteAtRef = useRef<Map<string, number>>(new Map());

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
            events: MatchEvent[];
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
        // Seed the log with the match's full server-side history (ordered by
        // created_at). Previously this was dropped and `events` started empty,
        // which meant a resumed match had no undo history and the tracker had
        // no way to rebuild turn counts, elapsed time, or who was dead.
        setEvents(
          (res.data.events ?? []).map((e) => ({
            id: e.id,
            participationId: e.participationId,
            eventType: e.eventType,
            delta: e.delta,
            commanderIdSource: e.commanderIdSource,
            isUndone: e.isUndone,
            createdAt: e.createdAt,
            turnDurationSeconds: e.turnDurationSeconds,
          })),
        );
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
          turnDurationSeconds: res.data.turnDurationSeconds,
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
      p = { life: 0, poison: 0, cmdDamage: new Map(), timer: null, inFlight: 0 };
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
              turnDurationSeconds: res.data.turnDurationSeconds,
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

      // Hold the participation "busy" until the write settles, and re-stamp
      // the local-write clock on the way out: only once the server has
      // acknowledged (or we've exhausted retries) may a poll speak for it.
      const fire = (input: Parameters<typeof commitSingleEvent>[0]) => {
        p.inFlight += 1;
        void commitSingleEvent(input).finally(() => {
          p.inFlight = Math.max(0, p.inFlight - 1);
          lastLocalWriteAtRef.current.set(pid, Date.now());
        });
      };

      if (lifeDelta !== 0) {
        fire({ participationId: pid, eventType: 'life_change', delta: lifeDelta });
      }
      if (poisonDelta !== 0) {
        fire({ participationId: pid, eventType: 'poison_change', delta: poisonDelta });
      }
      for (const [cmdId, delta] of cmdEntries) {
        fire({
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
      lastLocalWriteAtRef.current.set(pid, Date.now());
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

    // Undo writes straight through apiFetch rather than the debounced flush,
    // so it has to stamp the local-write clock itself — otherwise a poll built
    // before the undo landed would re-adopt the pre-undo counters and bounce
    // the value back, exactly as un-flushed taps used to.
    lastLocalWriteAtRef.current.set(lastEvent.participationId, Date.now());
    try {
      const token = await getToken();
      await apiFetch(
        `/api/match-events/undo?match_id=${matchId}`,
        'POST',
        undefined,
        token ?? undefined,
      );
      lastLocalWriteAtRef.current.set(lastEvent.participationId, Date.now());
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

  // ── Live sync ──────────────────────────────
  // Every device with this match open polls a compact server-derived snapshot
  // and converges on it. See services/matches.ts `getMatchSyncState`.
  const [remoteSync, setRemoteSync] = useState<MatchSyncState | null>(null);

  /**
   * Adopt the server's counter snapshot.
   *
   * A participation with un-flushed local taps is skipped entirely. The whole
   * optimistic design here rests on "what the user sees is authoritative"
   * (see commitSingleEvent) — overwriting mid-tap would resurrect exactly the
   * HP snapback this hook was rewritten to eliminate, except now triggered by
   * a timer instead of a network reply. The debounce flushes in 600ms and the
   * next poll picks the server value up.
   */
  const applyRemoteParticipations = useCallback((
    remote: MatchSyncState['participations'],
    syncedAtMs: number,
  ) => {
    const byId = new Map(remote.map((r) => [r.id, r]));
    setParticipations((parts) => {
      let changed = false;
      const next = parts.map((p) => {
        const pend = pendingRef.current.get(p.id);
        // Phase 1 — taps still accumulating, or the debounce is armed.
        if (pend && (pend.life !== 0 || pend.poison !== 0 || pend.cmdDamage.size > 0 || pend.timer)) {
          return p;
        }
        // Phase 2 — flushed, but the POST hasn't come back yet. The old guard
        // stopped here, which is precisely where the bounce came from.
        if (pend && pend.inFlight > 0) {
          return p;
        }
        // Phase 3 — settled, but this snapshot was built before we wrote, so
        // it cannot contain our change even though nothing is in flight now.
        const localAt = lastLocalWriteAtRef.current.get(p.id) ?? 0;
        if (localAt > syncedAtMs) {
          return p;
        }
        const r = byId.get(p.id);
        if (!r) return p;
        const rCmd = (r.commanderDamage as Record<string, number>) ?? {};
        if (
          p.lifeTotal === r.lifeTotal &&
          p.poisonCounters === r.poisonCounters &&
          sameCommanderDamage(p.commanderDamage, rCmd)
        ) {
          return p;
        }
        changed = true;
        return { ...p, lifeTotal: r.lifeTotal, poisonCounters: r.poisonCounters, commanderDamage: rCmd };
      });
      // Keep array identity when nothing moved, so a quiet poll doesn't
      // re-render every player frame twice a second.
      return changed ? next : parts;
    });
  }, []);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(poll, SYNC_POLL_MS);
    };

    async function poll() {
      if (cancelled) return;
      // Nobody is looking at a backgrounded app, and iOS throttles the timer
      // anyway — skip the query and pick up on the next foreground tick.
      if (AppState.currentState !== 'active') {
        schedule();
        return;
      }
      try {
        const token = await getTokenRef.current();
        const res = await apiFetch<{ success: true; data: MatchSyncState }>(
          `/api/matches/${matchId}/sync`,
          'GET',
          undefined,
          token ?? undefined,
        );
        if (cancelled) return;
        applyRemoteParticipations(res.data.participations, new Date(res.data.syncedAt).getTime());
        setRemoteSync(res.data);
        // Another device closed the match — mirror the status so the tracker's
        // existing redirect effect moves this screen to the results screen.
        if (res.data.status !== 'in_progress') {
          setMatch((m) => (m && m.status !== res.data.status ? { ...m, status: res.data.status } : m));
        }
      } catch {
        // Best-effort. A dropped poll just means this device is briefly stale;
        // the user did nothing wrong, so it must not raise a toast.
      }
      schedule();
    }

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [matchId, applyRemoteParticipations]);

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
        turnDurationSeconds: null,
      },
    ]);
  }, []);

  return {
    match,
    participations,
    events,
    remoteSync,
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
