/**
 * useMatchDetail — loads full match detail for SCR-011 (Match Detail FULL).
 *
 * Fetches GET /matches/:id, which now returns match + participations +
 * result + events (HIST-003). Derives outcome, winner, duration and
 * formats events for the read-only EventLog.
 *
 * HIST-003 (EPIC-04)
 */
import { useEffect, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { MatchEvent, Match, MatchResult } from '@/db/index';
import type { ParticipationDetail } from '@/services/matches';
import type { FormattedEvent } from '@/hooks/useEventLog';
import type { MatchOutcome } from '@/hooks/useMatchResults';
import { formatMatchDuration, winConditionLabel } from '@/hooks/useMatchResults';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatchDetailData = {
  match: Match;
  participations: ParticipationDetail[];
  result: MatchResult | null;
  events: MatchEvent[];
  formattedEvents: FormattedEvent[];
  outcome: MatchOutcome;
  winner: ParticipationDetail | null;
  winConditionDisplay: string | null;
  duration: string;
  /** participationId → number of turn_passed events recorded for that player. */
  turnCounts: Record<string, number>;
  /**
   * Per-player turn-time aggregates derived from non-undone turn_passed events
   * that carry a `turn_duration_seconds` value. Pre-feature matches and pre-
   * feature events have nulls everywhere, so a player with no timed turns
   * appears as a missing key (caller hides the row).
   */
  turnTimes: Record<string, { totalSeconds: number; turns: number; longestSeconds: number }>;
};

export type UseMatchDetailReturn = {
  data: MatchDetailData | null;
  loading: boolean;
  error: string | null;
};

type ApiResponse = {
  success: true;
  data: {
    match: Match;
    participations: ParticipationDetail[];
    result: MatchResult | null;
    events: MatchEvent[];
  };
};

// ─── Event formatter (read-only — no tracker participations context needed) ───

function formatEventReadOnly(
  event: MatchEvent,
  participations: ParticipationDetail[],
): string {
  const part = participations.find((p) => p.id === event.participationId);
  const playerName = part?.player.name ?? 'Unknown';

  if (event.eventType === 'player_died') {
    return `☠ ${playerName} has died`;
  }

  if (event.eventType === 'turn_passed') {
    return `↻ ${playerName} starts their turn`;
  }

  if (event.eventType === 'life_change') {
    const sign = event.delta > 0 ? '+' : '';
    return `${playerName}: ${sign}${event.delta} life`;
  }

  if (event.eventType === 'poison_change') {
    const sign = event.delta > 0 ? '+' : '';
    return `${playerName}: ${sign}${event.delta} poison`;
  }

  if (event.eventType === 'commander_damage' && event.commanderIdSource) {
    const allCommanders = participations.flatMap((p) => {
      const cs = [p.commander];
      if (p.commander2) cs.push(p.commander2);
      return cs;
    });
    const source = allCommanders.find((c) => c.id === event.commanderIdSource);
    return `${playerName}: +${event.delta} cmd dmg from ${source?.name ?? 'Commander'}`;
  }

  return `${playerName}: event`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMatchDetail(matchId: string): UseMatchDetailReturn {
  const { getToken } = useAuth();
  const [data, setData] = useState<MatchDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = await getToken();
        const res = await apiFetch<ApiResponse>(
          `/api/matches/${matchId}`,
          'GET',
          undefined,
          token ?? undefined,
        );

        if (cancelled) return;

        const { match, participations, result, events } = res.data;

        const outcome: MatchOutcome =
          match.status === 'abandoned' ? 'abandoned'
          : result?.isDraw ? 'draw'
          : 'win';

        const winner =
          outcome === 'win' && result?.winnerParticipationId
            ? (participations.find((p) => p.id === result.winnerParticipationId) ?? null)
            : null;

        const winConditionDisplay =
          result && !result.isDraw ? winConditionLabel(result.winCondition) : null;

        // Last activity timestamp — max createdAt across non-undone events.
        // Passed to formatMatchDuration so an abandoned-then-belatedly-closed
        // match doesn't report the belated close time as end-of-play.
        let lastEventAt: Date | null = null;
        for (const e of events) {
          if (e.isUndone) continue;
          const t = new Date(e.createdAt);
          if (!lastEventAt || t > lastEventAt) lastEventAt = t;
        }
        const duration = formatMatchDuration(match.createdAt, match.endedAt, lastEventAt);

        // Format events newest-first for display (DB returns asc, we reverse)
        const formattedEvents: FormattedEvent[] = [...events]
          .reverse()
          .map((e) => ({
            id: e.id,
            description: formatEventReadOnly(e, participations),
            isUndone: e.isUndone,
            createdAt: new Date(e.createdAt),
          }));

        // Per-player turn counts derived from non-undone turn_passed events.
        const turnCounts: Record<string, number> = {};
        for (const e of events) {
          if (e.eventType === 'turn_passed' && !e.isUndone) {
            turnCounts[e.participationId] = (turnCounts[e.participationId] ?? 0) + 1;
          }
        }

        // Per-player turn-time aggregates. The duration on a turn_passed
        // event belongs to the OUTGOING player — i.e. the participation_id
        // of the *previous* non-undone turn_passed event in this match.
        // First turn of the match has no prior actor → no duration recorded.
        const turnTimes: MatchDetailData['turnTimes'] = {};
        let prevTurnPassed: MatchEvent | null = null;
        for (const e of events) {
          if (e.eventType !== 'turn_passed' || e.isUndone) continue;
          if (prevTurnPassed && typeof e.turnDurationSeconds === 'number') {
            const owner = prevTurnPassed.participationId;
            const dur = e.turnDurationSeconds;
            const entry = turnTimes[owner] ?? { totalSeconds: 0, turns: 0, longestSeconds: 0 };
            entry.totalSeconds += dur;
            entry.turns += 1;
            if (dur > entry.longestSeconds) entry.longestSeconds = dur;
            turnTimes[owner] = entry;
          }
          prevTurnPassed = e;
        }

        setData({ match, participations, result, events, formattedEvents, outcome, winner, winConditionDisplay, duration, turnCounts, turnTimes });
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load match detail.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [matchId, getToken]);

  return { data, loading, error };
}
