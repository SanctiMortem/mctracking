/**
 * Match service — createMatch + closeMatch transactions + active-match helpers.
 *
 * isDeckInActiveMatch / isPlayerInActiveMatch are exported so that
 * services/decks.ts and services/players.ts can replace their stubs.
 *
 * MATCH-002, MATCH-003 (EPIC-02)
 */
import { and, eq, inArray, isNull, ne } from 'drizzle-orm';

import { db } from '@/services/db';
import { decks, matchResults, matches, participations } from '@/db/schema';
import type { Match, MatchResult, Participation } from '@/db/index';

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

  // 5. Transaction: match + participations
  const result = await db.transaction(async (tx) => {
    const [match] = await tx
      .insert(matches)
      .values({ createdBy: userId })
      .returning();

    const inserted = await tx
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

    return { match, participations: inserted };
  });

  return { data: result };
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

  // 5. Transaction
  const now = new Date();

  const closed = await db.transaction(async (tx) => {
    // Update match status + ended_at
    const newStatus = input.action === 'abandon' ? 'abandoned' : 'completed';
    const [updatedMatch] = await tx
      .update(matches)
      .set({ status: newStatus, endedAt: now })
      .where(eq(matches.id, matchId))
      .returning();

    let matchResult: MatchResult | null = null;

    if (input.action === 'win') {
      // Mark winner
      await tx
        .update(participations)
        .set({ result: 'win' })
        .where(eq(participations.id, input.winner_participation_id));

      // Mark losers
      await tx
        .update(participations)
        .set({ result: 'lose' })
        .where(and(eq(participations.matchId, matchId), ne(participations.id, input.winner_participation_id)));

      // Create MatchResult
      const [mr] = await tx
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
      await tx
        .update(participations)
        .set({ result: 'draw' })
        .where(eq(participations.matchId, matchId));

      // Create MatchResult (no winner, is_draw=true)
      const [mr] = await tx
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

    return { match: updatedMatch, result: matchResult };
  });

  return { data: closed };
}
