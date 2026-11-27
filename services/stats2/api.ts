/**
 * Stats v2 — what the /api/stats/v2/* routes call.
 *
 * ⚠️ Server-only. Each function loads the matches of its scope (read-only),
 *    runs the pure calculations and returns the payload from contract.ts.
 *    Routes do authentication and pod-membership checks; entity visibility
 *    uses the same helpers as the current stats (services/stats.ts).
 */
import { and, eq, isNull } from 'drizzle-orm';

import { decks, groupMembers, players } from '@/db/schema';
import { db } from '@/services/db';
import { userCanViewDeck, userCanViewPlayer } from '@/services/stats';

import type { DeckColorsV2, MatchupV2, PlayerExtrasV2, RankingsV2 } from './contract';
import { type StatsScope, loadStatsMatches } from './load';
import { type EntityType, headToHead } from './matchups';
import { shapeDeckColors, shapeMatchup, shapePlayerExtras, shapeRankings } from './shape';

type Guarded<T> = { data: T } | { notFound: true } | { forbidden: true };

/** Pod-scoped routes call this before anything else. */
export async function isPodMember(userId: string, groupId: string): Promise<boolean> {
  const [member] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return !!member;
}

/** Pod scope when `groupId` is set (the route checked membership), else "all my matches". */
function scopeFor(userId: string, groupId: string | null | undefined): StatsScope {
  return groupId ? { kind: 'group', groupId } : { kind: 'personal', userId };
}

export async function getRankingsV2(userId: string, groupId?: string | null): Promise<{ data: RankingsV2 }> {
  const loaded = await loadStatsMatches(scopeFor(userId, groupId), { events: false });
  return { data: shapeRankings(loaded) };
}

/** Unscoped, like the current deck page: every completed match the deck was in. */
export async function getDeckColorsV2(userId: string, deckId: string): Promise<Guarded<DeckColorsV2>> {
  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), isNull(decks.deletedAt)))
    .limit(1);
  if (!deck) return { notFound: true };
  if (!(await userCanViewDeck(userId, deck))) return { forbidden: true };

  const loaded = await loadStatsMatches({ kind: 'deck', deckId }, { events: false });
  return { data: shapeDeckColors(loaded.matches, deckId) };
}

/**
 * Head-to-head inside the caller's own lens: a pod they belong to, or their
 * personal matches. Entities that never met there simply come back as zeros,
 * so no separate ownership check is needed — nothing outside the scope is read.
 */
export async function getMatchupV2(
  userId: string,
  type: EntityType,
  aId: string,
  bId: string,
  oneVsOne: boolean,
  groupId?: string | null,
): Promise<{ data: MatchupV2 }> {
  const loaded = await loadStatsMatches(scopeFor(userId, groupId), { events: false });
  return { data: shapeMatchup(headToHead(loaded.matches, type, aId, bId, { oneVsOne })) };
}

/** Unscoped, like the current player page. */
export async function getPlayerExtrasV2(userId: string, playerId: string): Promise<Guarded<PlayerExtrasV2>> {
  const [player] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), isNull(players.deletedAt)))
    .limit(1);
  if (!player) return { notFound: true };
  if (!(await userCanViewPlayer(userId, player))) return { forbidden: true };

  const loaded = await loadStatsMatches({ kind: 'player', playerId });
  return { data: shapePlayerExtras(loaded.matches, playerId) };
}
