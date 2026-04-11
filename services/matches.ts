/**
 * Match service — createMatch transaction + active-match helpers.
 *
 * isDeckInActiveMatch / isPlayerInActiveMatch are exported so that
 * services/decks.ts and services/players.ts can replace their stubs.
 *
 * MATCH-002 (EPIC-02)
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/services/db';
import { decks, matches, participations } from '@/db/schema';
import type { Match, Participation } from '@/db/index';

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
