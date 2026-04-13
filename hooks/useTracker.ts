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
  /** Record a tracker state change. Called by child components after debounce. */
  recordEvent: (input: {
    participationId: string;
    eventType: EventType;
    delta: number;
    commanderIdSource?: string;
  }) => Promise<void>;
  /** Undo the last non-undone event. */
  undoLastEvent: () => Promise<void>;
};

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

  // ── Load match on mount ────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = await getToken();
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
  }, [matchId, getToken]);

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
  }) => {
    const { participationId, eventType, delta, commanderIdSource } = input;

    // Snapshot pre-update state for rollback
    const prev = participationsRef.current.map((p) => ({ ...p, commanderDamage: { ...p.commanderDamage } }));

    // Commit the delta to canonical state so the counter components
    // can reset their pendingDelta to 0 without visual flicker.
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
        },
        token ?? undefined,
      );

      // Append to local event log (don't re-update participations — already committed)
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
      // Revert optimistic update on failure
      setParticipations(prev);
      setToastError((e as Error).message ?? 'Failed to record event. Please try again.');
    }
  }, [matchId, getToken]);

  // ── undoLastEvent ──────────────────────────
  const undoLastEvent = useCallback(async () => {
    // Find the last non-undone local event
    const lastEvent = [...events].reverse().find((e) => !e.isUndone);
    if (!lastEvent) return;

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
  }, [events, matchId, getToken]);

  const clearToastError = useCallback(() => setToastError(null), []);

  return {
    match,
    participations,
    events,
    loading,
    error,
    toastError,
    clearToastError,
    recordEvent,
    undoLastEvent,
  };
}
