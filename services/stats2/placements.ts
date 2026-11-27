/**
 * Placement — who finished where in a match, worked out at read time from
 * data the app already records. Nothing is stored (spec decision 3).
 *
 *   1  the winner
 *   2  every loser with no evidence of having died (tied)
 *   …  losers who died, the last to die first
 *
 * Evidence of death, in order of trust:
 *   • the Dead button — a non-undone `player_died` event; its time is the
 *     time of death;
 *   • no tap, but clearly dead when the match closed — life at 0 or less,
 *     10 or more poison, or 21 or more damage from one commander. The time
 *     of death is that player's last life / poison / commander-damage event;
 *     with no such event the time is unknown and the player is placed last,
 *     tied with any other unknown.
 *
 * Placement is DESCRIPTIVE. Matchups, head-to-head, colours and rankings do
 * not use it (spec decision 2): a player who died without tapping Dead is
 * indistinguishable from one who survived to the end, and `unresolvedLosers`
 * says how often that doubt applies.
 *
 * Never throws: missing snapshots or events only mean less evidence.
 */
import { type Covered, type MatchInput, type ParticipationInput, MIN_MATCHES_FOR_VALUE, matchOutcome } from './types';

export type PlacementSource =
  /** Some evidence of death was used (or the match was a draw). */
  | 'derived'
  /** Only the winner is known: winner 1st, everyone else tied 2nd. */
  | 'winner_only';

export interface PlacementResult {
  /** participationId → placement, 1 = best. Empty when the match has no usable result. */
  placements: Map<string, number>;
  source: PlacementSource;
  /**
   * Losers with no evidence of death. 0 or 1 means the order of elimination
   * is fully known (the one without evidence was the last opponent standing).
   * 2 or more means those losers are only ASSUMED to have outlived the ones
   * with evidence.
   */
  unresolvedLosers: number;
}

const POISON_LETHAL = 10;
const COMMANDER_DAMAGE_LETHAL = 21;

export interface Death {
  /** Milliseconds; null = dead, time unknown. */
  at: number | null;
  /** 'tap' = the Dead button; 'snapshot' = lethal totals when the match closed. */
  via: 'tap' | 'snapshot';
}

/**
 * The evidence that this participation died, or null if there is none.
 * Says nothing about the winner — callers only ask about losers.
 */
export function deathOf(p: ParticipationInput, match: MatchInput): Death | null {
  let tapAt: number | null = null;
  let lastCounterAt: number | null = null;
  for (const e of match.events) {
    if (e.participationId !== p.id) continue;
    const t = e.at.getTime();
    if (Number.isNaN(t)) continue;
    if (e.type === 'player_died') {
      if (tapAt === null || t > tapAt) tapAt = t;
    } else if (e.type !== 'turn_passed') {
      if (lastCounterAt === null || t > lastCounterAt) lastCounterAt = t;
    }
  }
  if (tapAt !== null) return { at: tapAt, via: 'tap' };

  const maxCommanderDamage = Object.values(p.commanderDamage ?? {}).reduce(
    (max, v) => (typeof v === 'number' && v > max ? v : max),
    0,
  );
  const clearlyDead =
    p.lifeTotal <= 0 || p.poisonCounters >= POISON_LETHAL || maxCommanderDamage >= COMMANDER_DAMAGE_LETHAL;
  return clearlyDead ? { at: lastCounterAt, via: 'snapshot' } : null;
}

export function derivePlacements(match: MatchInput): PlacementResult {
  const placements = new Map<string, number>();
  const outcome = matchOutcome(match);

  if (outcome.kind === 'none') {
    return { placements, source: 'winner_only', unresolvedLosers: 0 };
  }
  if (outcome.kind === 'draw') {
    for (const p of match.participations) placements.set(p.id, 1);
    return { placements, source: 'derived', unresolvedLosers: 0 };
  }

  const losers = match.participations.filter((p) => p.id !== outcome.winnerId);
  const alive: ParticipationInput[] = [];
  const timed: { p: ParticipationInput; at: number }[] = [];
  const untimed: ParticipationInput[] = [];
  for (const p of losers) {
    const death = deathOf(p, match);
    if (!death) alive.push(p);
    else if (death.at === null) untimed.push(p);
    else timed.push({ p, at: death.at });
  }

  // Best to worst: winner, then losers with no evidence, then the dead from
  // the last to die to the first, then the dead whose time is unknown.
  const groups: string[][] = [[outcome.winnerId]];
  if (alive.length) groups.push(alive.map((p) => p.id));
  timed.sort((x, y) => y.at - x.at);
  for (let i = 0; i < timed.length; ) {
    let j = i;
    while (j < timed.length && timed[j].at === timed[i].at) j++;
    groups.push(timed.slice(i, j).map((d) => d.p.id));
    i = j;
  }
  if (untimed.length) groups.push(untimed.map((p) => p.id));

  // Standard competition ranking: tied players share a placement and the
  // next one skips (1, 2, 2, 4).
  let ahead = 0;
  for (const group of groups) {
    for (const id of group) placements.set(id, ahead + 1);
    ahead += group.length;
  }

  const usedEvidence = timed.length + untimed.length > 0;
  return {
    placements,
    source: usedEvidence ? 'derived' : 'winner_only',
    unresolvedLosers: alive.length,
  };
}

// ─── Descriptive stats from placement ────────────────────────────────────────

export interface PlacementStats {
  /** Mean placement (1 = always wins). One decimal. */
  averagePlacement: Covered<number>;
  /** Share of matches finished 1st or 2nd, percent. */
  top2RatePct: Covered<number>;
  /** Share of matches where this entity was alone in last place, percent. */
  firstOutRatePct: Covered<number>;
}

/**
 * Placement stats for the participations picked by `isMine` (a player, a
 * deck…). Uses only matches whose order of elimination is fully known:
 * a win (not a draw), evidence of death, and at most one loser without it.
 * `coverage.total` is every match the entity played, so the UI can say
 * "based on X of Y matches".
 */
export function placementStats(
  matches: MatchInput[],
  isMine: (p: ParticipationInput) => boolean,
): PlacementStats {
  let total = 0;
  let used = 0;
  let placementSum = 0;
  let top2 = 0;
  let firstOut = 0;

  for (const match of matches) {
    const mine = match.participations.filter(isMine);
    if (mine.length === 0) continue;
    total += mine.length;

    if (matchOutcome(match).kind !== 'win') continue;
    const result = derivePlacements(match);
    if (result.source !== 'derived' || result.unresolvedLosers > 1) continue;

    const all = [...result.placements.values()];
    const worst = Math.max(...all);
    const aloneAtWorst = all.filter((v) => v === worst).length === 1;
    for (const p of mine) {
      const placement = result.placements.get(p.id);
      if (placement === undefined) continue;
      used++;
      placementSum += placement;
      if (placement <= 2) top2++;
      if (placement === worst && aloneAtWorst && worst > 1) firstOut++;
    }
  }

  const coverage = { used, total };
  const enough = used >= MIN_MATCHES_FOR_VALUE;
  return {
    averagePlacement: { value: enough ? Math.round((placementSum / used) * 10) / 10 : null, coverage },
    top2RatePct: { value: enough ? Math.round((top2 / used) * 1000) / 10 : null, coverage },
    firstOutRatePct: { value: enough ? Math.round((firstOut / used) * 1000) / 10 : null, coverage },
  };
}
