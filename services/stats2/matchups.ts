/**
 * Matchups built on duels: a deck's record against each opposing deck, and
 * head-to-head between any two players, decks or commanders.
 *
 * Replaces the "decisive matches" logic and getMatchupStats in
 * services/stats.ts. Differences on purpose:
 *   • head-to-head wins, losses and ties always add up to the duels counted,
 *     and the matches where neither finished ahead of the other are reported
 *     separately instead of silently missing from the total (#12);
 *   • every participation on each side is considered, not only the first
 *     one found (#13);
 *   • a partner deck holding both commanders is not an A-vs-B meeting.
 */
import { type Duel, type DuelMode, type DuelSide, buildAllDuels, viewDuels } from './duels';
import { type MatchInput, pct } from './types';

// ─── A deck against each opposing deck ───────────────────────────────────────

/** Decisive matches needed against one opposing deck before it is listed. */
export const MATCHUP_MIN_MATCHES = 3;

export interface OpponentRecord {
  opponentDeckId: string;
  wins: number;
  losses: number;
  ties: number;
  /** Distinct matches with a win or a loss against this opponent. */
  matches: number;
  /** wins ÷ (wins + losses), one decimal. Null with no decisive result. */
  winPct: number | null;
  lastPlayedAt: Date;
}

export function deckMatchups(duels: Duel[], deckId: string): OpponentRecord[] {
  const byOpponent = new Map<
    string,
    { wins: number; losses: number; ties: number; decisive: Set<string>; last: Date }
  >();
  for (const v of viewDuels(duels, (s) => s.deckId === deckId)) {
    let rec = byOpponent.get(v.opponent.deckId);
    if (!rec) {
      rec = { wins: 0, losses: 0, ties: 0, decisive: new Set(), last: v.duel.playedAt };
      byOpponent.set(v.opponent.deckId, rec);
    }
    if (v.result === 'tie') rec.ties++;
    else {
      if (v.result === 'win') rec.wins++;
      else rec.losses++;
      rec.decisive.add(v.duel.matchId);
    }
    if (v.duel.playedAt > rec.last) rec.last = v.duel.playedAt;
  }
  return [...byOpponent.entries()].map(([opponentDeckId, r]) => ({
    opponentDeckId,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    matches: r.decisive.size,
    winPct: pct(r.wins, r.wins + r.losses),
    lastPlayedAt: r.last,
  }));
}

/**
 * Best and worst matchups: opponents with enough decisive matches, strictly
 * above / below 50 %. Order: win rate, then more matches, then most recent,
 * then name. `nameOf` only breaks the final tie.
 */
export function bestWorstMatchups(
  records: OpponentRecord[],
  opts: { minMatches?: number; top?: number; nameOf?: (deckId: string) => string } = {},
): { best: OpponentRecord[]; worst: OpponentRecord[] } {
  const minMatches = opts.minMatches ?? MATCHUP_MIN_MATCHES;
  const top = opts.top ?? 3;
  const nameOf = opts.nameOf ?? ((id: string) => id);
  const rate = (r: OpponentRecord) => r.wins / (r.wins + r.losses);
  const tieBreak = (x: OpponentRecord, y: OpponentRecord) =>
    y.matches - x.matches ||
    y.lastPlayedAt.getTime() - x.lastPlayedAt.getTime() ||
    nameOf(x.opponentDeckId).localeCompare(nameOf(y.opponentDeckId));

  const eligible = records.filter((r) => r.matches >= minMatches && r.wins + r.losses > 0);
  const best = eligible
    .filter((r) => rate(r) > 0.5)
    .sort((x, y) => rate(y) - rate(x) || tieBreak(x, y))
    .slice(0, top);
  const worst = eligible
    .filter((r) => rate(r) < 0.5)
    .sort((x, y) => rate(x) - rate(y) || tieBreak(x, y))
    .slice(0, top);
  return { best, worst };
}

// ─── Head-to-head ────────────────────────────────────────────────────────────

export type EntityType = 'player' | 'deck' | 'commander';

export interface HeadToHead {
  aWins: number;
  bWins: number;
  ties: number;
  /** aWins + bWins + ties, always. */
  duels: number;
  /** Matches where A and B sat at the same table (as different participations). */
  sharedMatches: number;
  /** Shared matches where neither finished ahead of the other (a third player won). */
  undecidedMatches: number;
}

function has(type: EntityType, side: { playerId: string; deckId: string; commanderIds: string[] }, id: string) {
  if (type === 'player') return side.playerId === id;
  if (type === 'deck') return side.deckId === id;
  return side.commanderIds.includes(id);
}

export function headToHead(
  matches: MatchInput[],
  type: EntityType,
  aId: string,
  bId: string,
  opts: { oneVsOne?: boolean; mode?: DuelMode } = {},
): HeadToHead {
  const scoped = opts.oneVsOne ? matches.filter((m) => m.participations.length === 2) : matches;

  // A side counts for A only if it does not also hold B, and the other way
  // round — a partner deck with both commanders is not A against B.
  const onlyA = (s: DuelSide | MatchInput['participations'][number]) => has(type, s, aId) && !has(type, s, bId);
  const onlyB = (s: DuelSide | MatchInput['participations'][number]) => has(type, s, bId) && !has(type, s, aId);

  let sharedMatches = 0;
  for (const m of scoped) {
    if (m.participations.some(onlyA) && m.participations.some(onlyB)) sharedMatches++;
  }

  const result: HeadToHead = { aWins: 0, bWins: 0, ties: 0, duels: 0, sharedMatches, undecidedMatches: 0 };
  const decided = new Set<string>();
  for (const duel of buildAllDuels(scoped, opts.mode ?? 'winner_only')) {
    let aIsA: boolean;
    if (onlyA(duel.a) && onlyB(duel.b)) aIsA = true;
    else if (onlyA(duel.b) && onlyB(duel.a)) aIsA = false;
    else continue;

    result.duels++;
    decided.add(duel.matchId);
    if (duel.outcome === 'tie') result.ties++;
    else if ((duel.outcome === 'a') === aIsA) result.aWins++;
    else result.bWins++;
  }
  result.undecidedMatches = sharedMatches - decided.size;
  return result;
}
