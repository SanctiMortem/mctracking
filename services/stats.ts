/**
 * Stats service — on-demand player + deck + commander stats (no pre-computation — BR-STATS-09).
 *
 * All queries filter matches.status = 'completed' (BR-STATS-01).
 * Abandoned matches are excluded entirely from the denominator (BR-STATS-03).
 * CALC-001: win_rate_pct = round((wins / total) * 100, 1) — null if total = 0.
 * BR-STATS-05: partner commanders (commander_id_2) counted independently.
 *
 * HIST-004, HIST-006, HIST-008 (EPIC-04)
 */
import { and, count, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/services/db';
import { commanders, decks, groupMembers, matchEvents, matchResults, matches, participations, players } from '@/db/schema';
import type { Commander, Deck, Player } from '@/db/index';

// Pod members may view each other's deck + commander stats whenever those
// entities show up in a match the viewer also has access to. "Access" here
// means either the viewer created the match or the match is scoped to a group
// the viewer belongs to — this covers the common case of a pod member bringing
// a *personal* (group_id = null) deck to a group match.
async function userCanViewDeck(userId: string, deck: Deck): Promise<boolean> {
  if (deck.createdBy === userId) return true;
  if (deck.groupId) {
    const [member] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, deck.groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    if (member) return true;
  }
  const [hit] = await db
    .select({ id: matches.id })
    .from(participations)
    .innerJoin(matches, eq(participations.matchId, matches.id))
    .leftJoin(
      groupMembers,
      and(eq(groupMembers.groupId, matches.groupId), eq(groupMembers.userId, userId)),
    )
    .where(
      and(
        eq(participations.deckId, deck.id),
        or(eq(matches.createdBy, userId), isNotNull(groupMembers.id)),
      ),
    )
    .limit(1);
  return !!hit;
}

async function userCanViewCommander(userId: string, commanderId: string, ownerId: string): Promise<boolean> {
  if (ownerId === userId) return true;
  const [hit] = await db
    .select({ id: matches.id })
    .from(participations)
    .innerJoin(decks, eq(participations.deckId, decks.id))
    .innerJoin(matches, eq(participations.matchId, matches.id))
    .leftJoin(
      groupMembers,
      and(eq(groupMembers.groupId, matches.groupId), eq(groupMembers.userId, userId)),
    )
    .where(
      and(
        or(eq(decks.commanderId, commanderId), eq(decks.commanderId2, commanderId)),
        or(eq(matches.createdBy, userId), isNotNull(groupMembers.id)),
      ),
    )
    .limit(1);
  return !!hit;
}

// ─── CALC-001 ─────────────────────────────────────────────────────────────────

function calcWinRate(wins: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((wins / total) * 1000) / 10;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type FavoriteDeck = {
  deck: Deck;
  commanders: Commander[];   // 1 entry normally, 2 for partner decks (BR-STATS-05)
  matches: number;
  win_rate_pct: number | null;
};

export type FavoriteCommander = {
  commander: Commander;
  matches: number;
  win_rate_pct: number | null;
};

export type PlayerStats = {
  player: Player;
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate_pct: number | null;
  favorite_decks: FavoriteDeck[];
  favorite_commanders: FavoriteCommander[];
};

export type GetPlayerStatsResult =
  | { data: PlayerStats }
  | { notFound: true }
  | { forbidden: true };

// ─── Service ──────────────────────────────────────────────────────────────────

export async function getPlayerStats(
  userId: string,
  playerId: string,
): Promise<GetPlayerStatsResult> {
  // 1. Player lookup — existence + ownership
  const [player] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), isNull(players.deletedAt)))
    .limit(1);

  if (!player) return { notFound: true };
  if (player.createdBy !== userId) return { forbidden: true };

  // 2. Run all aggregation queries in parallel
  const [statsRows, deckStatRows, partRows] = await Promise.all([
    // Overall stats — total completed matches, wins, losses, draws
    db
      .select({
        total: count(participations.id),
        wins: sql<number>`sum(case when ${participations.result} = 'win' then 1 else 0 end)`,
        losses: sql<number>`sum(case when ${participations.result} = 'lose' then 1 else 0 end)`,
        draws: sql<number>`sum(case when ${participations.result} = 'draw' then 1 else 0 end)`,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(
        and(eq(participations.playerId, playerId), eq(matches.status, 'completed')),
      ),

    // Top 5 decks by match count with per-deck win count
    db
      .select({
        deckId: participations.deckId,
        matches: count(participations.id),
        wins: sql<number>`sum(case when ${participations.result} = 'win' then 1 else 0 end)`,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(
        and(eq(participations.playerId, playerId), eq(matches.status, 'completed')),
      )
      .groupBy(participations.deckId)
      .orderBy(desc(count(participations.id)))
      .limit(5),

    // Commander data — includes commander_id_2 for partner decks (BR-STATS-05)
    db
      .select({
        result: participations.result,
        commanderId1: decks.commanderId,
        commanderId2: decks.commanderId2,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(
        and(eq(participations.playerId, playerId), eq(matches.status, 'completed')),
      ),
  ]);

  // 3. Overall numbers (SQL SUM returns null when no rows match — coerce to 0)
  const statsRow = statsRows[0];
  const total = Number(statsRow?.total ?? 0);
  const wins = Number(statsRow?.wins ?? 0);
  const losses = Number(statsRow?.losses ?? 0);
  const draws = Number(statsRow?.draws ?? 0);

  // 4. Resolve full Deck + Commander objects for top 5 decks
  let favoriteDecksList: FavoriteDeck[] = [];
  if (deckStatRows.length > 0) {
    const deckIds = deckStatRows.map((r) => r.deckId);
    const deckObjects = await db
      .select()
      .from(decks)
      .where(inArray(decks.id, deckIds));

    // Collect all commander IDs referenced by those decks (including partner)
    const deckCommanderIds = deckObjects
      .flatMap((d) => [d.commanderId, d.commanderId2])
      .filter(Boolean) as string[];

    const deckCommanderObjects = deckCommanderIds.length > 0
      ? await db.select().from(commanders).where(inArray(commanders.id, deckCommanderIds))
      : [];

    const deckMap = new Map(deckObjects.map((d) => [d.id, d]));
    const deckCmdMap = new Map(deckCommanderObjects.map((c) => [c.id, c]));

    favoriteDecksList = deckStatRows
      .map((r) => {
        const deck = deckMap.get(r.deckId);
        if (!deck) return null;
        const m = Number(r.matches ?? 0);
        const w = Number(r.wins ?? 0);
        const deckCommanders = [deck.commanderId, deck.commanderId2]
          .filter(Boolean)
          .map((id) => deckCmdMap.get(id!))
          .filter(Boolean) as Commander[];
        return { deck, commanders: deckCommanders, matches: m, win_rate_pct: calcWinRate(w, m) };
      })
      .filter((x): x is FavoriteDeck => x !== null);
  }

  // 5. Aggregate commanders in JS — both partners count independently (BR-STATS-05)
  const cmdMap = new Map<string, { matches: number; wins: number }>();
  for (const row of partRows) {
    const cmdIds = [row.commanderId1, row.commanderId2].filter(Boolean) as string[];
    for (const cId of cmdIds) {
      const entry = cmdMap.get(cId) ?? { matches: 0, wins: 0 };
      entry.matches++;
      if (row.result === 'win') entry.wins++;
      cmdMap.set(cId, entry);
    }
  }

  let favoriteCommandersList: FavoriteCommander[] = [];
  if (cmdMap.size > 0) {
    const topCmdIds = [...cmdMap.entries()]
      .sort(([, a], [, b]) => b.matches - a.matches)
      .slice(0, 5)
      .map(([id]) => id);

    const cmdObjects = await db
      .select()
      .from(commanders)
      .where(inArray(commanders.id, topCmdIds));

    const cmdObjectMap = new Map(cmdObjects.map((c) => [c.id, c]));

    favoriteCommandersList = topCmdIds
      .map((cId) => {
        const commander = cmdObjectMap.get(cId);
        const stats = cmdMap.get(cId);
        if (!commander || !stats) return null;
        return {
          commander,
          matches: stats.matches,
          win_rate_pct: calcWinRate(stats.wins, stats.matches),
        };
      })
      .filter((x): x is FavoriteCommander => x !== null);
  }

  return {
    data: {
      player,
      total_matches: total,
      wins,
      losses,
      draws,
      win_rate_pct: calcWinRate(wins, total),
      favorite_decks: favoriteDecksList,
      favorite_commanders: favoriteCommandersList,
    },
  };
}

// ─── Deck Stats (HIST-006) ────────────────────────────────────────────────────

export type DeckWithCommanders = Deck & {
  commander: Commander;
  commander2?: Commander;
};

export type PlayerUsage = {
  player: Player;
  matches: number;
  win_rate_pct: number | null;
};

export type MatchupBreakdown = {
  deck: Deck;
  matches: number;
  wins: number;
  win_rate_pct: number | null;
};

export type ColorMatchup = {
  /** Single color: 'W' | 'U' | 'B' | 'R' | 'G' | 'C' (colorless). */
  color: string;
  /** Matches won vs decks that include this color. */
  wins: number;
  /** Matches lost vs decks that include this color. */
  losses: number;
  /** wins − losses; used as the ranking score. */
  score: number;
};

export type DeckStats = {
  deck: DeckWithCommanders;
  total_matches: number;
  wins: number;
  win_rate_pct: number | null;
  players_used_by: PlayerUsage[];
  /** Top 3 opposing decks by highest win rate, min 2 matches against each */
  best_matchups: MatchupBreakdown[];
  /** Top 3 opposing decks by lowest win rate, min 2 matches against each */
  worst_matchups: MatchupBreakdown[];
  /** Colors this deck has the highest positive score against. Empty when none. */
  strong_against_colors: ColorMatchup[];
  /** Colors this deck has the lowest negative score against. Empty when none. */
  weak_against_colors: ColorMatchup[];
};

/** Min number of matches against a single opposing deck for it to qualify as a matchup */
const MATCHUP_MIN_MATCHES = 2;

export type GetDeckStatsResult =
  | { data: DeckStats }
  | { notFound: true }
  | { forbidden: true };

export async function getDeckStats(
  userId: string,
  deckId: string,
): Promise<GetDeckStatsResult> {
  // 1. Deck lookup — existence + ownership
  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), isNull(decks.deletedAt)))
    .limit(1);

  if (!deck) return { notFound: true };
  if (!(await userCanViewDeck(userId, deck))) {
    return { forbidden: true };
  }

  // 2. Fetch commander(s) + aggregate stats in parallel
  const commanderIds = [deck.commanderId, deck.commanderId2].filter(Boolean) as string[];

  const [deckCommanderObjects, statsRows, perPlayerRows, ownMatchRows] = await Promise.all([
    // Commander objects (1 or 2 for partner decks)
    db.select().from(commanders).where(inArray(commanders.id, commanderIds)),

    // Overall stats for this deck across all players
    db
      .select({
        total: count(participations.id),
        wins: sql<number>`sum(case when ${participations.result} = 'win' then 1 else 0 end)`,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(and(eq(participations.deckId, deckId), eq(matches.status, 'completed'))),

    // Per-player breakdown: group by player_id
    db
      .select({
        playerId: participations.playerId,
        matches: count(participations.id),
        wins: sql<number>`sum(case when ${participations.result} = 'win' then 1 else 0 end)`,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(and(eq(participations.deckId, deckId), eq(matches.status, 'completed')))
      .groupBy(participations.playerId)
      .orderBy(desc(count(participations.id))),

    // This deck's participations (matchId + result) — used to derive matchups
    db
      .select({ matchId: participations.matchId, result: participations.result })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(and(eq(participations.deckId, deckId), eq(matches.status, 'completed'))),
  ]);

  // 3. Build DeckWithCommanders
  const cmdMap = new Map(deckCommanderObjects.map((c) => [c.id, c]));
  const commander = cmdMap.get(deck.commanderId);
  if (!commander) return { notFound: true }; // schema inconsistency guard

  const deckWithCommanders: DeckWithCommanders = {
    ...deck,
    commander,
    ...(deck.commanderId2 && cmdMap.has(deck.commanderId2)
      ? { commander2: cmdMap.get(deck.commanderId2)! }
      : {}),
  };

  // 4. Overall numbers
  const statsRow = statsRows[0];
  const total = Number(statsRow?.total ?? 0);
  const wins = Number(statsRow?.wins ?? 0);

  // 5. Resolve Player objects for per-player breakdown
  let playersUsedBy: PlayerUsage[] = [];
  if (perPlayerRows.length > 0) {
    const playerIds = perPlayerRows.map((r) => r.playerId);
    const playerObjects = await db
      .select()
      .from(players)
      .where(inArray(players.id, playerIds));

    const playerMap = new Map(playerObjects.map((p) => [p.id, p]));

    playersUsedBy = perPlayerRows
      .map((r) => {
        const player = playerMap.get(r.playerId);
        if (!player) return null;
        const m = Number(r.matches ?? 0);
        const w = Number(r.wins ?? 0);
        return { player, matches: m, win_rate_pct: calcWinRate(w, m) };
      })
      .filter((x): x is PlayerUsage => x !== null);
  }

  // 6. Deck-vs-deck matchups
  //    For each match this deck played, every other distinct opposing deckId in
  //    that match counts as one head-to-head row. A multi-player win counts as
  //    a win against each opponent present.
  const ownResultByMatch = new Map<string, 'win' | 'lose' | 'draw' | null>();
  for (const r of ownMatchRows) ownResultByMatch.set(r.matchId, r.result);

  const matchIds = [...ownResultByMatch.keys()];
  const matchupTotals = new Map<string, { matches: number; wins: number }>();

  if (matchIds.length > 0) {
    const otherParts = await db
      .select({ matchId: participations.matchId, deckId: participations.deckId })
      .from(participations)
      .where(inArray(participations.matchId, matchIds));

    for (const p of otherParts) {
      if (p.deckId === deckId) continue;
      const own = ownResultByMatch.get(p.matchId);
      const entry = matchupTotals.get(p.deckId) ?? { matches: 0, wins: 0 };
      entry.matches += 1;
      if (own === 'win') entry.wins += 1;
      matchupTotals.set(p.deckId, entry);
    }
  }

  let bestMatchups: MatchupBreakdown[] = [];
  let worstMatchups: MatchupBreakdown[] = [];
  let strongAgainstColors: ColorMatchup[] = [];
  let weakAgainstColors: ColorMatchup[] = [];
  if (matchupTotals.size > 0) {
    const allOpponentIds = [...matchupTotals.keys()];
    const opponentDeckObjects = await db.select().from(decks).where(inArray(decks.id, allOpponentIds));
    const opponentMap = new Map(opponentDeckObjects.map((d) => [d.id, d]));

    // Color-identity bucket (per-deck color combo) needs commander data.
    const opponentCommanderIds = [
      ...new Set(opponentDeckObjects.flatMap((d) => [d.commanderId, d.commanderId2].filter(Boolean) as string[])),
    ];
    const opponentCommanders = opponentCommanderIds.length > 0
      ? await db.select().from(commanders).where(inArray(commanders.id, opponentCommanderIds))
      : [];
    const cmdColorMap = new Map(opponentCommanders.map((c) => [c.id, c.colorIdentity]));

    // Per-color tally: every color in the opponent's identity picks up the
    // match's win/loss independently. A UBR deck contributes to U, B, and R
    // buckets. Colorless decks go into the 'C' bucket.
    const colorTally = new Map<string, { wins: number; losses: number }>();
    for (const [oppDeckId, totals] of matchupTotals) {
      const oppDeck = opponentMap.get(oppDeckId);
      if (!oppDeck) continue;
      const colors = colorIdentityForDeck(oppDeck, cmdColorMap);
      const keys = colors.length > 0 ? colors : ['C'];
      const losses = totals.matches - totals.wins;
      for (const c of keys) {
        const cur = colorTally.get(c) ?? { wins: 0, losses: 0 };
        cur.wins += totals.wins;
        cur.losses += losses;
        colorTally.set(c, cur);
      }
    }
    const tallyList: ColorMatchup[] = [...colorTally.entries()].map(
      ([color, v]) => ({ color, wins: v.wins, losses: v.losses, score: v.wins - v.losses }),
    );
    // Strong = colors tied for the highest positive score (WUBRG-sorted).
    const positives = tallyList.filter((x) => x.score > 0);
    if (positives.length > 0) {
      const top = Math.max(...positives.map((x) => x.score));
      strongAgainstColors = positives
        .filter((x) => x.score === top)
        .sort((a, b) => (WUBRG_ORDER[a.color] ?? 99) - (WUBRG_ORDER[b.color] ?? 99));
    }
    // Weak = colors tied for the lowest negative score.
    const negatives = tallyList.filter((x) => x.score < 0);
    if (negatives.length > 0) {
      const bottom = Math.min(...negatives.map((x) => x.score));
      weakAgainstColors = negatives
        .filter((x) => x.score === bottom)
        .sort((a, b) => (WUBRG_ORDER[a.color] ?? 99) - (WUBRG_ORDER[b.color] ?? 99));
    }

    const qualifying = [...matchupTotals.entries()]
      .filter(([, s]) => s.matches >= MATCHUP_MIN_MATCHES)
      .map(([id, s]) => ({ deckId: id, matches: s.matches, wins: s.wins, wr: calcWinRate(s.wins, s.matches) }));

    if (qualifying.length > 0) {
      // Sort: WR DESC, then matches DESC for tiebreak (more samples = more confidence)
      const sortedDesc = [...qualifying].sort((a, b) =>
        (b.wr ?? -1) - (a.wr ?? -1) || b.matches - a.matches,
      );
      const sortedAsc = [...qualifying].sort((a, b) =>
        (a.wr ?? 101) - (b.wr ?? 101) || b.matches - a.matches,
      );

      const toBreakdown = (q: typeof qualifying[number]): MatchupBreakdown | null => {
        const d = opponentMap.get(q.deckId);
        if (!d) return null;
        return { deck: d, matches: q.matches, wins: q.wins, win_rate_pct: q.wr };
      };

      bestMatchups = sortedDesc.slice(0, 3).map(toBreakdown).filter((x): x is MatchupBreakdown => x !== null);
      worstMatchups = sortedAsc.slice(0, 3).map(toBreakdown).filter((x): x is MatchupBreakdown => x !== null);
    }
  }

  return {
    data: {
      deck: deckWithCommanders,
      total_matches: total,
      wins,
      win_rate_pct: calcWinRate(wins, total),
      players_used_by: playersUsedBy,
      best_matchups: bestMatchups,
      worst_matchups: worstMatchups,
      strong_against_colors: strongAgainstColors,
      weak_against_colors: weakAgainstColors,
    },
  };
}

const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

/**
 * A deck's effective color identity = union of its commander(s) color identities,
 * sorted in WUBRG order. Returns [] for colorless decks.
 */
function colorIdentityForDeck(
  deck: Deck,
  commanderColors: Map<string, string[]>,
): string[] {
  const set = new Set<string>();
  for (const cid of [deck.commanderId, deck.commanderId2]) {
    if (!cid) continue;
    for (const c of commanderColors.get(cid) ?? []) set.add(c);
  }
  return [...set].sort((a, b) => (WUBRG_ORDER[a] ?? 99) - (WUBRG_ORDER[b] ?? 99));
}

// ─── Commander Stats (HIST-008) ───────────────────────────────────────────────

export type DeckUsage = {
  deck: Deck;
  matches: number;
};

export type PlayerCommanderUsage = {
  player: Player;
  matches: number;
};

export type CommanderStats = {
  commander: Commander;
  total_matches: number;
  wins: number;
  win_rate_pct: number | null;
  decks_using: DeckUsage[];
  players_using: PlayerCommanderUsage[];
};

export type GetCommanderStatsResult =
  | { data: CommanderStats }
  | { notFound: true }
  | { forbidden: true };

export async function getCommanderStats(
  userId: string,
  commanderId: string,
): Promise<GetCommanderStatsResult> {
  // 1. Commander lookup — existence + ownership
  const [commander] = await db
    .select()
    .from(commanders)
    .where(and(eq(commanders.id, commanderId), isNull(commanders.deletedAt)))
    .limit(1);

  if (!commander) return { notFound: true };
  if (!(await userCanViewCommander(userId, commanderId, commander.createdBy))) {
    return { forbidden: true };
  }

  // Filter: participation's deck uses this commander (primary or partner — BR-STATS-05)
  const commanderFilter = and(
    or(eq(decks.commanderId, commanderId), eq(decks.commanderId2, commanderId)),
    eq(matches.status, 'completed'),
  );

  // 2. Run aggregation queries in parallel
  const [statsRows, perDeckRows, perPlayerRows] = await Promise.all([
    // Overall stats
    db
      .select({
        total: count(participations.id),
        wins: sql<number>`sum(case when ${participations.result} = 'win' then 1 else 0 end)`,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(commanderFilter),

    // Per-deck breakdown
    db
      .select({
        deckId: participations.deckId,
        matches: count(participations.id),
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(commanderFilter)
      .groupBy(participations.deckId)
      .orderBy(desc(count(participations.id))),

    // Per-player breakdown
    db
      .select({
        playerId: participations.playerId,
        matches: count(participations.id),
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(commanderFilter)
      .groupBy(participations.playerId)
      .orderBy(desc(count(participations.id))),
  ]);

  // 3. Overall numbers
  const statsRow = statsRows[0];
  const total = Number(statsRow?.total ?? 0);
  const wins = Number(statsRow?.wins ?? 0);

  // 4. Resolve Deck objects for decks_using
  let decksUsing: DeckUsage[] = [];
  if (perDeckRows.length > 0) {
    const deckIds = perDeckRows.map((r) => r.deckId);
    // Include soft-deleted decks that have match history
    const deckObjects = await db
      .select()
      .from(decks)
      .where(inArray(decks.id, deckIds));

    const deckMap = new Map(deckObjects.map((d) => [d.id, d]));

    decksUsing = perDeckRows
      .map((r) => {
        const deck = deckMap.get(r.deckId);
        if (!deck) return null;
        return { deck, matches: Number(r.matches ?? 0) };
      })
      .filter((x): x is DeckUsage => x !== null);
  }

  // 5. Resolve Player objects for players_using
  let playersUsing: PlayerCommanderUsage[] = [];
  if (perPlayerRows.length > 0) {
    const playerIds = perPlayerRows.map((r) => r.playerId);
    const playerObjects = await db
      .select()
      .from(players)
      .where(inArray(players.id, playerIds));

    const playerMap = new Map(playerObjects.map((p) => [p.id, p]));

    playersUsing = perPlayerRows
      .map((r) => {
        const player = playerMap.get(r.playerId);
        if (!player) return null;
        return { player, matches: Number(r.matches ?? 0) };
      })
      .filter((x): x is PlayerCommanderUsage => x !== null);
  }

  return {
    data: {
      commander,
      total_matches: total,
      wins,
      win_rate_pct: calcWinRate(wins, total),
      decks_using: decksUsing,
      players_using: playersUsing,
    },
  };
}

// ─── Matchup Stats (HIST-010) ─────────────────────────────────────────────────

export type MatchupResult = {
  entity_a_wins: number;
  entity_b_wins: number;
  draws: number;
  total_matches: number;
};

export type GetMatchupStatsResult =
  | { data: MatchupResult }
  | { notFound: string }
  | { forbidden: true };

export async function getMatchupStats(
  userId: string,
  entityType: 'player' | 'deck' | 'commander',
  entityAId: string,
  entityBId: string,
  scope: 'all' | '1v1',
): Promise<GetMatchupStatsResult> {
  // 1. Validate both entities exist and belong to the user
  if (entityType === 'player') {
    const [aRows, bRows] = await Promise.all([
      db.select().from(players).where(and(eq(players.id, entityAId), isNull(players.deletedAt))).limit(1),
      db.select().from(players).where(and(eq(players.id, entityBId), isNull(players.deletedAt))).limit(1),
    ]);
    if (!aRows[0]) return { notFound: 'entity_a' };
    if (!bRows[0]) return { notFound: 'entity_b' };
    if (aRows[0].createdBy !== userId || bRows[0].createdBy !== userId) return { forbidden: true };
  } else if (entityType === 'deck') {
    const [aRows, bRows] = await Promise.all([
      db.select().from(decks).where(and(eq(decks.id, entityAId), isNull(decks.deletedAt))).limit(1),
      db.select().from(decks).where(and(eq(decks.id, entityBId), isNull(decks.deletedAt))).limit(1),
    ]);
    if (!aRows[0]) return { notFound: 'entity_a' };
    if (!bRows[0]) return { notFound: 'entity_b' };
    if (aRows[0].createdBy !== userId || bRows[0].createdBy !== userId) return { forbidden: true };
  } else {
    const [aRows, bRows] = await Promise.all([
      db.select().from(commanders).where(and(eq(commanders.id, entityAId), isNull(commanders.deletedAt))).limit(1),
      db.select().from(commanders).where(and(eq(commanders.id, entityBId), isNull(commanders.deletedAt))).limit(1),
    ]);
    if (!aRows[0]) return { notFound: 'entity_a' };
    if (!bRows[0]) return { notFound: 'entity_b' };
    if (aRows[0].createdBy !== userId || bRows[0].createdBy !== userId) return { forbidden: true };
  }

  // 2. Fetch match IDs where entity A participated in completed matches
  let matchIdsForA: string[];

  if (entityType === 'player') {
    const rows = await db
      .select({ matchId: participations.matchId })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(and(eq(participations.playerId, entityAId), eq(matches.status, 'completed')));
    matchIdsForA = rows.map((r) => r.matchId);
  } else if (entityType === 'deck') {
    const rows = await db
      .select({ matchId: participations.matchId })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(and(eq(participations.deckId, entityAId), eq(matches.status, 'completed')));
    matchIdsForA = rows.map((r) => r.matchId);
  } else {
    const rows = await db
      .select({ matchId: participations.matchId })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(and(
        or(eq(decks.commanderId, entityAId), eq(decks.commanderId2, entityAId)),
        eq(matches.status, 'completed'),
      ));
    // Deduplicate — a match with 2 decks using the same commander would appear twice
    matchIdsForA = [...new Set(rows.map((r) => r.matchId))];
  }

  if (matchIdsForA.length === 0) {
    return { data: { entity_a_wins: 0, entity_b_wins: 0, draws: 0, total_matches: 0 } };
  }

  // 3. Fetch all participations for those matches (with deck info for commander lookups)
  const allRows = await db
    .select({
      matchId: participations.matchId,
      playerId: participations.playerId,
      deckId: participations.deckId,
      commanderId: decks.commanderId,
      commanderId2: decks.commanderId2,
      result: participations.result,
    })
    .from(participations)
    .innerJoin(decks, eq(participations.deckId, decks.id))
    .where(inArray(participations.matchId, matchIdsForA));

  type PartRow = typeof allRows[number];

  function isAEntity(row: PartRow): boolean {
    if (entityType === 'player') return row.playerId === entityAId;
    if (entityType === 'deck') return row.deckId === entityAId;
    return row.commanderId === entityAId || row.commanderId2 === entityAId;
  }

  function isBEntity(row: PartRow): boolean {
    if (entityType === 'player') return row.playerId === entityBId;
    if (entityType === 'deck') return row.deckId === entityBId;
    return row.commanderId === entityBId || row.commanderId2 === entityBId;
  }

  // 4. Group by matchId and compute head-to-head
  const matchGroups = new Map<string, PartRow[]>();
  for (const row of allRows) {
    const g = matchGroups.get(row.matchId) ?? [];
    g.push(row);
    matchGroups.set(row.matchId, g);
  }

  let entityAWins = 0;
  let entityBWins = 0;
  let draws = 0;
  let totalMatches = 0;

  for (const [, parts] of matchGroups) {
    const aRow = parts.find(isAEntity);
    const bRow = parts.find(isBEntity);
    // Skip matches where B didn't participate
    if (!aRow || !bRow) continue;
    // scope=1v1: only 2-player matches (BR-STATS-06)
    if (scope === '1v1' && parts.length !== 2) continue;

    totalMatches++;
    if (aRow.result === 'win') entityAWins++;
    else if (bRow.result === 'win') entityBWins++;
    else if (aRow.result === 'draw') draws++;
  }

  return {
    data: {
      entity_a_wins: entityAWins,
      entity_b_wins: entityBWins,
      draws,
      total_matches: totalMatches,
    },
  };
}

// ─── Global Stats (HIST-010) ──────────────────────────────────────────────────

export type PlayerRanking = {
  player: Player;
  total_matches: number;
  wins: number;
  win_rate_pct: number | null;
  rank: number;
};

export type TopDeck = {
  deck: Deck;
  commanders: Commander[];
  total_matches: number;
  wins: number;
  win_rate_pct: number | null;
  /** Consecutive wins from the most recent match backward; 0 if the latest result wasn't a win. */
  current_streak: number;
};

export type TopCommander = {
  commander: Commander;
  total_matches: number;
  wins: number;
  win_rate_pct: number | null;
};

export type TopPlayerDeck = {
  deck: Deck;
  commanders: Commander[];
  total_matches: number;
};

export type GlobalStats = {
  total_matches: number;
  total_players: number;
  player_rankings: PlayerRanking[];
  top_decks: TopDeck[];
  top_commanders: TopCommander[];
  /** Rank-1 player's most-used deck — drives the hero image in the ranking list. */
  top_player_deck: TopPlayerDeck | null;
};

export async function getGlobalStats(
  userId: string,
  groupId?: string | null,
): Promise<{ data: GlobalStats }> {
  // Scope: when groupId is set, include any match with that groupId (the API route
  // validates membership). Otherwise, personal scope = matches created by the user.
  const matchScope = groupId
    ? and(eq(matches.groupId, groupId), eq(matches.status, 'completed'))
    : and(eq(matches.createdBy, userId), eq(matches.status, 'completed'));

  // Phase 1: All aggregation queries in parallel
  const [totalMatchRows, playerStatRows, deckStatRows, commanderPartRows, perPlayerDeckRows] = await Promise.all([
    // Total completed matches
    db
      .select({ total: count(matches.id) })
      .from(matches)
      .where(matchScope),

    // Per-player stats
    db
      .select({
        playerId: participations.playerId,
        total: count(participations.id),
        wins: sql<number>`sum(case when ${participations.result} = 'win' then 1 else 0 end)`,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(matchScope)
      .groupBy(participations.playerId),

    // Per-deck stats (all decks; min-3 filter applied in JS)
    db
      .select({
        deckId: participations.deckId,
        total: count(participations.id),
        wins: sql<number>`sum(case when ${participations.result} = 'win' then 1 else 0 end)`,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(matchScope)
      .groupBy(participations.deckId),

    // Commander participation rows for JS aggregation (both primary + partner)
    db
      .select({
        result: participations.result,
        commanderId1: decks.commanderId,
        commanderId2: decks.commanderId2,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(matchScope),

    // Per-player per-deck play counts (used to find top player's most-used deck)
    db
      .select({
        playerId: participations.playerId,
        deckId: participations.deckId,
        total: count(participations.id),
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(matchScope)
      .groupBy(participations.playerId, participations.deckId),
  ]);

  const totalMatchCount = Number(totalMatchRows[0]?.total ?? 0);

  // ── Player rankings with RANK (1, 1, 3 — not DENSE_RANK 1, 1, 2) ─────────────

  const playerStatsSorted = playerStatRows
    .map((r) => {
      const total = Number(r.total ?? 0);
      const wins = Number(r.wins ?? 0);
      return { playerId: r.playerId, total, wins, wr: calcWinRate(wins, total) };
    })
    .sort((a, b) => (b.wr ?? -1) - (a.wr ?? -1));

  // First pass: assign rank or 0 (=tie marker); second pass: propagate
  const ranked = playerStatsSorted.map((entry, i) => {
    const prev = playerStatsSorted[i - 1];
    return { ...entry, rank: prev === undefined || entry.wr !== prev.wr ? i + 1 : 0 };
  });
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i].rank === 0) ranked[i].rank = ranked[i - 1].rank;
  }

  // ── Top 5 decks (min 3 matches, by win_rate DESC) ─────────────────────────────

  const top5DeckEntries = deckStatRows
    .map((r) => {
      const total = Number(r.total ?? 0);
      const wins = Number(r.wins ?? 0);
      return { deckId: r.deckId, total, wins, wr: calcWinRate(wins, total) };
    })
    .filter((e) => e.total >= 3)
    .sort((a, b) => (b.wr ?? -1) - (a.wr ?? -1))
    .slice(0, 5);

  // ── Top 5 commanders (min 3 matches, by win_rate DESC, both partners counted) ─

  const cmdStatsMap = new Map<string, { wins: number; total: number }>();
  for (const row of commanderPartRows) {
    const cmdIds = [row.commanderId1, row.commanderId2].filter(Boolean) as string[];
    for (const cId of cmdIds) {
      const entry = cmdStatsMap.get(cId) ?? { wins: 0, total: 0 };
      entry.total++;
      if (row.result === 'win') entry.wins++;
      cmdStatsMap.set(cId, entry);
    }
  }

  const top5CmdEntries = [...cmdStatsMap.entries()]
    .map(([id, stats]) => ({ commanderId: id, ...stats, wr: calcWinRate(stats.wins, stats.total) }))
    .filter((e) => e.total >= 3)
    .sort((a, b) => (b.wr ?? -1) - (a.wr ?? -1))
    .slice(0, 5);

  // ── Top player's most-used deck (for the ranking list hero thumbnail) ────────

  const topPlayerId = ranked.find((r) => r.rank === 1)?.playerId ?? null;
  let topPlayerDeckId: string | null = null;
  let topPlayerDeckPlays = 0;
  if (topPlayerId) {
    for (const r of perPlayerDeckRows) {
      if (r.playerId !== topPlayerId) continue;
      const total = Number(r.total ?? 0);
      if (total > topPlayerDeckPlays) {
        topPlayerDeckPlays = total;
        topPlayerDeckId = r.deckId;
      }
    }
  }

  // ── Phase 2: Resolve objects in parallel ─────────────────────────────────────

  const playerIds = ranked.map((r) => r.playerId);
  const deckIds = Array.from(
    new Set([
      ...top5DeckEntries.map((e) => e.deckId),
      ...(topPlayerDeckId ? [topPlayerDeckId] : []),
    ]),
  );
  const topCmdIds = top5CmdEntries.map((e) => e.commanderId);

  const [playerObjects, deckObjectsRaw, topCmdObjects] = await Promise.all([
    playerIds.length > 0
      ? db.select().from(players).where(inArray(players.id, playerIds))
      : Promise.resolve([] as Player[]),
    deckIds.length > 0
      ? db.select().from(decks).where(inArray(decks.id, deckIds))
      : Promise.resolve([] as Deck[]),
    topCmdIds.length > 0
      ? db.select().from(commanders).where(inArray(commanders.id, topCmdIds))
      : Promise.resolve([] as Commander[]),
  ]);

  // Fetch commanders for top decks (color chips in UI)
  const deckCommanderIds = deckObjectsRaw
    .flatMap((d) => [d.commanderId, d.commanderId2])
    .filter(Boolean) as string[];

  const top5DeckIds = top5DeckEntries.map((e) => e.deckId);

  const [deckCmdObjects, recentResultRows] = await Promise.all([
    deckCommanderIds.length > 0
      ? db.select().from(commanders).where(inArray(commanders.id, deckCommanderIds))
      : Promise.resolve([] as Commander[]),

    // Recent results per top deck — drives the undefeated-streak counter.
    // Ordered most recent first; we walk per deck and stop at the first non-win.
    top5DeckIds.length > 0
      ? db
          .select({
            deckId: participations.deckId,
            result: participations.result,
          })
          .from(participations)
          .innerJoin(matches, eq(participations.matchId, matches.id))
          .where(and(matchScope, inArray(participations.deckId, top5DeckIds)))
          .orderBy(desc(matches.endedAt), desc(matches.createdAt))
      : Promise.resolve([] as { deckId: string; result: string }[]),
  ]);

  // Bucket rows by deck (rows arrive sorted most-recent first), then count
  // leading wins per deck to get the current undefeated streak.
  const recentByDeck = new Map<string, (string | null)[]>();
  for (const row of recentResultRows) {
    const arr = recentByDeck.get(row.deckId) ?? [];
    arr.push(row.result);
    recentByDeck.set(row.deckId, arr);
  }
  const streakMap = new Map<string, number>();
  for (const [deckId, results] of recentByDeck) {
    let streak = 0;
    for (const r of results) {
      if (r === 'win') streak++;
      else break;
    }
    streakMap.set(deckId, streak);
  }

  // ── Assemble response ────────────────────────────────────────────────────────

  const playerMap = new Map(playerObjects.map((p) => [p.id, p]));
  const deckMap = new Map(deckObjectsRaw.map((d) => [d.id, d]));
  const deckCmdMap = new Map(deckCmdObjects.map((c) => [c.id, c]));
  const topCmdMap = new Map(topCmdObjects.map((c) => [c.id, c]));

  const playerRankings: PlayerRanking[] = ranked
    .map((r) => {
      const player = playerMap.get(r.playerId);
      if (!player) return null;
      return { player, total_matches: r.total, wins: r.wins, win_rate_pct: r.wr, rank: r.rank };
    })
    .filter((x): x is PlayerRanking => x !== null);

  const topDecks: TopDeck[] = top5DeckEntries
    .map((e) => {
      const deck = deckMap.get(e.deckId);
      if (!deck) return null;
      const deckCommanders = [deck.commanderId, deck.commanderId2]
        .filter(Boolean)
        .map((id) => deckCmdMap.get(id!))
        .filter(Boolean) as Commander[];
      return {
        deck,
        commanders: deckCommanders,
        total_matches: e.total,
        wins: e.wins,
        win_rate_pct: e.wr,
        current_streak: streakMap.get(e.deckId) ?? 0,
      };
    })
    .filter((x): x is TopDeck => x !== null);

  const topCommanders: TopCommander[] = top5CmdEntries
    .map((e) => {
      const commander = topCmdMap.get(e.commanderId);
      if (!commander) return null;
      return { commander, total_matches: e.total, wins: e.wins, win_rate_pct: e.wr };
    })
    .filter((x): x is TopCommander => x !== null);

  // ── Top player's most-used deck — resolve into a TopPlayerDeck payload ──────

  let topPlayerDeck: TopPlayerDeck | null = null;
  if (topPlayerDeckId) {
    const deck = deckMap.get(topPlayerDeckId);
    if (deck) {
      const tpdCommanders = [deck.commanderId, deck.commanderId2]
        .filter(Boolean)
        .map((id) => deckCmdMap.get(id!))
        .filter(Boolean) as Commander[];
      topPlayerDeck = { deck, commanders: tpdCommanders, total_matches: topPlayerDeckPlays };
    }
  }

  return {
    data: {
      total_matches: totalMatchCount,
      total_players: playerIds.length,
      player_rankings: playerRankings,
      top_decks: topDecks,
      top_commanders: topCommanders,
      top_player_deck: topPlayerDeck,
    },
  };
}

// ─── Account Home Stats (PLAT-010) ────────────────────────────────────────────

export type AccountHomeMostPlayedDeck = {
  deck: Deck;
  commanders: Commander[];
  matches: number;
};

export type AccountHomeStats = {
  /** Account player linked to this user (null if user hasn't created one). */
  player: Player | null;
  total_matches: number;
  wins: number;
  win_rate_pct: number | null;
  most_played_deck: AccountHomeMostPlayedDeck | null;
  /** winConditionEnum value, or null when no wins yet. */
  most_common_wincon: string | null;
  /** Average number of turns elapsed in matches the account player won (rounded 1 dp). */
  avg_win_turn: number | null;
};

export async function getAccountHomeStats(
  userId: string,
): Promise<{ data: AccountHomeStats }> {
  // 1. Resolve the account player.
  const [accountPlayer] = await db
    .select()
    .from(players)
    .where(and(eq(players.accountUserId, userId), isNull(players.deletedAt)))
    .limit(1);

  if (!accountPlayer) {
    return {
      data: {
        player: null,
        total_matches: 0,
        wins: 0,
        win_rate_pct: null,
        most_played_deck: null,
        most_common_wincon: null,
        avg_win_turn: null,
      },
    };
  }

  const playerId = accountPlayer.id;
  const completedFilter = and(
    eq(participations.playerId, playerId),
    eq(matches.status, 'completed'),
  );

  // 2. Aggregations in parallel.
  const [overallRows, deckRows, winningParticipations] = await Promise.all([
    db
      .select({
        total: count(participations.id),
        wins: sql<number>`sum(case when ${participations.result} = 'win' then 1 else 0 end)`,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(completedFilter),

    db
      .select({
        deckId: participations.deckId,
        matches: count(participations.id),
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(completedFilter)
      .groupBy(participations.deckId)
      .orderBy(desc(count(participations.id)))
      .limit(1),

    // Participations the account player won, with their match IDs (for wincon + turn aggregation).
    db
      .select({
        participationId: participations.id,
        matchId: participations.matchId,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(and(completedFilter, eq(participations.result, 'win'))),
  ]);

  const overall = overallRows[0];
  const totalMatches = Number(overall?.total ?? 0);
  const wins = Number(overall?.wins ?? 0);

  // 3. Most-played deck — resolve into Deck + Commander[].
  let mostPlayedDeck: AccountHomeMostPlayedDeck | null = null;
  if (deckRows[0]) {
    const top = deckRows[0];
    const [deckRow] = await db.select().from(decks).where(eq(decks.id, top.deckId)).limit(1);
    if (deckRow) {
      const cmdIds = [deckRow.commanderId, deckRow.commanderId2].filter(Boolean) as string[];
      const cmdObjects = cmdIds.length > 0
        ? await db.select().from(commanders).where(inArray(commanders.id, cmdIds))
        : [];
      const cmdMap = new Map(cmdObjects.map((c) => [c.id, c]));
      const orderedCommanders = cmdIds
        .map((id) => cmdMap.get(id))
        .filter(Boolean) as Commander[];
      mostPlayedDeck = {
        deck: deckRow,
        commanders: orderedCommanders,
        matches: Number(top.matches ?? 0),
      };
    }
  }

  // 4. Most common wincon + average win turn from won matches.
  let mostCommonWincon: string | null = null;
  let avgWinTurn: number | null = null;

  if (winningParticipations.length > 0) {
    const winningMatchIds = winningParticipations.map((r) => r.matchId);
    const winningParticipationIds = winningParticipations.map((r) => r.participationId);

    const [resultRows, turnRows] = await Promise.all([
      // Restrict to matches won by this participation; draws (BR-MATCH-08) have a null winner_participation_id and are excluded.
      db
        .select({ winCondition: matchResults.winCondition })
        .from(matchResults)
        .where(and(
          inArray(matchResults.matchId, winningMatchIds),
          inArray(matchResults.winnerParticipationId, winningParticipationIds),
        )),

      // Avg turn: count non-undone turn_passed events tagged to the *winning*
      // participation in each match (otherwise we'd sum every player's turns
      // and inflate the average by the player count).
      db
        .select({
          matchId: matchEvents.matchId,
          turns: count(matchEvents.id),
        })
        .from(matchEvents)
        .where(and(
          inArray(matchEvents.matchId, winningMatchIds),
          inArray(matchEvents.participationId, winningParticipationIds),
          eq(matchEvents.eventType, 'turn_passed'),
          eq(matchEvents.isUndone, false),
        ))
        .groupBy(matchEvents.matchId),
    ]);

    if (resultRows.length > 0) {
      const wcMap = new Map<string, number>();
      for (const r of resultRows) {
        wcMap.set(r.winCondition, (wcMap.get(r.winCondition) ?? 0) + 1);
      }
      let topWc: string | null = null;
      let topCount = 0;
      for (const [wc, c] of wcMap) {
        if (c > topCount) { topWc = wc; topCount = c; }
      }
      mostCommonWincon = topWc;
    }

    if (turnRows.length > 0) {
      const total = turnRows.reduce((acc, r) => acc + Number(r.turns ?? 0), 0);
      avgWinTurn = Math.round((total / turnRows.length) * 10) / 10;
    }
  }

  return {
    data: {
      player: accountPlayer,
      total_matches: totalMatches,
      wins,
      win_rate_pct: calcWinRate(wins, totalMatches),
      most_played_deck: mostPlayedDeck,
      most_common_wincon: mostCommonWincon,
      avg_win_turn: avgWinTurn,
    },
  };
}
