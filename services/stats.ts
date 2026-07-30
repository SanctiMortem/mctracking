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
import { getPodMemberUserIds } from '@/services/pods';
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

// Mirrors userCanViewDeck: a viewer can see a player they share a pod or a
// match with. Account-linked players (account_user_id set) are also visible
// to any pod-mate of that account user — so tapping Peter on the Stats screen
// drills into his profile if you're in the same pod.
async function userCanViewPlayer(userId: string, player: Player): Promise<boolean> {
  if (player.createdBy === userId) return true;

  // Same pod as the player's account user.
  if (player.accountUserId) {
    const [shared] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.userId, userId),
          inArray(
            groupMembers.groupId,
            db
              .select({ id: groupMembers.groupId })
              .from(groupMembers)
              .where(eq(groupMembers.userId, player.accountUserId)),
          ),
        ),
      )
      .limit(1);
    if (shared) return true;
  }

  // Shared a match (viewer is match owner, or viewer belongs to the match's pod).
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
        eq(participations.playerId, player.id),
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
  /**
   * Average wall-time per completed turn, across every visible timed match
   * the player has been in. null when no timed turns have been recorded.
   */
  avg_turn_time_seconds: number | null;
  /**
   * Longest single turn this player has taken, in seconds. null when no
   * timed turns have been recorded.
   */
  longest_turn_seconds: number | null;
  /** Count of timed turns aggregated — drives an explicit "no data" copy. */
  timed_turn_count: number;
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
  if (!(await userCanViewPlayer(userId, player))) return { forbidden: true };

  // 2. Run all aggregation queries in parallel
  const [statsRows, deckStatRows, partRows, turnEventRows] = await Promise.all([
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

    // turn_passed event stream for every completed match this player has
    // been in. We need the OUTGOING player to attribute duration, which is
    // the participationId on the PREVIOUS turn_passed event in the same
    // match — pairing happens in JS below.
    db
      .select({
        matchId: matchEvents.matchId,
        participationId: matchEvents.participationId,
        turnDurationSeconds: matchEvents.turnDurationSeconds,
      })
      .from(matchEvents)
      .innerJoin(matches, eq(matches.id, matchEvents.matchId))
      .where(and(
        eq(matchEvents.eventType, 'turn_passed'),
        eq(matchEvents.isUndone, false),
        eq(matches.status, 'completed'),
        // Limit to matches this player participated in. Subquery would be
        // more efficient on huge histories, but the player's participation
        // IDs would have to be resolved first — for the current scale
        // (hundreds of matches per pod, not millions) the JS filter is fine.
        sql`${matchEvents.matchId} IN (
          SELECT match_id FROM participations WHERE player_id = ${playerId}
        )`,
      ))
      .orderBy(matchEvents.matchId, matchEvents.createdAt),
  ]);

  // 3. Overall numbers (SQL SUM returns null when no rows match — coerce to 0)
  const statsRow = statsRows[0];
  const total = Number(statsRow?.total ?? 0);
  const wins = Number(statsRow?.wins ?? 0);
  const losses = Number(statsRow?.losses ?? 0);
  const draws = Number(statsRow?.draws ?? 0);

  // ── Per-player turn-time aggregation ──────────────────────────────────────
  // First pull this player's participation IDs so we can attribute durations
  // (duration on a turn_passed event belongs to the participation on the
  // PREVIOUS turn_passed event in that match).
  const partIdRows = await db
    .select({ id: participations.id })
    .from(participations)
    .where(eq(participations.playerId, playerId));
  const playerParticipationIds = new Set(partIdRows.map((r) => r.id));

  let turnDurationTotal = 0;
  let turnDurationCount = 0;
  let longestTurnSeconds = 0;
  let prevEvent: { matchId: string; participationId: string } | null = null;
  for (const e of turnEventRows) {
    // Reset pairing window when we cross into a new match.
    if (!prevEvent || prevEvent.matchId !== e.matchId) {
      prevEvent = { matchId: e.matchId, participationId: e.participationId };
      continue;
    }
    if (
      typeof e.turnDurationSeconds === 'number' &&
      playerParticipationIds.has(prevEvent.participationId)
    ) {
      turnDurationTotal += e.turnDurationSeconds;
      turnDurationCount += 1;
      if (e.turnDurationSeconds > longestTurnSeconds) {
        longestTurnSeconds = e.turnDurationSeconds;
      }
    }
    prevEvent = { matchId: e.matchId, participationId: e.participationId };
  }

  const avgTurnTimeSeconds = turnDurationCount > 0
    ? Math.round(turnDurationTotal / turnDurationCount)
    : null;
  const longestTurnOrNull = turnDurationCount > 0 ? longestTurnSeconds : null;

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
      avg_turn_time_seconds: avgTurnTimeSeconds,
      longest_turn_seconds: longestTurnOrNull,
      timed_turn_count: turnDurationCount,
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

/** Min number of DECISIVE matches against a single opposing deck for it
 *  to qualify as a matchup. "Decisive" means the winner was either the
 *  current deck or that specific opponent — matches won by a third deck
 *  don't count, because neither side actually beat the other. */
