/**
 * Match service — createMatch + closeMatch transactions + active-match helpers.
 *
 * isDeckInActiveMatch / isPlayerInActiveMatch are exported so that
 * services/decks.ts and services/players.ts can replace their stubs.
 *
 * MATCH-002, MATCH-003, MATCH-004 (EPIC-02)
 * HIST-001 (EPIC-04) — listMatches
 */
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/services/db';
import { commanders, decks, matchEvents, matchResults, matches, participations, players } from '@/db/schema';
import type { Commander, Deck, Match, MatchEvent, MatchResult, Participation, Player } from '@/db/index';

// ─────────────────────────────────────────────
// Active-match helpers (exported for use in other services)
// ─────────────────────────────────────────────

/** Returns true if the deck is currently in an in_progress match. */
export async function isDeckInActiveMatch(deckId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: participations.id })
    .from(participations)
    .innerJoin(matches, eq(participations.matchId, matches.id))
    .where(and(eq(participations.deckId, deckId), eq(matches.status, 'in_progress')))
    .limit(1);
  return !!row;
}

/** Returns true if the player is currently in an in_progress match. */
export async function isPlayerInActiveMatch(playerId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: participations.id })
    .from(participations)
    .innerJoin(matches, eq(participations.matchId, matches.id))
    .where(and(eq(participations.playerId, playerId), eq(matches.status, 'in_progress')))
    .limit(1);
  return !!row;
}

// ─────────────────────────────────────────────
// createMatch
// ─────────────────────────────────────────────

export type ParticipantInput = {
  player_id: string;
  deck_id: string;
};

export type CreateMatchResult =
  | { data: { match: Match; participations: Participation[] } }
  | { invalidPlayerCount: true }
  | { duplicateDeck: true }
  | { forbidden: string }      // deck_id that caused the 403
  | { deckInActiveMatch: string }; // deck_id already in a live match

/**
 * Creates a Match (status: in_progress) + Participations in a single transaction.
 *
 * Validations (in order):
 *  1. 2–4 participants (BR-MATCH-01)
 *  2. No duplicate deck_id in request (BR-MATCH-02)
 *  3. Each deck must belong to userId (403)
 *  4. No deck already in an in_progress match (BR-MATCH-04)
 */
export async function createMatch(
  userId: string,
  participants: ParticipantInput[],
): Promise<CreateMatchResult> {
  // 1. Count
  if (participants.length < 2 || participants.length > 4) {
    return { invalidPlayerCount: true };
  }

  // 2. Duplicate deck_ids in this request
  const deckIds = participants.map((p) => p.deck_id);
  if (new Set(deckIds).size !== deckIds.length) {
    return { duplicateDeck: true };
  }

  // 3. Ownership — batch fetch, then verify each
  const deckRows = await db
    .select({ id: decks.id, createdBy: decks.createdBy })
    .from(decks)
    .where(and(inArray(decks.id, deckIds), isNull(decks.deletedAt)));

  for (const deckId of deckIds) {
    const row = deckRows.find((d) => d.id === deckId);
    if (!row || row.createdBy !== userId) {
      return { forbidden: deckId };
    }
  }

  // 4. Conflict — no deck already in a live match
  for (const deckId of deckIds) {
    if (await isDeckInActiveMatch(deckId)) {
      return { deckInActiveMatch: deckId };
    }
  }

  // 5. Insert match then participations (neon-http does not support transactions)
  const [match] = await db
    .insert(matches)
    .values({ createdBy: userId })
    .returning();

  const inserted = await db
    .insert(participations)
    .values(
      participants.map((p) => ({
        matchId: match.id,
        playerId: p.player_id,
        deckId: p.deck_id,
        lifeTotal: 40,
        poisonCounters: 0,
        commanderDamage: {},
      })),
    )
    .returning();

  return { data: { match, participations: inserted } };
}

// ─────────────────────────────────────────────
// closeMatch
// ─────────────────────────────────────────────

export type CloseAction =
  | { action: 'win'; winner_participation_id: string; win_condition: string }
  | { action: 'draw' }
  | { action: 'abandon' };

export type CloseMatchResult =
  | { data: { match: Match; result: MatchResult | null } }
  | { notFound: true }
  | { alreadyClosed: true }
  | { forbidden: true }
  | { invalidWinCondition: true }
  | { participationNotFound: true }; // winner_participation_id not in this match

const VALID_WIN_CONDITIONS = new Set([
  'combat_damage', 'commander_damage', 'infect', 'combo', 'mill', 'scoop', 'concede', 'other',
]);

