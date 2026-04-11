/**
 * useMatchResults — loads match + participations + result for SCR-010.
 *
 * Derives:
 *  - outcome: 'win' | 'draw' | 'abandoned'
 *  - winner participation (if outcome === 'win')
 *  - duration string from match.createdAt / endedAt
 *  - human-readable win condition label
 *
 * MATCH-007 (EPIC-02)
 */
import { useEffect, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Match, MatchResult } from '@/db/index';
import type { ParticipationDetail } from '@/services/matches';

// ─── Win condition display labels ────────────────────────────────────────────

const WIN_CONDITION_LABELS: Record<string, string> = {
  combat_damage:    'Combat Damage',
  commander_damage: 'Commander Damage',
  infect:           'Poison / Infect',
  combo:            'Combo',
  mill:             'Mill',
  scoop:            'Concede',
  concede:          'Concede',
  other:            'Other',
};

export function winConditionLabel(value: string): string {
  return WIN_CONDITION_LABELS[value] ?? value;
}

// ─── Duration helper ─────────────────────────────────────────────────────────

export function formatMatchDuration(createdAt: string | Date, endedAt: string | Date | null): string {
  if (!endedAt) return '–';
  const ms = new Date(endedAt).getTime() - new Date(createdAt).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type MatchOutcome = 'win' | 'draw' | 'abandoned';

export type MatchResultsData = {
  match: Match;
  participations: ParticipationDetail[];
  result: MatchResult | null;
  outcome: MatchOutcome;
  winner: ParticipationDetail | null;
  winConditionDisplay: string | null;
  duration: string;
};

export type UseMatchResultsReturn = {
  data: MatchResultsData | null;
  loading: boolean;
  error: string | null;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMatchResults(matchId: string): UseMatchResultsReturn {
  const { getToken } = useAuth();
  const [data, setData] = useState<MatchResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = await getToken();
        const res = await apiFetch<{
          success: true;
          data: { match: Match; participations: ParticipationDetail[]; result: MatchResult | null };
        }>(`/api/matches/${matchId}`, 'GET', undefined, token ?? undefined);

        if (cancelled) return;

        const { match, participations, result } = res.data;

        const outcome: MatchOutcome =
          match.status === 'abandoned'
            ? 'abandoned'
            : result?.isDraw
              ? 'draw'
              : 'win';

        const winner =
          outcome === 'win' && result?.winnerParticipationId
            ? (participations.find((p) => p.id === result.winnerParticipationId) ?? null)
            : null;

        const winConditionDisplay =
          result && !result.isDraw ? winConditionLabel(result.winCondition) : null;

        const duration = formatMatchDuration(match.createdAt, match.endedAt);

        setData({ match, participations, result, outcome, winner, winConditionDisplay, duration });
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load results.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [matchId, getToken]);

  return { data, loading, error };
}
