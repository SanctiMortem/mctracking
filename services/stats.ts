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
import { and, count, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/services/db';
import { commanders, decks, matches, participations, players } from '@/db/schema';
import type { Commander, Deck, Player } from '@/db/index';

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
  if (deck.createdBy !== userId) return { forbidden: true };

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
  if (matchupTotals.size > 0) {
    const qualifying = [...matchupTotals.entries()]
      .filter(([, s]) => s.matches >= MATCHUP_MIN_MATCHES)
      .map(([id, s]) => ({ deckId: id, matches: s.matches, wins: s.wins, wr: calcWinRate(s.wins, s.matches) }));

    if (qualifying.length > 0) {
      const opponentDeckIds = qualifying.map((q) => q.deckId);
      const opponentDecks = await db.select().from(decks).where(inArray(decks.id, opponentDeckIds));
      const opponentMap = new Map(opponentDecks.map((d) => [d.id, d]));

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
    },
  };
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
  if (commander.createdBy !== userId) return { forbidden: true };

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

  const deckCmdObjects = deckCommanderIds.length > 0
    ? await db.select().from(commanders).where(inArray(commanders.id, deckCommanderIds))
    : [];

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
      return { deck, commanders: deckCommanders, total_matches: e.total, wins: e.wins, win_rate_pct: e.wr };
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