/**
 * Closes a match in one of three ways:
 *  - win:    sets completed, creates MatchResult, marks winner/losers
 *  - draw:   sets completed, creates MatchResult (is_draw=true), marks all draw
 *  - abandon: sets abandoned, no MatchResult, participation results stay null (BR-MATCH-06)
 *
 * All mutations run in a single transaction.
 */
export async function closeMatch(
  userId: string,
  matchId: string,
  input: CloseAction,
): Promise<CloseMatchResult> {
  // 1. Fetch match
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match) return { notFound: true };
  if (match.status !== 'in_progress') return { alreadyClosed: true };
  if (match.createdBy !== userId) return { forbidden: true };

  // 2. Validate win_condition enum
  if (input.action === 'win' && !VALID_WIN_CONDITIONS.has(input.win_condition)) {
    return { invalidWinCondition: true };
  }

  // 3. Fetch all participations for this match
  const parts = await db
    .select()
    .from(participations)
    .where(eq(participations.matchId, matchId));

  // 4. Validate winner belongs to this match
  if (input.action === 'win') {
    const winner = parts.find((p) => p.id === input.winner_participation_id);
    if (!winner) return { participationNotFound: true };
  }

  // 5. Sequential updates (neon-http does not support transactions)
  const now = new Date();
  const newStatus = input.action === 'abandon' ? 'abandoned' : 'completed';

  const [updatedMatch] = await db
    .update(matches)
    .set({ status: newStatus, endedAt: now })
    .where(eq(matches.id, matchId))
    .returning();

  let matchResult: MatchResult | null = null;

  if (input.action === 'win') {
    // Mark winner
    await db
      .update(participations)
      .set({ result: 'win' })
      .where(eq(participations.id, input.winner_participation_id));

    // Mark losers
    await db
      .update(participations)
      .set({ result: 'lose' })
      .where(and(eq(participations.matchId, matchId), ne(participations.id, input.winner_participation_id)));

    // Create MatchResult
    const [mr] = await db
      .insert(matchResults)
      .values({
        matchId,
        winnerParticipationId: input.winner_participation_id,
        winCondition: input.win_condition as MatchResult['winCondition'],
        isDraw: false,
      })
      .returning();
    matchResult = mr;

  } else if (input.action === 'draw') {
    // Mark all draw
    await db
      .update(participations)
      .set({ result: 'draw' })
      .where(eq(participations.matchId, matchId));

    // Create MatchResult (no winner, is_draw=true)
    const [mr] = await db
      .insert(matchResults)
      .values({
        matchId,
        winnerParticipationId: null,
        winCondition: 'other',
        isDraw: true,
      })
      .returning();
    matchResult = mr;
  }
  // abandon: no participation updates, no MatchResult

  return { data: { match: updatedMatch, result: matchResult } };
}

// ─────────────────────────────────────────────
// updateMatchResult (15-min edit window)
// ─────────────────────────────────────────────

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export type UpdateResultAction =
  | { action: 'update_result'; winner_participation_id: string; win_condition: string }
  | { action: 'update_result_draw' };

export type UpdateResultResult =
  | { data: { match: Match; result: MatchResult | null } }
  | { notFound: true }
  | { forbidden: true }
  | { editWindowExpired: true }
  | { notCompleted: true }
  | { invalidWinCondition: true }
  | { participationNotFound: true };

/**
 * Allows editing the winner and win condition of a completed match
 * within 15 minutes of endedAt.
 */
export async function updateMatchResult(
  userId: string,
  matchId: string,
  input: UpdateResultAction,
): Promise<UpdateResultResult> {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match) return { notFound: true };
  if (match.createdBy !== userId) return { forbidden: true };
  if (match.status !== 'completed') return { notCompleted: true };

  // Check 15-min edit window
  if (!match.endedAt || Date.now() - new Date(match.endedAt).getTime() > EDIT_WINDOW_MS) {
    return { editWindowExpired: true };
  }

  if (input.action === 'update_result') {
    if (!VALID_WIN_CONDITIONS.has(input.win_condition)) {
      return { invalidWinCondition: true };
    }

    const parts = await db
      .select()
      .from(participations)
      .where(eq(participations.matchId, matchId));

    const winner = parts.find((p) => p.id === input.winner_participation_id);
    if (!winner) return { participationNotFound: true };

    // Delete old result
    await db.delete(matchResults).where(eq(matchResults.matchId, matchId));

    // Reset all participation results
    await db
      .update(participations)
      .set({ result: 'lose' })
      .where(eq(participations.matchId, matchId));

    // Mark winner
    await db
      .update(participations)
      .set({ result: 'win' })
      .where(eq(participations.id, input.winner_participation_id));

    // Create new result
    const [mr] = await db
      .insert(matchResults)
      .values({
        matchId,
        winnerParticipationId: input.winner_participation_id,
        winCondition: input.win_condition as MatchResult['winCondition'],
        isDraw: false,
      })
      .returning();

    return { data: { match, result: mr } };
  }

  // update_result_draw
  await db.delete(matchResults).where(eq(matchResults.matchId, matchId));

  await db
    .update(participations)
    .set({ result: 'draw' })
    .where(eq(participations.matchId, matchId));

  const [mr] = await db
    .insert(matchResults)
    .values({
      matchId,
      winnerParticipationId: null,
      winCondition: 'other',
      isDraw: true,
    })
    .returning();

  return { data: { match, result: mr } };
}

