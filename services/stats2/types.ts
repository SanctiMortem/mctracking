/**
 * Stats v2 — plain data shapes shared by every calculation in this folder.
 *
 * Everything in services/stats2 except `load.ts` is pure: it takes these
 * shapes and returns numbers, with no database, no network and no clock.
 * That is what lets the same code run in an API route, in a unit test and in
 * the comparison script (scripts/stats-compare).
 *
 * Design: docs/STATS_REDESIGN_SPEC.md ("Decisions after review" wins over the
 * numbered sections where they disagree).
 */

export type Color = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

/** Display and sort order: WUBRG, then colourless. */
export const COLOR_ORDER: readonly Color[] = ['W', 'U', 'B', 'R', 'G', 'C'];

export type EventKind = 'life_change' | 'poison_change' | 'commander_damage' | 'player_died' | 'turn_passed';

export interface EventInput {
  participationId: string;
  type: EventKind;
  delta: number;
  at: Date;
}

export interface ParticipationInput {
  id: string;
  playerId: string;
  deckId: string;
  /** One id, or two for a partner deck. */
  commanderIds: string[];
  /** Deck colour identity (union of its commanders). `['C']` for a colourless deck. */
  colors: Color[];
  result: 'win' | 'lose' | 'draw' | null;
  /** Final snapshots, as left when the match was closed. */
  lifeTotal: number;
  poisonCounters: number;
  commanderDamage: Record<string, number>;
}

/** One COMPLETED match. Abandoned and in-progress matches never reach here. */
export interface MatchInput {
  id: string;
  groupId: string | null;
  createdBy: string;
  createdAt: Date;
  endedAt: Date | null;
  isDraw: boolean;
  winnerParticipationId: string | null;
  participations: ParticipationInput[];
  /** Non-undone events only. Order is not assumed. */
  events: EventInput[];
}

/** How many of the matches a stat could have used, it did use. */
export interface Coverage {
  used: number;
  total: number;
}

/** A stat that may not have enough data: `value` is null instead of a guess. */
export interface Covered<T> {
  value: T | null;
  coverage: Coverage;
}

/** A value needs at least this many usable matches before it is shown. */
export const MIN_MATCHES_FOR_VALUE = 5;

// ─── Match outcome ───────────────────────────────────────────────────────────

export type MatchOutcome =
  | { kind: 'win'; winnerId: string }
  | { kind: 'draw' }
  /** Completed match with no usable result row. Every stat skips it. */
  | { kind: 'none' };

/**
 * Who won. Reads the result row first and falls back to the participations'
 * own `result`, so a match with a missing or dangling result row still counts
 * when the participations agree.
 */
export function matchOutcome(match: MatchInput): MatchOutcome {
  if (match.isDraw) return { kind: 'draw' };
  const ids = new Set(match.participations.map((p) => p.id));
  if (match.winnerParticipationId && ids.has(match.winnerParticipationId)) {
    return { kind: 'win', winnerId: match.winnerParticipationId };
  }
  const winners = match.participations.filter((p) => p.result === 'win');
  if (winners.length === 1) return { kind: 'win', winnerId: winners[0].id };
  if (match.participations.length > 0 && match.participations.every((p) => p.result === 'draw')) {
    return { kind: 'draw' };
  }
  return { kind: 'none' };
}

/** When the match was played, for "most recent" tie-breaks. */
export function playedAt(match: MatchInput): Date {
  return match.endedAt ?? match.createdAt;
}

// ─── Percentages ─────────────────────────────────────────────────────────────

/** wins ÷ total × 100 to one decimal; null (shown as "—") when total is 0. */
export function pct(wins: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((wins / total) * 1000) / 10;
}