const MATCHUP_MIN_MATCHES = 3;

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

  // 6. Deck-vs-deck matchups — DECISIVE matches only.
  //
  //    A match between the current deck and an opponent deck counts as a
  //    "decisive" matchup ONLY when the winner of the match is one of those
  //    two decks. If a third deck won, the match doesn't count for this pair
  //    (neither side actually beat the other). Draws also don't count.
  //
  //    For each qualifying opponent we also track the most recent decisive
  //    matchup timestamp, which becomes the third sort key for break ties
  //    at the bottom of the top-3 list (newer rivalry wins the slot).
  const ownResultByMatch = new Map<string, 'win' | 'lose' | 'draw' | null>();
  for (const r of ownMatchRows) ownResultByMatch.set(r.matchId, r.result);

  const matchIds = [...ownResultByMatch.keys()];
  const matchupTotals = new Map<string, { matches: number; wins: number; mostRecentDecisiveAt: number }>();

  if (matchIds.length > 0) {
    // Pull every participation in those matches, including result + match
    // createdAt. We need result to find each match's winning deck, and
    // createdAt to break sort ties on the most-recent rivalry.
    const allParts = await db
      .select({
        matchId: participations.matchId,
        deckId: participations.deckId,
        result: participations.result,
        matchCreatedAt: matches.createdAt,
      })
      .from(participations)
      .innerJoin(matches, eq(matches.id, participations.matchId))
      .where(inArray(participations.matchId, matchIds));

    // Index each match's winning deck (null = draw / abandoned / no winner)
    // and its creation timestamp.
    const winnerDeckByMatch = new Map<string, string>();
    const matchCreatedAtMs = new Map<string, number>();
    for (const p of allParts) {
      matchCreatedAtMs.set(p.matchId, p.matchCreatedAt.getTime());
      if (p.result === 'win') {
        winnerDeckByMatch.set(p.matchId, p.deckId);
      }
    }

    // For every opponent participation, increment the pair counter only if
    // the match's winner is current OR that opponent — i.e. one of them
    // beat the other. Skip otherwise.
    for (const p of allParts) {
      if (p.deckId === deckId) continue;
      const winnerDeckId = winnerDeckByMatch.get(p.matchId);
      if (!winnerDeckId) continue;                                          // draw / no winner
      if (winnerDeckId !== deckId && winnerDeckId !== p.deckId) continue;   // third deck won
      const entry = matchupTotals.get(p.deckId) ?? { matches: 0, wins: 0, mostRecentDecisiveAt: 0 };
      entry.matches += 1;
      if (winnerDeckId === deckId) entry.wins += 1;
      const at = matchCreatedAtMs.get(p.matchId) ?? 0;
      if (at > entry.mostRecentDecisiveAt) entry.mostRecentDecisiveAt = at;
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

    // Per-color tally derived from the same decisive-only matchupTotals, so
    // "strong against U" / "weak against B" reflect actual head-to-head
    // results, not matches where a third deck took the win.
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

    // Qualifying opponents: at least MATCHUP_MIN_MATCHES (=3) decisive matches.
    const qualifying = [...matchupTotals.entries()]
      .filter(([, s]) => s.matches >= MATCHUP_MIN_MATCHES)
      .map(([id, s]) => {
        const opp = opponentMap.get(id);
        return {
          deckId: id,
          matches: s.matches,
          wins: s.wins,
          wr: calcWinRate(s.wins, s.matches),
          mostRecentAt: s.mostRecentDecisiveAt,
          name: opp?.name ?? '',
        };
      });

    if (qualifying.length > 0) {
      // Sort cascade (applied identically to both lists, just reversed on the
      // primary key):
      //   1. win rate   — DESC for best, ASC for worst
      //   2. matches    — DESC (more samples = higher confidence)
      //   3. mostRecent — DESC (newer rivalry wins ties at the bottom)
      //   4. deck name  — ASC (stable, deterministic last-resort)
      const best = qualifying
        .filter((q) => q.wr !== null && q.wr > 50)
        .sort((a, b) =>
          (b.wr ?? -1) - (a.wr ?? -1) ||
          b.matches - a.matches ||
          b.mostRecentAt - a.mostRecentAt ||
          a.name.localeCompare(b.name),
        )
        .slice(0, 3);

      const worst = qualifying
        .filter((q) => q.wr !== null && q.wr < 50)
        .sort((a, b) =>
          (a.wr ?? 101) - (b.wr ?? 101) ||
          b.matches - a.matches ||
          b.mostRecentAt - a.mostRecentAt ||
          a.name.localeCompare(b.name),
        )
        .slice(0, 3);

      const toBreakdown = (q: typeof qualifying[number]): MatchupBreakdown | null => {
        const d = opponentMap.get(q.deckId);
        if (!d) return null;
        return { deck: d, matches: q.matches, wins: q.wins, win_rate_pct: q.wr };
      };

      bestMatchups = best.map(toBreakdown).filter((x): x is MatchupBreakdown => x !== null);
      worstMatchups = worst.map(toBreakdown).filter((x): x is MatchupBreakdown => x !== null);
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
export function colorIdentityForDeck(
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

// ─── Matchup Selector Options ─────────────────────────────────────────────────

export type MatchupOptions = {
  players: Player[];
  decks: Deck[];
  commanders: Commander[];
};

/**
 * Returns the players / decks / commanders selectable on the head-to-head
 * matchup screen for a given scope.
 *
 *  - Personal scope (no scopeGroupId): the user's own active rows.
 *  - Pod scope: the union across every pod member — pod members' active
 *    players (account + guests they created), every deck owned by any pod
 *    member, and every commander referenced by those decks.
 *
 *  Archived decks are excluded; archived/soft-deleted commanders/players
 *  follow the same filters used on the personal endpoints.
 */
export async function getMatchupOptions(
  userId: string,
  scopeGroupId?: string | null,
): Promise<MatchupOptions> {
  // Resolve the set of "owners" whose entities are visible. In personal scope
  // that's just the caller; in pod scope, it's every pod member (plus the
  // caller, defensively, in case they're a member without an account player).
  let ownerIds: string[];
  if (scopeGroupId) {
    const memberIds = await getPodMemberUserIds(scopeGroupId);
    ownerIds = Array.from(new Set([...memberIds, userId]));
  } else {
    ownerIds = [userId];
  }

  if (ownerIds.length === 0) {
    return { players: [], decks: [], commanders: [] };
  }

  const [playerRows, deckRows] = await Promise.all([
    db
      .select()
      .from(players)
      .where(and(inArray(players.createdBy, ownerIds), isNull(players.deletedAt)))
      .orderBy(players.name),
    db
      .select()
      .from(decks)
      .where(
        and(
          inArray(decks.createdBy, ownerIds),
          isNull(decks.deletedAt),
          isNull(decks.archivedAt),
        ),
      )
      .orderBy(decks.name),
  ]);

  // Commanders referenced by any visible deck (primary or partner). Falling
  // back to the per-user list when no decks exist yet keeps the picker usable.
  const commanderIds = new Set<string>();
  for (const d of deckRows) {
    if (d.commanderId) commanderIds.add(d.commanderId);
    if (d.commanderId2) commanderIds.add(d.commanderId2);
  }

  const commanderRows = commanderIds.size
    ? await db
        .select()
        .from(commanders)
        .where(and(inArray(commanders.id, [...commanderIds]), isNull(commanders.deletedAt)))
        .orderBy(commanders.name)
    : [];

  return {
    players: playerRows,
    decks: deckRows,
    commanders: commanderRows,
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
  scopeGroupId?: string | null,
): Promise<GetMatchupStatsResult> {
  // When scopeGroupId is set, entities can be owned by any pod member and the
  // match search is restricted to matches in that pod. The API route already
  // validated the caller's membership; we treat ANY pod member's entity as
  // visible inside the pod scope.
  let allowedOwnerIds: Set<string> | null = null;
  if (scopeGroupId) {
    const memberIds = await getPodMemberUserIds(scopeGroupId);
    allowedOwnerIds = new Set(memberIds);
    // Also let the caller see their own entities — useful if they belong to
    // the pod but haven't created an account player yet.
    allowedOwnerIds.add(userId);
  }

  function entityOwnerAllowed(ownerId: string): boolean {
    if (allowedOwnerIds) return allowedOwnerIds.has(ownerId);
    return ownerId === userId;
  }

  // 1. Validate both entities exist and (in personal scope) belong to the user,
  //    or (in pod scope) belong to any pod member.
  if (entityType === 'player') {
    const [aRows, bRows] = await Promise.all([
      db.select().from(players).where(and(eq(players.id, entityAId), isNull(players.deletedAt))).limit(1),
      db.select().from(players).where(and(eq(players.id, entityBId), isNull(players.deletedAt))).limit(1),
    ]);
    if (!aRows[0]) return { notFound: 'entity_a' };
    if (!bRows[0]) return { notFound: 'entity_b' };
    if (!entityOwnerAllowed(aRows[0].createdBy) || !entityOwnerAllowed(bRows[0].createdBy)) {
      return { forbidden: true };
    }
  } else if (entityType === 'deck') {
    const [aRows, bRows] = await Promise.all([
      db.select().from(decks).where(and(eq(decks.id, entityAId), isNull(decks.deletedAt))).limit(1),
      db.select().from(decks).where(and(eq(decks.id, entityBId), isNull(decks.deletedAt))).limit(1),
    ]);
    if (!aRows[0]) return { notFound: 'entity_a' };
    if (!bRows[0]) return { notFound: 'entity_b' };
    if (!entityOwnerAllowed(aRows[0].createdBy) || !entityOwnerAllowed(bRows[0].createdBy)) {
      return { forbidden: true };
    }
  } else {
    const [aRows, bRows] = await Promise.all([
      db.select().from(commanders).where(and(eq(commanders.id, entityAId), isNull(commanders.deletedAt))).limit(1),
      db.select().from(commanders).where(and(eq(commanders.id, entityBId), isNull(commanders.deletedAt))).limit(1),
    ]);
    if (!aRows[0]) return { notFound: 'entity_a' };
    if (!bRows[0]) return { notFound: 'entity_b' };
    if (!entityOwnerAllowed(aRows[0].createdBy) || !entityOwnerAllowed(bRows[0].createdBy)) {
      return { forbidden: true };
    }
  }

  // 2. Fetch match IDs where entity A participated in completed matches.
  //    In pod scope, restrict to matches owned by that pod.
  const matchScopeFilter = scopeGroupId
    ? and(eq(matches.status, 'completed'), eq(matches.groupId, scopeGroupId))
    : eq(matches.status, 'completed');
  let matchIdsForA: string[];

  if (entityType === 'player') {
    const rows = await db
      .select({ matchId: participations.matchId })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(and(eq(participations.playerId, entityAId), matchScopeFilter));
    matchIdsForA = rows.map((r) => r.matchId);
  } else if (entityType === 'deck') {
    const rows = await db
      .select({ matchId: participations.matchId })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(and(eq(participations.deckId, entityAId), matchScopeFilter));
    matchIdsForA = rows.map((r) => r.matchId);
  } else {
    const rows = await db
      .select({ matchId: participations.matchId })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(and(
        or(eq(decks.commanderId, entityAId), eq(decks.commanderId2, entityAId)),
        matchScopeFilter,
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

export type TopPlayerDeckEntry = TopPlayerDeck & {
  /** The player whose most-played deck this is. */
  playerId: string;
};

export type GlobalStats = {
  total_matches: number;
  total_players: number;
  player_rankings: PlayerRanking[];
  top_decks: TopDeck[];
  top_commanders: TopCommander[];
  /** Rank-1 player's most-used deck — drives the hero image in the ranking list. */
  top_player_deck: TopPlayerDeck | null;
  /** Most-played deck per ranking for the top-3 players, keyed by playerId. */
  top_player_decks: TopPlayerDeckEntry[];
};

export type GlobalStatsOptions = {
  /**
   * Cap for top_decks + top_commanders. Default 5 (the stats dashboard).
   * Pass `null` to disable the cap entirely — used by the per-entity
   * "ALL" screens (/stats/decks, /stats/commanders).
   *
   * player_rankings is always unbounded — the ranking semantics need
   * the full denominator to compute ties correctly (BR-STATS-07).
   */
  limit?: number | null;
};

export async function getGlobalStats(
  userId: string,
  groupId?: string | null,
  options: GlobalStatsOptions = {},
): Promise<{ data: GlobalStats }> {
  const limit = options.limit === undefined ? 5 : options.limit;
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

  const allDeckEntriesRanked = deckStatRows
    .map((r) => {
      const total = Number(r.total ?? 0);
      const wins = Number(r.wins ?? 0);
      return { deckId: r.deckId, total, wins, wr: calcWinRate(wins, total) };
    })
    .filter((e) => e.total >= 3)
    .sort((a, b) => (b.wr ?? -1) - (a.wr ?? -1));
  const top5DeckEntries = limit === null ? allDeckEntriesRanked : allDeckEntriesRanked.slice(0, limit);

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

  const allCmdEntriesRanked = [...cmdStatsMap.entries()]
    .map(([id, stats]) => ({ commanderId: id, ...stats, wr: calcWinRate(stats.wins, stats.total) }))
    .filter((e) => e.total >= 3)
    .sort((a, b) => (b.wr ?? -1) - (a.wr ?? -1));
  const top5CmdEntries = limit === null ? allCmdEntriesRanked : allCmdEntriesRanked.slice(0, limit);

  // ── Top-3 players' most-used decks (hero thumbnails in the ranking list) ────

  const topPlayerIds = ranked
    .filter((r) => r.rank >= 1 && r.rank <= 3)
    .map((r) => r.playerId);
  /** Map<playerId, { deckId, plays }>. Highest-plays deck for each top-3 player. */
  const topPlayerDeckMap = new Map<string, { deckId: string; plays: number }>();
  if (topPlayerIds.length > 0) {
    const topSet = new Set(topPlayerIds);
    for (const r of perPlayerDeckRows) {
      if (!topSet.has(r.playerId)) continue;
      const total = Number(r.total ?? 0);
      const current = topPlayerDeckMap.get(r.playerId);
      if (!current || total > current.plays) {
        topPlayerDeckMap.set(r.playerId, { deckId: r.deckId, plays: total });
      }
    }
  }
  const topPlayerDeckIds = [...topPlayerDeckMap.values()].map((v) => v.deckId);

  // ── Phase 2: Resolve objects in parallel ─────────────────────────────────────

  const playerIds = ranked.map((r) => r.playerId);
  const deckIds = Array.from(
    new Set([
      ...top5DeckEntries.map((e) => e.deckId),
      ...topPlayerDeckIds,
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

  // ── Top-3 players' most-used decks — resolve into TopPlayerDeckEntry[] ──────

  const topPlayerDecks: TopPlayerDeckEntry[] = [];
  for (const [playerId, { deckId, plays }] of topPlayerDeckMap) {
    const deck = deckMap.get(deckId);
    if (!deck) continue;
    const tpdCommanders = [deck.commanderId, deck.commanderId2]
      .filter(Boolean)
      .map((id) => deckCmdMap.get(id!))
      .filter(Boolean) as Commander[];
    topPlayerDecks.push({ playerId, deck, commanders: tpdCommanders, total_matches: plays });
  }

  const rank1PlayerId = ranked.find((r) => r.rank === 1)?.playerId ?? null;
  const topPlayerDeck: TopPlayerDeck | null = rank1PlayerId
    ? topPlayerDecks.find((e) => e.playerId === rank1PlayerId) ?? null
    : null;

  return {
    data: {
      total_matches: totalMatchCount,
      total_players: playerIds.length,
      player_rankings: playerRankings,
      top_decks: topDecks,
      top_commanders: topCommanders,
      top_player_deck: topPlayerDeck,
      top_player_decks: topPlayerDecks,
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

// ─── Global Aggregates (home screen) ─────────────────────────────────────────
//
// World-wide cross-match aggregates for the home dashboard: which wincon
// dominates, which commander shows up most, which commander has dealt the most
// commander damage in total, which commander wins the fastest on average, and
// the most popular color identity across distinct decks that have been played.
// Every user sees the same numbers — these are not scoped to the viewer.
// Only the commander objects and color enum/identity values are returned, so
// no private user data (deck names, player names) leaves the aggregation.

export type GlobalAggregateCommander = {
  commander: Commander;
  /** Plays for top_commander, total damage for top_damage_commander, wins for fastest_commander. */
  value: number;
};

export type GlobalAggregates = {
  total_matches: number;
  /** winConditionEnum value + count of wins that used it. Null if no completed wins. */
  top_wincon: { value: string; count: number } | null;
  /** Commander that shows up most across decks-in-matches (partners counted separately). */
  top_commander: GlobalAggregateCommander | null;
  /** Commander with the highest total commander-damage dealt (sum of non-undone events). */
  top_damage_commander: GlobalAggregateCommander | null;
  /** Commander with the lowest average winning-turn count. Requires ≥2 wins. */
  fastest_commander: (GlobalAggregateCommander & { avg_turns: number }) | null;
  /** Most popular color identity across decks played, e.g. ['U','B']. 'C' = colorless. */
  top_color_identity: { colors: string[]; count: number } | null;
};

export async function getGlobalAggregates(): Promise<{ data: GlobalAggregates }> {
  // World-wide scope: every completed match in the database, regardless of
  // owner or group.
  const matchScope = eq(matches.status, 'completed');

  const [
    totalMatchRows,
    winconRows,
    deckCommanderRows,
    damageRows,
    winningRows,
  ] = await Promise.all([
    db
      .select({ total: count(matches.id) })
      .from(matches)
      .where(matchScope),

    // Wincons from completed matches (draws have is_draw=true; exclude them).
    db
      .select({ winCondition: matchResults.winCondition })
      .from(matchResults)
      .innerJoin(matches, eq(matchResults.matchId, matches.id))
      .where(and(matchScope, eq(matchResults.isDraw, false))),

    // Every (deck → commander ids) pair touched by a participation, for commander
    // plays + color identity aggregation.
    db
      .select({
        deckId: participations.deckId,
        commanderId1: decks.commanderId,
        commanderId2: decks.commanderId2,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(matchScope),

    // Commander damage events tagged to a source commander (sum of non-undone deltas).
    db
      .select({
        commanderIdSource: matchEvents.commanderIdSource,
        totalDamage: sql<number>`sum(${matchEvents.delta})`,
      })
      .from(matchEvents)
      .innerJoin(matches, eq(matchEvents.matchId, matches.id))
      .where(and(
        matchScope,
        eq(matchEvents.eventType, 'commander_damage'),
        eq(matchEvents.isUndone, false),
        isNotNull(matchEvents.commanderIdSource),
      ))
      .groupBy(matchEvents.commanderIdSource),

    // Winning participations with their match + deck (for fastest-commander avg turns).
    db
      .select({
        participationId: participations.id,
        matchId: participations.matchId,
        commanderId1: decks.commanderId,
        commanderId2: decks.commanderId2,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(and(matchScope, eq(participations.result, 'win'))),
  ]);

  const totalMatchCount = Number(totalMatchRows[0]?.total ?? 0);

  // ── Top wincon ───────────────────────────────────────────────────────────
  let topWincon: { value: string; count: number } | null = null;
  if (winconRows.length > 0) {
    const wcMap = new Map<string, number>();
    for (const r of winconRows) {
      wcMap.set(r.winCondition, (wcMap.get(r.winCondition) ?? 0) + 1);
    }
    for (const [value, c] of wcMap) {
      if (!topWincon || c > topWincon.count) topWincon = { value, count: c };
    }
  }

  // ── Top commander (plays across all participations) ──────────────────────
  const cmdPlayMap = new Map<string, number>();

  // Pre-fetch commander color identities for the decks we touched.
  const touchedCmdIds = Array.from(
    new Set(
      deckCommanderRows.flatMap((r) => [r.commanderId1, r.commanderId2]).filter(Boolean) as string[],
    ),
  );
  const touchedCmdObjects = touchedCmdIds.length > 0
    ? await db.select().from(commanders).where(inArray(commanders.id, touchedCmdIds))
    : [];
  const cmdColorMap = new Map(touchedCmdObjects.map((c) => [c.id, c.colorIdentity]));
  const cmdObjectMap = new Map(touchedCmdObjects.map((c) => [c.id, c]));

  for (const r of deckCommanderRows) {
    for (const cid of [r.commanderId1, r.commanderId2]) {
      if (!cid) continue;
      cmdPlayMap.set(cid, (cmdPlayMap.get(cid) ?? 0) + 1);
    }
  }

  // ── Color identity tally — count each distinct deck once ─────────────────
  // A deck's color identity = union of its commander(s) identities (so a
  // mono-U deck contributes to "U", a Kraum+Tymna partner deck to "WUB", etc.).
  // A commander whose identity is BG contributes 1 to "BG"; a separate
  // commander whose identity is BGR contributes 1 to "BGR" — BG is NOT
  // bumped by the BGR deck, they're independent buckets.
  const seenDecks = new Map<string, [string, string | null]>();
  for (const r of deckCommanderRows) {
    if (!seenDecks.has(r.deckId)) {
      seenDecks.set(r.deckId, [r.commanderId1, r.commanderId2]);
    }
  }

  const colorTally = new Map<string, number>();
  for (const [, [c1, c2]] of seenDecks) {
    const set = new Set<string>();
    for (const cid of [c1, c2]) {
      if (!cid) continue;
      for (const c of cmdColorMap.get(cid) ?? []) set.add(c);
    }
    const sorted = [...set].sort(
      (a, b) => (WUBRG_ORDER[a] ?? 99) - (WUBRG_ORDER[b] ?? 99),
    );
    const key = sorted.length > 0 ? sorted.join('') : 'C';
    colorTally.set(key, (colorTally.get(key) ?? 0) + 1);
  }

  let topCommanderEntry: { commanderId: string; count: number } | null = null;
  for (const [commanderId, c] of cmdPlayMap) {
    if (!topCommanderEntry || c > topCommanderEntry.count) {
      topCommanderEntry = { commanderId, count: c };
    }
  }

  // ── Top damage commander ────────────────────────────────────────────────
  let topDamageEntry: { commanderId: string; total: number } | null = null;
  for (const r of damageRows) {
    const cid = r.commanderIdSource;
    if (!cid) continue;
    const total = Number(r.totalDamage ?? 0);
    if (total <= 0) continue;
    if (!topDamageEntry || total > topDamageEntry.total) {
      topDamageEntry = { commanderId: cid, total };
    }
  }

  // ── Fastest commander (by avg winning-turn count) ───────────────────────
  let fastestEntry: { commanderId: string; avgTurns: number; wins: number } | null = null;
  if (winningRows.length > 0) {
    const winningPIds = winningRows.map((r) => r.participationId);
    const winningMatchIds = Array.from(new Set(winningRows.map((r) => r.matchId)));

    const turnRows = winningPIds.length > 0
      ? await db
          .select({
            matchId: matchEvents.matchId,
            turns: count(matchEvents.id),
          })
          .from(matchEvents)
          .where(and(
            inArray(matchEvents.matchId, winningMatchIds),
            inArray(matchEvents.participationId, winningPIds),
            eq(matchEvents.eventType, 'turn_passed'),
            eq(matchEvents.isUndone, false),
          ))
          .groupBy(matchEvents.matchId)
      : [];

    const turnsByMatch = new Map<string, number>();
    for (const r of turnRows) {
      turnsByMatch.set(r.matchId, Number(r.turns ?? 0));
    }

    // Group winning matches by primary commander (partners counted separately).
    const perCmd = new Map<string, { total: number; wins: number }>();
    for (const r of winningRows) {
      const t = turnsByMatch.get(r.matchId);
      if (t == null || t <= 0) continue; // skip wins with no recorded turns
      for (const cid of [r.commanderId1, r.commanderId2]) {
        if (!cid) continue;
        const cur = perCmd.get(cid) ?? { total: 0, wins: 0 };
        cur.total += t;
        cur.wins += 1;
        perCmd.set(cid, cur);
      }
    }

    for (const [commanderId, { total, wins }] of perCmd) {
      if (wins < 2) continue; // noise filter
      const avg = total / wins;
      if (!fastestEntry || avg < fastestEntry.avgTurns) {
        fastestEntry = { commanderId, avgTurns: avg, wins };
      }
    }
  }

  // ── Resolve missing commander objects (damage/fastest may reference cmds
  //    outside the plays set if they were tagged mid-match but deck changed)
  const missingCmdIds = [
    topDamageEntry?.commanderId,
    fastestEntry?.commanderId,
  ].filter((id): id is string => !!id && !cmdObjectMap.has(id));

  if (missingCmdIds.length > 0) {
    const extra = await db
      .select()
      .from(commanders)
      .where(inArray(commanders.id, missingCmdIds));
    for (const c of extra) cmdObjectMap.set(c.id, c);
  }

  // ── Top color identity ──────────────────────────────────────────────────
  let topColor: { colors: string[]; count: number } | null = null;
  for (const [key, c] of colorTally) {
    if (!topColor || c > topColor.count) {
      topColor = { colors: key === 'C' ? [] : key.split(''), count: c };
    }
  }

  // ── Assemble ────────────────────────────────────────────────────────────
  const topCommander: GlobalAggregateCommander | null =
    topCommanderEntry && cmdObjectMap.get(topCommanderEntry.commanderId)
      ? { commander: cmdObjectMap.get(topCommanderEntry.commanderId)!, value: topCommanderEntry.count }
      : null;

  const topDamageCommander: GlobalAggregateCommander | null =
    topDamageEntry && cmdObjectMap.get(topDamageEntry.commanderId)
      ? { commander: cmdObjectMap.get(topDamageEntry.commanderId)!, value: topDamageEntry.total }
      : null;

  const fastestCommander: (GlobalAggregateCommander & { avg_turns: number }) | null =
    fastestEntry && cmdObjectMap.get(fastestEntry.commanderId)
      ? {
          commander: cmdObjectMap.get(fastestEntry.commanderId)!,
          value: fastestEntry.wins,
          avg_turns: Math.round(fastestEntry.avgTurns * 10) / 10,
        }
      : null;

  return {
    data: {
      total_matches: totalMatchCount,
      top_wincon: topWincon,
      top_commander: topCommander,
      top_damage_commander: topDamageCommander,
      fastest_commander: fastestCommander,
      top_color_identity: topColor,
    },
  };
}

// ─── Pod Highlights (PLAT-XYZ — carousel on Stats screen pod view) ────────────

export type PodHighlightPlayer = {
  player: Player;
  value: number; // matches played, win rate %, etc.
};

export type PodHighlightLossStreak = {
  player: Player;
  streak: number;
};

export type PodHighlightWinconCount = {
  player: Player;
  wins: number;
};

/** Biggest single commander_damage event in scope. We attribute the
 *  dealer by joining the source commander back to the participation in
 *  the same match whose deck used it (primary or partner). */
export type PodHighlightBiggestHit = {
  damage: number;
  dealer_player: Player | null;
  dealer_deck: Deck | null;
  dealer_commander: Commander | null;
  receiver_player: Player | null;
};

/** Largest swing of life on a single participation in a single turn. */
export type PodHighlightLifeSwing = {
  player: Player;
  /** Signed delta (negative = lost, positive = gained) of the most extreme single turn. */
  swing: number;
  /** Turn number on the participation (1-indexed). */
  turn: number;
};

export type PodHighlights = {
  /** Completed matches in this pod. Drives the leading carousel slide. */
  total_matches: number;
  /** Distinct players who appear in at least one completed pod match. */
  total_players: number;
  most_active_player: PodHighlightPlayer | null;
  top_winner: (PodHighlightPlayer & { wins: number; total: number }) | null;
  total_play_time_seconds: number;
  /** Player with the most wins by win_condition='infect'. */
  most_infect_wins: PodHighlightWinconCount | null;
  /** Player with the most wins by win_condition='combo'. */
  most_combo_wins: PodHighlightWinconCount | null;
  /** Largest single commander_damage event with dealer + receiver attribution. */
  biggest_hit: PodHighlightBiggestHit | null;
  /** Player who has healed the most life across all in-scope matches. */
  highest_total_healed: (PodHighlightPlayer & { healed: number }) | null;
  /** Aggregate life lost across every participation in scope (positive number). */
  total_life_lost_pod: number;
  /** Player+turn with the biggest single-turn life swing (absolute value). */
  largest_life_swing_in_turn: PodHighlightLifeSwing | null;
  /** Longest single completed match in seconds. */
  longest_match_seconds: number;
  /** Average turn (across matches) when the first "violent" event occurs.
   *  Violent = any life_change <= -8 OR commander_damage >= 5. null when
   *  no match in scope has logged violence yet. */
  avg_violent_turn: number | null;
  /** Average wall-time per turn, in seconds, across every completed
   *  (turn_passed-with-duration) turn in scope. null when no timed turns
   *  have been recorded yet. */
  avg_turn_time_seconds: number | null;
  /** Player with the longest CURRENT (active, not all-time) losing run as
   *  of the most recent in-scope match. null when nobody is on a streak. */
  current_loss_streak: PodHighlightLossStreak | null;
};

export type GetPodHighlightsResult = { data: PodHighlights };

const TOP_WINNER_MIN_MATCHES = 3;

/**
 * Compute Stats-screen highlights for either a pod or the caller's personal
 * scope. Returns nulls for any highlight that doesn't have enough data yet
 * (e.g. top_winner needs ≥3 matches per player, deck records need at least
 * one tracked turn_passed event). The caller can show / skip slides
 * accordingly.
 *
 *  - Pod scope (`groupId != null`): the route layer must have already
 *    validated that `userId` is a member of `groupId`.
 *  - Personal scope (`groupId == null`): matches authored by `userId`
 *    (matches.createdBy = userId), same as the personal-scope hero.
 */
export async function getPodHighlights(
  userId: string,
  groupId: string | null,
): Promise<GetPodHighlightsResult> {
  const matchScope = groupId
    ? and(eq(matches.groupId, groupId), eq(matches.status, 'completed'))
    : and(eq(matches.createdBy, userId), eq(matches.status, 'completed'));

  // Fan-out the independent aggregations in parallel.
  const [
    totalMatchRows,
    playerCountRows,
    totalTimeRows,
    winconRows,
    biggestHitRows,
    lossOrderRows,
    healLostRows,
    longestMatchRows,
    rawEventRows,
    playerCountPerMatchRows,
  ] = await Promise.all([
    // Total completed matches in the pod — drives the leading "Total Pod Matches" slide.
    db
      .select({ total: count(matches.id) })
      .from(matches)
      .where(matchScope),

    // Player → match count + wins (for both "most active" and "top winner").
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

    // Sum of completed-match durations (seconds). Uses trailing-gap
    // truncation: if the gap between the last non-undone event and
    // ended_at exceeds 2 hours, the match is treated as ending at the
    // last event (abandoned-then-belatedly-closed matches would otherwise
    // report inflated durations). Mirrors services/matchDuration.ts.
    db
      .select({
        seconds: sql<number>`coalesce(sum(
          extract(epoch from (
            CASE
              WHEN (${matches.endedAt} - COALESCE(last_ev.max_at, ${matches.createdAt})) > INTERVAL '2 hours'
                THEN COALESCE(last_ev.max_at, ${matches.createdAt})
              ELSE ${matches.endedAt}
            END
          ) - ${matches.createdAt})
        ), 0)`,
      })
      .from(matches)
      .leftJoin(
        sql`LATERAL (
          SELECT MAX(created_at) AS max_at
          FROM match_events
          WHERE match_id = ${matches.id} AND is_undone = false
        ) AS last_ev`,
        sql`true`,
      )
      .where(and(matchScope, isNotNull(matches.endedAt))),

    // Per-player win counts grouped by win_condition — feeds both the
    // "Most Infect Wins" and "Most Combo Wins" slides. Joins match_results
    // via the winner participation back to its player.
    db
      .select({
        playerId: participations.playerId,
        winCondition: matchResults.winCondition,
        wins: count(matchResults.matchId),
      })
      .from(matchResults)
      .innerJoin(participations, eq(participations.id, matchResults.winnerParticipationId))
      .innerJoin(matches, eq(matches.id, matchResults.matchId))
      .where(matchScope)
      .groupBy(participations.playerId, matchResults.winCondition),

    // Biggest single commander_damage hit in scope. The receiver lives on
    // participations.id (linked via match_events.participationId); the
    // dealer lives on whichever participation in the same match used the
    // source commander on its deck. We grab the top 1 here and resolve
    // the dealer/receiver in JS below.
    db
      .select({
        matchId: matchEvents.matchId,
        receiverPid: matchEvents.participationId,
        delta: matchEvents.delta,
        commanderId: matchEvents.commanderIdSource,
      })
      .from(matchEvents)
      .innerJoin(matches, eq(matches.id, matchEvents.matchId))
      .where(and(
        matchScope,
        eq(matchEvents.eventType, 'commander_damage'),
        eq(matchEvents.isUndone, false),
        isNotNull(matchEvents.commanderIdSource),
      ))
      .orderBy(desc(matchEvents.delta))
      .limit(1),

    // All participations in pod-completed matches, ordered for streak computation.
    db
      .select({
        playerId: participations.playerId,
        result: participations.result,
        createdAt: matches.createdAt,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(matchScope)
      .orderBy(matches.createdAt),

    // Per-player sum of healing (positive life_change deltas) and total pod
    // life lost (sum of negative life_change deltas, always returned as a
    // positive number). One row per player; aggregate the lost sum after.
    db
      .select({
        playerId: participations.playerId,
        healed: sql<number>`coalesce(sum(case when ${matchEvents.delta} > 0 then ${matchEvents.delta} else 0 end), 0)`,
        lost: sql<number>`coalesce(sum(case when ${matchEvents.delta} < 0 then ${matchEvents.delta} else 0 end), 0)`,
      })
      .from(matchEvents)
      .innerJoin(participations, eq(participations.id, matchEvents.participationId))
      .innerJoin(matches, eq(matches.id, matchEvents.matchId))
      .where(and(
        matchScope,
        eq(matchEvents.eventType, 'life_change'),
        eq(matchEvents.isUndone, false),
      ))
      .groupBy(participations.playerId),

    // Single longest completed match in seconds — same trailing-gap
    // truncation as total_play_time above so a single abandoned match
    // doesn't win "Longest Match".
    db
      .select({
        matchId: matches.id,
        seconds: sql<number>`extract(epoch from (
          CASE
            WHEN (${matches.endedAt} - COALESCE(last_ev.max_at, ${matches.createdAt})) > INTERVAL '2 hours'
              THEN COALESCE(last_ev.max_at, ${matches.createdAt})
            ELSE ${matches.endedAt}
          END
        ) - ${matches.createdAt})`,
      })
      .from(matches)
      .leftJoin(
        sql`LATERAL (
          SELECT MAX(created_at) AS max_at
          FROM match_events
          WHERE match_id = ${matches.id} AND is_undone = false
        ) AS last_ev`,
        sql`true`,
      )
      .where(and(matchScope, isNotNull(matches.endedAt)))
      .orderBy(sql`extract(epoch from (
        CASE
          WHEN (${matches.endedAt} - COALESCE(last_ev.max_at, ${matches.createdAt})) > INTERVAL '2 hours'
            THEN COALESCE(last_ev.max_at, ${matches.createdAt})
          ELSE ${matches.endedAt}
        END
      ) - ${matches.createdAt}) desc`)
      .limit(1),

    // Raw event stream — used for both the largest single-turn life swing
    // and the average violent-turn computation. Ordered by match → time so
    // a single pass can bracket events by turn_passed events on each
    // participation.
    db
      .select({
        matchId: matchEvents.matchId,
        participationId: matchEvents.participationId,
        eventType: matchEvents.eventType,
        delta: matchEvents.delta,
        turnDurationSeconds: matchEvents.turnDurationSeconds,
        createdAt: matchEvents.createdAt,
      })
      .from(matchEvents)
      .innerJoin(matches, eq(matches.id, matchEvents.matchId))
      .where(and(matchScope, eq(matchEvents.isUndone, false)))
      .orderBy(matchEvents.matchId, matchEvents.createdAt),

    // Per-match participation count. Used to convert the global rotation
    // counter (every turn_passed event increments it) into a "round" the
    // players think in (= active player's turn number, since players take
    // turns in clockwise order so round ≈ ceil(rotation / playerCount)).
    db
      .select({
        matchId: participations.matchId,
        players: count(participations.id),
      })
      .from(participations)
      .innerJoin(matches, eq(matches.id, participations.matchId))
      .where(matchScope)
      .groupBy(participations.matchId),
  ]);

  const playerCountByMatch = new Map<string, number>(
    playerCountPerMatchRows.map((r) => [r.matchId, Number(r.players ?? 1)]),
  );
  const rotationToRound = (matchId: string, rotation: number): number => {
    const n = playerCountByMatch.get(matchId) ?? 1;
    return Math.max(1, Math.ceil(rotation / n));
  };

  // ── Most active + top winner ───────────────────────────────────────────────
  let mostActiveRow: { playerId: string; total: number } | null = null;
  let topWinnerRow: { playerId: string; wins: number; total: number; wr: number } | null = null;
  for (const r of playerCountRows) {
    const total = Number(r.total ?? 0);
    const wins = Number(r.wins ?? 0);
    if (!mostActiveRow || total > mostActiveRow.total) {
      mostActiveRow = { playerId: r.playerId, total };
    }
    if (total >= TOP_WINNER_MIN_MATCHES) {
      const wr = wins / total;
      if (!topWinnerRow || wr > topWinnerRow.wr) {
        topWinnerRow = { playerId: r.playerId, wins, total, wr };
      }
    }
  }

  // ── Most infect / combo wins (highest per-player count for each wincon) ──
  let mostInfectRow: { playerId: string; wins: number } | null = null;
  let mostComboRow: { playerId: string; wins: number } | null = null;
  for (const r of winconRows) {
    const wins = Number(r.wins ?? 0);
    if (wins === 0) continue;
    if (r.winCondition === 'infect') {
      if (!mostInfectRow || wins > mostInfectRow.wins) {
        mostInfectRow = { playerId: r.playerId, wins };
      }
    } else if (r.winCondition === 'combo') {
      if (!mostComboRow || wins > mostComboRow.wins) {
        mostComboRow = { playerId: r.playerId, wins };
      }
    }
  }

  // ── Biggest hit (single largest commander_damage event) ───────────────────
  // We have the receiver participation id + the source commander id. To
  // attribute the dealer we look up participations in the same match whose
  // deck uses that commander (primary or partner). Skipped when no events.
  const hitTop = biggestHitRows[0] ?? null;
  let biggestHit: PodHighlightBiggestHit | null = null;
  let hitDealerPid: string | null = null;
  if (hitTop && hitTop.commanderId) {
    const dealerRows = await db
      .select({
        participationId: participations.id,
        playerId: participations.playerId,
        deckId: participations.deckId,
      })
      .from(participations)
      .innerJoin(decks, eq(decks.id, participations.deckId))
      .where(
        and(
          eq(participations.matchId, hitTop.matchId),
          or(eq(decks.commanderId, hitTop.commanderId), eq(decks.commanderId2, hitTop.commanderId)),
        ),
      )
      .limit(1);
    const dealer = dealerRows[0] ?? null;
    biggestHit = {
      damage: Number(hitTop.delta ?? 0),
      dealer_player: null,    // resolved below from playerMap
      dealer_deck: null,      // resolved below from deckMap
      dealer_commander: null, // resolved below from cmdMap
      receiver_player: null,  // resolved below
    };
    hitDealerPid = dealer?.participationId ?? null;
  }

  // ── Current loss streak (per-player ACTIVE run as of most recent match) ──
  // Walk the chronologically-ordered participations, increment on every loss
  // and RESET to zero on any win/draw. At the end of the walk the run map
  // holds each player's CURRENT (not historic) streak. We pick the highest.
  const runsByPlayer = new Map<string, number>();
  for (const r of lossOrderRows) {
    if (r.result === 'lose') {
      runsByPlayer.set(r.playerId, (runsByPlayer.get(r.playerId) ?? 0) + 1);
    } else {
      runsByPlayer.set(r.playerId, 0);
    }
  }
  let lossStreakRow: { playerId: string; streak: number } | null = null;
  for (const [playerId, streak] of runsByPlayer) {
    if (streak < 2) continue; // skip ties / single losses to avoid noise
    if (!lossStreakRow || streak > lossStreakRow.streak) {
      lossStreakRow = { playerId, streak };
    }
  }

  // ── Healed + life-lost aggregation ────────────────────────────────────────
  // healLostRows already groups per player. healed is the positive sum,
  // lost is a negative sum (we'll flip its sign for display).
  let highestHealRow: { playerId: string; healed: number } | null = null;
  let totalLifeLostPod = 0;
  for (const r of healLostRows) {
    const healed = Number(r.healed ?? 0);
    const lost = Number(r.lost ?? 0); // negative or zero
    totalLifeLostPod += -lost; // accumulate positive number
    if (healed > 0 && (!highestHealRow || healed > highestHealRow.healed)) {
      highestHealRow = { playerId: r.playerId, healed };
    }
  }

  // ── Longest match ─────────────────────────────────────────────────────────
  const longestMatchSeconds = Number(longestMatchRows[0]?.seconds ?? 0);

  // ── Single-pass scan over raw events for swing + violent-turn ─────────────
  // For each receiver participation we track the cumulative life delta
  // *per rotation of play* — where a "rotation" is one player's active
  // turn, demarcated by the global turn_passed sequence. Bucketing by
  // the receiver's OWN turn count is wrong: it lumps damage taken on
  // another player's turn into the receiver's previous turn window
  // whenever the receiver doesn't live to start their next turn.
  // Example: Faisan heals +3 +3 on his turn, Gabo's turn starts, Gabo
  // hits him for -34 and he dies. Under the old rule everything went
  // into Faisan:9 = -28; under the new rule the heals stay in
  // Faisan:9 = +6 and the -34 lands in Faisan:10 = -34, giving the
  // correct swing of -34.
  //
  // Both life_change AND commander_damage contribute (cmd_damage delta
  // is stored positive but subtracts from life via the participation
  // snapshot, so we negate it).
  //
  // The earliest rotation in each match where any "violent" event
  // happens (life_change <= -8 OR commander_damage >= 5) feeds the
  // average-violent-turn average.
  // `turn` here is the GLOBAL ROTATION at the time of the swing; we
  // convert to a player-round at return time using playerCountByMatch.
  let largestSwingRow: { matchId: string; participationId: string; swing: number; turn: number } | null = null;
  const firstViolentTurnByMatch = new Map<string, number>();
  const turnDeltas = new Map<string, number>(); // `${pid}:${rotation}` → cumulative life delta
  let globalRotation = 1;
  let lastMatchId: string | null = null;

  // Avg turn time across all completed turns in scope. Duration on a
  // turn_passed event belongs to the OUTGOING player — we don't need
  // to know who that is for the pod-wide average; we just sum durations
  // and divide by the count of timed turns.
  let turnDurationTotal = 0;
  let turnDurationCount = 0;

  for (const e of rawEventRows) {
    // Reset per-match state when matchId rolls over. The new match
    // starts at rotation 1 (events before any turn_passed bucket into 1).
    if (e.matchId !== lastMatchId) {
      turnDeltas.clear();
      globalRotation = 1;
      lastMatchId = e.matchId;
    }

    if (e.eventType === 'turn_passed') {
      // A turn just ended → the next rotation begins for the player
      // taking the new turn. Increment regardless of whose turn it is.
      globalRotation += 1;
      if (typeof e.turnDurationSeconds === 'number') {
        turnDurationTotal += e.turnDurationSeconds;
        turnDurationCount += 1;
      }
      continue;
    }

    const rotation = globalRotation;
    const key = `${e.participationId}:${rotation}`;

    if (e.eventType === 'life_change') {
      const next = (turnDeltas.get(key) ?? 0) + e.delta;
      turnDeltas.set(key, next);
      if (
        !largestSwingRow ||
        Math.abs(next) > Math.abs(largestSwingRow.swing)
      ) {
        largestSwingRow = { matchId: e.matchId, participationId: e.participationId, swing: next, turn: rotation };
      }
      if (e.delta <= -8 && !firstViolentTurnByMatch.has(e.matchId)) {
        firstViolentTurnByMatch.set(e.matchId, rotation);
      }
    } else if (e.eventType === 'commander_damage') {
      const next = (turnDeltas.get(key) ?? 0) - e.delta;
      turnDeltas.set(key, next);
      if (
        !largestSwingRow ||
        Math.abs(next) > Math.abs(largestSwingRow.swing)
      ) {
        largestSwingRow = { matchId: e.matchId, participationId: e.participationId, swing: next, turn: rotation };
      }
      if (e.delta >= 5 && !firstViolentTurnByMatch.has(e.matchId)) {
        firstViolentTurnByMatch.set(e.matchId, rotation);
      }
    }
  }

  // Convert each match's "first violent rotation" to a round before
  // averaging — players think in rounds (everyone's turn N), not in
  // global rotation counts which scale with pod size.
  let avgViolentTurn: number | null = null;
  if (firstViolentTurnByMatch.size > 0) {
    const rounds: number[] = [];
    for (const [matchId, rotation] of firstViolentTurnByMatch) {
      rounds.push(rotationToRound(matchId, rotation));
    }
    const sum = rounds.reduce((a, b) => a + b, 0);
    avgViolentTurn = Math.round(sum / rounds.length);
  }

  // Pod-wide average turn time, in seconds. Null when no timed turns have
  // been recorded yet (pre-feature matches, or matches with no completed
  // turn_passed events).
  const avgTurnTimeSeconds: number | null = turnDurationCount > 0
    ? Math.round(turnDurationTotal / turnDurationCount)
    : null;

  // ── Resolve player + deck + commander objects in one pass each ────────────
  // For biggest_hit we need an extra join: receiver participation → its player,
  // and dealer participation (from the lookup above) → its player + deck.
  const playerIdsNeeded = new Set<string>();
  if (mostActiveRow) playerIdsNeeded.add(mostActiveRow.playerId);
  if (topWinnerRow) playerIdsNeeded.add(topWinnerRow.playerId);
  if (lossStreakRow) playerIdsNeeded.add(lossStreakRow.playerId);
  if (mostInfectRow) playerIdsNeeded.add(mostInfectRow.playerId);
  if (mostComboRow) playerIdsNeeded.add(mostComboRow.playerId);
  if (highestHealRow) playerIdsNeeded.add(highestHealRow.playerId);

  // The largest life swing is keyed by participation_id; we need to resolve
  // it to a player by joining through the participations table. We'll do
  // that with a small targeted lookup below.

  // For biggest hit, fetch the receiver participation (→ playerId) and the
  // dealer participation (→ playerId + deckId). receiverPid + hitDealerPid
  // both live on the participations table. We piggy-back the swing
  // participation lookup onto the same query.
  const lookupParticipationIds: string[] = [];
  if (hitTop) lookupParticipationIds.push(hitTop.receiverPid);
  if (hitDealerPid) lookupParticipationIds.push(hitDealerPid);
  if (largestSwingRow) lookupParticipationIds.push(largestSwingRow.participationId);

  const hitPartRows = lookupParticipationIds.length
    ? await db
        .select({ id: participations.id, playerId: participations.playerId, deckId: participations.deckId })
        .from(participations)
        .where(inArray(participations.id, lookupParticipationIds))
    : [];
  const hitPartMap = new Map(hitPartRows.map((p) => [p.id, p]));
  for (const p of hitPartRows) playerIdsNeeded.add(p.playerId);

  const deckIdsNeeded = new Set<string>();
  if (hitDealerPid) {
    const dealerPart = hitPartMap.get(hitDealerPid);
    if (dealerPart) deckIdsNeeded.add(dealerPart.deckId);
  }

  const [playerRows, deckRows] = await Promise.all([
    playerIdsNeeded.size
      ? db.select().from(players).where(inArray(players.id, [...playerIdsNeeded]))
      : Promise.resolve([] as Player[]),
    deckIdsNeeded.size
      ? db.select().from(decks).where(inArray(decks.id, [...deckIdsNeeded]))
      : Promise.resolve([] as Deck[]),
  ]);
  const playerMap = new Map(playerRows.map((p) => [p.id, p]));
  const deckMap = new Map(deckRows.map((d) => [d.id, d]));

  // Commanders referenced by the biggest-hit dealer deck OR the source commander.
  const cmdIds = new Set<string>();
  if (hitTop?.commanderId) cmdIds.add(hitTop.commanderId);
  const cmdRows = cmdIds.size
    ? await db.select().from(commanders).where(inArray(commanders.id, [...cmdIds]))
    : [];
  const cmdMap = new Map(cmdRows.map((c) => [c.id, c]));

  // Stitch biggest_hit together now that all the lookups resolved.
  if (biggestHit && hitTop) {
    const receiverPart = hitPartMap.get(hitTop.receiverPid);
    const dealerPart = hitDealerPid ? hitPartMap.get(hitDealerPid) : null;
    biggestHit.dealer_player = dealerPart ? playerMap.get(dealerPart.playerId) ?? null : null;
    biggestHit.dealer_deck = dealerPart ? deckMap.get(dealerPart.deckId) ?? null : null;
    biggestHit.dealer_commander = hitTop.commanderId ? cmdMap.get(hitTop.commanderId) ?? null : null;
    biggestHit.receiver_player = receiverPart ? playerMap.get(receiverPart.playerId) ?? null : null;
  }

  function winconHighlight(row: { playerId: string; wins: number } | null): PodHighlightWinconCount | null {
    if (!row) return null;
    const player = playerMap.get(row.playerId);
    if (!player) return null;
    return { player, wins: row.wins };
  }

  return {
    data: {
      total_matches: Number(totalMatchRows[0]?.total ?? 0),
      total_players: playerCountRows.length,
      most_active_player: mostActiveRow && playerMap.get(mostActiveRow.playerId)
        ? { player: playerMap.get(mostActiveRow.playerId)!, value: mostActiveRow.total }
        : null,
      top_winner: topWinnerRow && playerMap.get(topWinnerRow.playerId)
        ? {
            player: playerMap.get(topWinnerRow.playerId)!,
            value: Math.round(topWinnerRow.wr * 1000) / 10,
            wins: topWinnerRow.wins,
            total: topWinnerRow.total,
          }
        : null,
      total_play_time_seconds: Number(totalTimeRows[0]?.seconds ?? 0),
      most_infect_wins: winconHighlight(mostInfectRow),
      most_combo_wins: winconHighlight(mostComboRow),
      biggest_hit: biggestHit,
      highest_total_healed: highestHealRow && playerMap.get(highestHealRow.playerId)
        ? { player: playerMap.get(highestHealRow.playerId)!, value: highestHealRow.healed, healed: highestHealRow.healed }
        : null,
      total_life_lost_pod: Math.round(totalLifeLostPod),
      largest_life_swing_in_turn: largestSwingRow
        ? (() => {
            const part = hitPartMap.get(largestSwingRow.participationId);
            const player = part ? playerMap.get(part.playerId) : null;
            if (!player) return null;
            // turn here is reported as the round (active player's turn N),
            // not the global rotation — matches player intuition.
            const round = rotationToRound(largestSwingRow.matchId, largestSwingRow.turn);
            return { player, swing: largestSwingRow.swing, turn: round };
          })()
        : null,
      longest_match_seconds: Math.round(longestMatchSeconds),
      avg_violent_turn: avgViolentTurn,
      avg_turn_time_seconds: avgTurnTimeSeconds,
      current_loss_streak: lossStreakRow && playerMap.get(lossStreakRow.playerId)
        ? { player: playerMap.get(lossStreakRow.playerId)!, streak: lossStreakRow.streak }
        : null,
    },
  };
}