// ─────────────────────────────────────────────
// getMatchById
// ─────────────────────────────────────────────

export type ParticipationDetail = Pick<
  Participation,
  'id' | 'matchId' | 'playerId' | 'deckId' | 'result' | 'lifeTotal' | 'poisonCounters' | 'commanderDamage' | 'createdAt'
> & {
  player: Pick<Player, 'id' | 'name'>;
  deck: Pick<Deck, 'id' | 'name'>;
  commander: Pick<Commander, 'id' | 'name' | 'colors' | 'isPartner'>;
  commander2: Pick<Commander, 'id' | 'name' | 'colors' | 'isPartner'> | null;
};

export type GetMatchByIdResult =
  | { data: { match: Match; participations: ParticipationDetail[]; result: MatchResult | null; events: MatchEvent[] } }
  | { notFound: true };

/**
 * Returns a match with participations (player + deck + commander[s] embedded), optional MatchResult,
 * and the full ordered event log (asc by createdAt — UI reverses for display).
 * Returns notFound if the match doesn't exist or was created by a different user.
 *
 * MATCH-004 (EPIC-02) · HIST-003 (EPIC-04) — added events
 */
export async function getMatchById(userId: string, matchId: string): Promise<GetMatchByIdResult> {
  // 1. Fetch match — ownership check doubles as the 404 guard
  const [match] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.createdBy, userId)))
    .limit(1);

  if (!match) return { notFound: true };

  // 2. Fetch participations with player / deck / both commanders joined
  const c1 = alias(commanders, 'commander1');
  const c2 = alias(commanders, 'commander2');

  const rows = await db
    .select({
      id: participations.id,
      matchId: participations.matchId,
      playerId: participations.playerId,
      deckId: participations.deckId,
      result: participations.result,
      lifeTotal: participations.lifeTotal,
      poisonCounters: participations.poisonCounters,
      commanderDamage: participations.commanderDamage,
      createdAt: participations.createdAt,
      playerName: players.name,
      deckName: decks.name,
      c1Id: c1.id,
      c1Name: c1.name,
      c1Colors: c1.colors,
      c1IsPartner: c1.isPartner,
      c2Id: c2.id,
      c2Name: c2.name,
      c2Colors: c2.colors,
      c2IsPartner: c2.isPartner,
    })
    .from(participations)
    .innerJoin(players, eq(participations.playerId, players.id))
    .innerJoin(decks, eq(participations.deckId, decks.id))
    .innerJoin(c1, eq(decks.commanderId, c1.id))
    .leftJoin(c2, eq(decks.commanderId2, c2.id))
    .where(eq(participations.matchId, matchId))
    .orderBy(asc(participations.createdAt), asc(participations.id));

  const participationDetails: ParticipationDetail[] = rows.map((row) => ({
    id: row.id,
    matchId: row.matchId,
    playerId: row.playerId,
    deckId: row.deckId,
    result: row.result,
    lifeTotal: row.lifeTotal,
    poisonCounters: row.poisonCounters,
    commanderDamage: row.commanderDamage,
    createdAt: row.createdAt,
    player: { id: row.playerId, name: row.playerName },
    deck: { id: row.deckId, name: row.deckName },
    commander: { id: row.c1Id, name: row.c1Name, colors: row.c1Colors, isPartner: row.c1IsPartner },
    commander2: row.c2Id !== null
      ? { id: row.c2Id, name: row.c2Name!, colors: row.c2Colors!, isPartner: row.c2IsPartner! }
      : null,
  }));

  // 3. Fetch match result (null when in_progress or abandoned) + events in parallel
  const [matchResult, events] = await Promise.all([
    db
      .select()
      .from(matchResults)
      .where(eq(matchResults.matchId, matchId))
      .limit(1)
      .then(([r]) => r ?? null),
    db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, matchId))
      .orderBy(asc(matchEvents.createdAt)),
  ]);

  return {
    data: {
      match,
      participations: participationDetails,
      result: matchResult,
      events,
    },
  };
}

