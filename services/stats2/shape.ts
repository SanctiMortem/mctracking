/**
 * Stats v2 — turns the calculations into the API responses in contract.ts.
 *
 * Pure (the `LoadedStats` import is type-only), so the exact payload a route
 * returns can be unit-tested and printed by the comparison script.
 */
import { deckColorStats } from './colors';
import type {
  ColorRowV2,
  DeckColorsV2,
  MatchupV2,
  PlayerExtrasV2,
  RankedEntityV2,
  RankingListV2,
  RankingsV2,
} from './contract';
import { buildAllDuels } from './duels';
import type { LoadedStats } from './load';
import type { HeadToHead } from './matchups';
import { placementStats } from './placements';
import {
  RANK_MIN_MATCHES_COMMANDER,
  RANK_MIN_MATCHES_DECK,
  RANK_MIN_MATCHES_PLAYER,
  type RankRow,
  type Ranking,
  rankCommanders,
  rankDecks,
  rankPlayers,
} from './rankings';
import type { MatchInput } from './types';

type Named = Map<string, { name: string; deleted: boolean }>;

function deletedIds(entities: Named): Set<string> {
  return new Set([...entities.entries()].filter(([, e]) => e.deleted).map(([id]) => id));
}

function rankingList(ranking: Ranking, minMatches: number, entities: Named): RankingListV2 {
  const row = (r: RankRow): RankedEntityV2 => ({
    id: r.id,
    name: entities.get(r.id)?.name ?? '',
    matches: r.matches,
    wins: r.wins,
    losses: r.losses,
    draws: r.draws,
    win_pct: r.winPct,
    wins_vs_expected: r.winsVsExpected,
    rank: r.rank,
  });
  return { min_matches: minMatches, ranked: ranking.ranked.map(row), unranked: ranking.unranked.map(row) };
}

export function shapeRankings(loaded: LoadedStats): RankingsV2 {
  const nameIn = (entities: Named) => (id: string) => entities.get(id)?.name ?? id;
  return {
    total_matches: loaded.matches.length,
    players: rankingList(
      rankPlayers(loaded.matches, { exclude: deletedIds(loaded.players), nameOf: nameIn(loaded.players) }),
      RANK_MIN_MATCHES_PLAYER,
      loaded.players,
    ),
    decks: rankingList(
      rankDecks(loaded.matches, { exclude: deletedIds(loaded.decks), nameOf: nameIn(loaded.decks) }),
      RANK_MIN_MATCHES_DECK,
      loaded.decks,
    ),
    commanders: rankingList(
      rankCommanders(loaded.matches, { exclude: deletedIds(loaded.commanders), nameOf: nameIn(loaded.commanders) }),
      RANK_MIN_MATCHES_COMMANDER,
      loaded.commanders,
    ),
  };
}

export function shapeDeckColors(matches: MatchInput[], deckId: string): DeckColorsV2 {
  const stats = deckColorStats(buildAllDuels(matches), deckId);
  const row = (r: (typeof stats.rows)[number] | (typeof stats.byColorCount)[number]): ColorRowV2 => ({
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    duels: r.duels,
    matches: r.matches,
    raw_pct: r.rawPct,
    adj_pct: r.adjPct,
    sample: r.sample,
  });
  return {
    rows: stats.rows.map((r) => ({ color: r.color, ...row(r) })),
    strong: stats.strong.map((r) => ({ color: r.color, ...row(r) })),
    weak: stats.weak.map((r) => ({ color: r.color, ...row(r) })),
    by_color_count: stats.byColorCount.map((r) => ({ color_count: r.colorCount, ...row(r) })),
  };
}

export function shapeMatchup(h: HeadToHead): MatchupV2 {
  return {
    a_wins: h.aWins,
    b_wins: h.bWins,
    ties: h.ties,
    duels: h.duels,
    shared_matches: h.sharedMatches,
    undecided_matches: h.undecidedMatches,
  };
}

export function shapePlayerExtras(matches: MatchInput[], playerId: string): PlayerExtrasV2 {
  // minMatches 0: the page shows the player's own numbers whatever the sample.
  const { ranked } = rankPlayers(matches, { minMatches: 0 });
  const me = ranked.find((r) => r.id === playerId);
  const placement = placementStats(matches, (p) => p.playerId === playerId);
  return {
    matches: me?.matches ?? 0,
    wins: me?.wins ?? 0,
    expected_wins: me?.expectedWins ?? 0,
    wins_vs_expected: me?.winsVsExpected ?? 0,
    placement: {
      average: placement.averagePlacement,
      top2_rate_pct: placement.top2RatePct,
      first_out_rate_pct: placement.firstOutRatePct,
    },
  };
}
