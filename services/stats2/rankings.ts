/**
 * Rankings — players, decks and commanders, with a minimum-games rule.
 *
 * Interim rule while ratings are parked (spec decision 5):
 *   • sort by win %, among entities with at least `minMatches` matches;
 *   • anything below the floor is listed separately as "unranked", so a
 *     1-for-1 player is never #1 (#7);
 *   • ties are broken the same way everywhere: win %, then more matches,
 *     then the most recent match, then name (#18);
 *   • soft-deleted entities are left out (#17).
 *
 * "Wins vs expected" = wins − Σ(1 ÷ pod size): how many more games an entity
 * won than an average player would have at the same tables. It is shown
 * beside the win %, it does not drive the order.
 *
 * Draws count as a match played and not as a win, as everywhere else.
 */
import { type MatchInput, type ParticipationInput, matchOutcome, pct, playedAt } from './types';

export const RANK_MIN_MATCHES_PLAYER = 3;
export const RANK_MIN_MATCHES_DECK = 5;
export const RANK_MIN_MATCHES_COMMANDER = 5;

export interface RankRow {
  id: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  /** One decimal; null only with 0 matches (never listed). */
  winPct: number | null;
  /** Σ(1 ÷ pod size) over the matches played, two decimals. */
  expectedWins: number;
  /** wins − expectedWins, one decimal. */
  winsVsExpected: number;
  lastPlayedAt: Date;
  /** 1-based position; null for unranked rows. */
  rank: number | null;
}

export interface Ranking {
  ranked: RankRow[];
  /** Below the floor. Most matches first. */
  unranked: RankRow[];
}

export interface RankOptions {
  minMatches: number;
  /** Ids to leave out (soft-deleted entities). */
  exclude?: Set<string>;
  /** Only used to break a final tie. */
  nameOf?: (id: string) => string;
}

export function rankEntities(
  matches: MatchInput[],
  keysOf: (p: ParticipationInput) => string[],
  opts: RankOptions,
): Ranking {
  const nameOf = opts.nameOf ?? ((id: string) => id);
  const acc = new Map<string, { matches: number; wins: number; losses: number; draws: number; expected: number; last: Date }>();

  for (const match of matches) {
    const outcome = matchOutcome(match);
    if (outcome.kind === 'none') continue;
    const podSize = match.participations.length;
    const when = playedAt(match);
    for (const p of match.participations) {
      for (const id of new Set(keysOf(p))) {
        if (opts.exclude?.has(id)) continue;
        let row = acc.get(id);
        if (!row) acc.set(id, (row = { matches: 0, wins: 0, losses: 0, draws: 0, expected: 0, last: when }));
        row.matches++;
        row.expected += 1 / podSize;
        if (outcome.kind === 'draw') row.draws++;
        else if (outcome.winnerId === p.id) row.wins++;
        else row.losses++;
        if (when > row.last) row.last = when;
      }
    }
  }

  const rows: RankRow[] = [...acc.entries()].map(([id, r]) => ({
    id,
    matches: r.matches,
    wins: r.wins,
    losses: r.losses,
    draws: r.draws,
    winPct: pct(r.wins, r.matches),
    expectedWins: Math.round(r.expected * 100) / 100,
    winsVsExpected: Math.round((r.wins - r.expected) * 10) / 10,
    lastPlayedAt: r.last,
    rank: null,
  }));

  const tieBreak = (x: RankRow, y: RankRow) =>
    y.matches - x.matches ||
    y.lastPlayedAt.getTime() - x.lastPlayedAt.getTime() ||
    nameOf(x.id).localeCompare(nameOf(y.id));

  const ranked = rows
    .filter((r) => r.matches >= opts.minMatches)
    .sort((x, y) => y.wins / y.matches - x.wins / x.matches || tieBreak(x, y))
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const unranked = rows.filter((r) => r.matches < opts.minMatches).sort(tieBreak);

  return { ranked, unranked };
}

type EntityOptions = Omit<RankOptions, 'minMatches'> & { minMatches?: number };

export function rankPlayers(matches: MatchInput[], opts: EntityOptions = {}): Ranking {
  return rankEntities(matches, (p) => [p.playerId], { minMatches: RANK_MIN_MATCHES_PLAYER, ...opts });
}

export function rankDecks(matches: MatchInput[], opts: EntityOptions = {}): Ranking {
  return rankEntities(matches, (p) => [p.deckId], { minMatches: RANK_MIN_MATCHES_DECK, ...opts });
}

/** Partner commanders are each credited with the deck's match, as today. */
export function rankCommanders(matches: MatchInput[], opts: EntityOptions = {}): Ranking {
  return rankEntities(matches, (p) => p.commanderIds, { minMatches: RANK_MIN_MATCHES_COMMANDER, ...opts });
}
