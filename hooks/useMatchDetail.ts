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

        const duration = formatMatchDuration(match.createdAt, match.endedAt);

        // Format events newest-first for display (DB returns asc, we reverse)
        const formattedEvents: FormattedEvent[] = [...events]
          .reverse()
          .map((e) => ({
            id: e.id,
            description: formatEventReadOnly(e, participations),
            isUndone: e.isUndone,
            createdAt: new Date(e.createdAt),
          }));

        setData({ match, participations, result, events, formattedEvents, outcome, winner, winConditionDisplay, duration });
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
