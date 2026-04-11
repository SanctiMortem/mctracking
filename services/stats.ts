/**
 * Stats service — on-demand player + deck stats (no pre-computation — BR-STATS-09).
 *
 * All queries filter matches.status = 'completed' (BR-STATS-01).
 * Abandoned matches are excluded entirely from the denominator (BR-STATS-03).
 * CALC-001: win_rate_pct = round((wins / total) * 100, 1) — null if total = 0.
 * BR-STATS-05: partner commanders (commander_id_2) counted independently.
 *
 * HIST-004, HIST-006 (EPIC-04)
 */
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

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

export type DeckStats = {
  deck: DeckWithCommanders;
  total_matches: number;
  wins: number;
  win_rate_pct: number | null;
  players_used_by: PlayerUsage[];
};

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

  const [deckCommanderObjects, statsRows, perPlayerRows] = await Promise.all([
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

  return {
    data: {
      deck: deckWithCommanders,
      total_matches: total,
      wins,
      win_rate_pct: calcWinRate(wins, total),
      players_used_by: playersUsedBy,
    },
  };
}