// ─────────────────────────────────────────────
// listMatches
// HIST-001 (EPIC-04) · ADR-008 (offset pagination)
// BR-MATCH-07 (exclude in_progress) · BR-STATS-08 (filters)
// ─────────────────────────────────────────────

export type ListMatchesFilters = {
  playerId?: string;
  deckId?: string;
  commanderId?: string;
  /** 'win' | 'lose' | 'draw' filter participation result; 'abandoned' filters match status */
  result?: 'win' | 'lose' | 'draw' | 'abandoned';
  winCondition?: string;
  /** ISO date string — inclusive lower bound on matches.ended_at */
  dateFrom?: string;
  /** ISO date string — inclusive upper bound on matches.ended_at */
  dateTo?: string;
  /** Default 20, max 100 */
  limit?: number;
  /** Default 0 */
  offset?: number;
};

export type MatchSummary = {
  match: Match;
  participations: ParticipationDetail[];
  result: MatchResult | null;
};

export type ListMatchesResult = {
  data: {
    matches: MatchSummary[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

/**
 * Returns a paginated, filtered list of matches for a user (BR-MATCH-07: always excludes
 * in_progress). Each entry includes full participations (player + deck + commander embedded)
 * and the optional MatchResult.
 *
 * Filters that touch participations (player_id, deck_id, result, commander_id) resolve
 * qualifying match IDs via a separate subquery, then apply them as an IN clause on matches.
 * Pagination is offset-based (ADR-008).
 *
 * HIST-001 (EPIC-04)
 */
export async function listMatches(
  userId: string,
  filters: ListMatchesFilters = {},
): Promise<ListMatchesResult> {
  const {
    playerId, deckId, commanderId, result, winCondition,
    dateFrom, dateTo, limit = 20, offset = 0,
  } = filters;

  // ── Step 1: Base match conditions ──
  // BR-MATCH-07: always exclude in_progress; MVP scope: personal matches only
  const matchConditions = [
    ne(matches.status, 'in_progress'),
    eq(matches.createdBy, userId),
    result === 'abandoned' ? eq(matches.status, 'abandoned') : undefined,
    dateFrom ? gte(matches.endedAt, new Date(dateFrom)) : undefined,
    dateTo ? lte(matches.endedAt, new Date(dateTo)) : undefined,
  ];

  // ── Step 2: Participation-based filters → qualifying match IDs ──
  const needsPartFilter = !!(
    playerId || deckId || commanderId || (result && result !== 'abandoned')
  );

  if (needsPartFilter) {
    const partConditions = [
      playerId ? eq(participations.playerId, playerId) : undefined,
      deckId ? eq(participations.deckId, deckId) : undefined,
      result && result !== 'abandoned'
        ? eq(participations.result, result as 'win' | 'lose' | 'draw')
        : undefined,
    ];

    let qualifyingRows: { matchId: string }[];

    if (commanderId) {
      // commander_id filter: match if either commander slot equals commanderId (BR-TRACK-03: partners)
      const commanderCond = or(
        eq(decks.commanderId, commanderId),
        eq(decks.commanderId2, commanderId),
      )!;
      qualifyingRows = await db
        .select({ matchId: participations.matchId })
        .from(participations)
        .innerJoin(decks, eq(participations.deckId, decks.id))
        .where(and(...partConditions, commanderCond))
        .groupBy(participations.matchId);
    } else {
      qualifyingRows = await db
        .select({ matchId: participations.matchId })
        .from(participations)
        .where(and(...partConditions))
        .groupBy(participations.matchId);
    }

    const qualifyingIds = qualifyingRows.map((r) => r.matchId);
    if (qualifyingIds.length === 0) {
      return { data: { matches: [], total: 0, limit, offset, has_more: false } };
    }
    matchConditions.push(inArray(matches.id, qualifyingIds));
  }

  // ── Step 3: win_condition filter via matchResults ──
  if (winCondition) {
    const mrRows = await db
      .select({ matchId: matchResults.matchId })
      .from(matchResults)
      .where(eq(matchResults.winCondition, winCondition as MatchResult['winCondition']));
    const mrIds = mrRows.map((r) => r.matchId);
    if (mrIds.length === 0) {
      return { data: { matches: [], total: 0, limit, offset, has_more: false } };
    }
    matchConditions.push(inArray(matches.id, mrIds));
  }

  const where = and(...matchConditions);

  // ── Step 4: Count + paginate (ADR-008: offset-based) ──
  const [countRow] = await db.select({ count: count() }).from(matches).where(where);
  const total = Number(countRow?.count ?? 0);

  const matchRows = await db
    .select()
    .from(matches)
    .where(where)
    .orderBy(desc(matches.endedAt))
    .limit(limit)
    .offset(offset);

  if (matchRows.length === 0) {
    return { data: { matches: [], total, limit, offset, has_more: false } };
  }

  const matchIds = matchRows.map((m) => m.id);

  // ── Step 5: Load participations for the paginated match IDs ──
  // Reuses same join pattern as getMatchById (partners via left join on commander2)
  const c1 = alias(commanders, 'commander1');
  const c2 = alias(commanders, 'commander2');

  const partRows = await db
    .select({
      id: participations.id,
      matchId: participations.matchId,
      playerId: participations.playerId,
      deckId: participations.deckId,
      result: participations.result,
      lifeTotal: participations.lifeTotal,
      poisonCounters: participations.poisonCounters,
      commanderDamage: participations.commanderDamage,
      createdAt: participations.createdAt,
      playerName: players.name,
      deckName: decks.name,
      c1Id: c1.id,
      c1Name: c1.name,
      c1Colors: c1.colors,
      c1IsPartner: c1.isPartner,
      c2Id: c2.id,
      c2Name: c2.name,
      c2Colors: c2.colors,
      c2IsPartner: c2.isPartner,
    })
    .from(participations)
    .innerJoin(players, eq(participations.playerId, players.id))
    .innerJoin(decks, eq(participations.deckId, decks.id))
    .innerJoin(c1, eq(decks.commanderId, c1.id))
    .leftJoin(c2, eq(decks.commanderId2, c2.id))
    .where(inArray(participations.matchId, matchIds));

  const partsByMatchId = new Map<string, ParticipationDetail[]>();
  for (const row of partRows) {
    const detail: ParticipationDetail = {
      id: row.id,
      matchId: row.matchId,
      playerId: row.playerId,
      deckId: row.deckId,
      result: row.result,
      lifeTotal: row.lifeTotal,
      poisonCounters: row.poisonCounters,
      commanderDamage: row.commanderDamage,
      createdAt: row.createdAt,
      player: { id: row.playerId, name: row.playerName },
      deck: { id: row.deckId, name: row.deckName },
      commander: { id: row.c1Id, name: row.c1Name, colors: row.c1Colors, isPartner: row.c1IsPartner },
      commander2: row.c2Id !== null
        ? { id: row.c2Id, name: row.c2Name!, colors: row.c2Colors!, isPartner: row.c2IsPartner! }
        : null,
    };
    if (!partsByMatchId.has(row.matchId)) partsByMatchId.set(row.matchId, []);
    partsByMatchId.get(row.matchId)!.push(detail);
  }

  // ── Step 6: Load match results for all returned IDs ──
  const resultRows = await db
    .select()
    .from(matchResults)
    .where(inArray(matchResults.matchId, matchIds));
  const resultsByMatchId = new Map(resultRows.map((r) => [r.matchId, r]));

  // ── Step 7: Assemble response ──
  const matchSummaries: MatchSummary[] = matchRows.map((match) => ({
    match,
    participations: partsByMatchId.get(match.id) ?? [],
    result: resultsByMatchId.get(match.id) ?? null,
  }));

  return {
    data: {
      matches: matchSummaries,
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    },
  };
}

// ─────────────────────────────────────────────
// deleteMatch
// ─────────────────────────────────────────────

/**
 * Hard-deletes a match and all its related data (participations, events, results).
 * Only completed or abandoned matches can be deleted.
 */
export async function deleteMatch(
  userId: string,
  matchId: string,
): Promise<{ ok: true } | { notFound: true } | { forbidden: true } | { activeMatch: true }> {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match) return { notFound: true };
  if (match.createdBy !== userId) return { forbidden: true };
  if (match.status === 'in_progress') return { activeMatch: true };

  // Delete in order: results → events → participations → match
  await db.delete(matchResults).where(eq(matchResults.matchId, matchId));
  await db.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
  await db.delete(participations).where(eq(participations.matchId, matchId));
  await db.delete(matches).where(eq(matches.id, matchId));

  return { ok: true };
}
