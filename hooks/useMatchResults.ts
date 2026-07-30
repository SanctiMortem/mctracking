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
import type { Match, MatchEvent, MatchResult } from '@/db/index';
import type { ParticipationDetail } from '@/services/matches';
import { effectiveDurationSeconds } from '@/services/matchDuration';

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

/**
 * Pretty-print a match duration. When `lastEventAt` is provided and the
 * trailing gap between it and `endedAt` exceeds the abandonment threshold,
 * duration is truncated to end at `lastEventAt` — so a match that was
 * closed 22h after the last real play doesn't render as "~24h". See
 * services/matchDuration.ts for the heuristic.
 */
export function formatMatchDuration(
  createdAt: string | Date,
  endedAt: string | Date | null,
  lastEventAt?: string | Date | null,
): string {
  const seconds = effectiveDurationSeconds(createdAt, endedAt, lastEventAt ?? null);
  if (seconds === null) return '–';
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type MatchOutcome = 'win' | 'draw' | 'abandoned';

export type TurnTimeStats = {
  totalSeconds: number;
  turns: number;
  longestSeconds: number;
};

export type MatchResultsData = {
  match: Match;
  participations: ParticipationDetail[];
  result: MatchResult | null;
  outcome: MatchOutcome;
  winner: ParticipationDetail | null;
  winConditionDisplay: string | null;
  duration: string;
  /** participationId → turn-time aggregates from this match. Missing key = no timed turns. */
  turnTimes: Record<string, TurnTimeStats>;
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
          data: {
            match: Match;
            participations: ParticipationDetail[];
            result: MatchResult | null;
            events: MatchEvent[];
          };
        }>(`/api/matches/${matchId}`, 'GET', undefined, token ?? undefined);

        if (cancelled) return;

        const { match, participations, result, events } = res.data;

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

        // Last activity timestamp — max createdAt across non-undone events.
        // Fed to formatMatchDuration so a match closed hours after real play
        // ended (abandoned + belated close) reports the "true" duration.
        let lastEventAt: Date | null = null;
        for (const e of events) {
          if (e.isUndone) continue;
          const t = new Date(e.createdAt);
          if (!lastEventAt || t > lastEventAt) lastEventAt = t;
        }
        const duration = formatMatchDuration(match.createdAt, match.endedAt, lastEventAt);

        // Per-player turn-time aggregates. Duration on a turn_passed event
        // belongs to the OUTGOING player — i.e. the participation_id of the
        // previous non-undone turn_passed event in this match. Pre-feature
        // events carry null durations and are silently skipped.
        const turnTimes: Record<string, TurnTimeStats> = {};
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

        setData({ match, participations, result, outcome, winner, winConditionDisplay, duration, turnTimes });
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
