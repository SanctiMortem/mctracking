/**
 * Player service — Drizzle queries for the players table.
 * All mutations are scoped to the authenticated user (createdBy).
 *
 * DATA-003 (EPIC-01)
 *
 * ⚠️ hasActiveMatch is a stub — full implementation in MATCH-001 (EPIC-02)
 *    once the participations table exists.
 */
import { and, eq, isNull, ne, sql } from 'drizzle-orm';

import { db } from '@/services/db';
import { players } from '@/db/schema';
import type { Player } from '@/db/index';

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function listPlayers(userId: string): Promise<Player[]> {
  return db
    .select()
    .from(players)
    .where(and(eq(players.createdBy, userId), isNull(players.deletedAt)))
    .orderBy(players.name);
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const [row] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, id), isNull(players.deletedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * Check whether a player is currently in an in_progress match.
 * Stub: always returns false until participations table exists (MATCH-001).
 */
async function hasActiveMatch(_playerId: string): Promise<boolean> {
  // TODO MATCH-001: replace with:
  //   SELECT 1 FROM participations p
  //   JOIN matches m ON m.id = p.match_id
  //   WHERE p.player_id = $playerId AND m.status = 'in_progress'
  //   LIMIT 1
  return false;
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

export async function createPlayer(
  userId: string,
  name: string,
): Promise<{ data: Player } | { conflict: true }> {
  // Unique per user (case-insensitive) — BR-ENTITY-01
  const [dupe] = await db
    .select({ id: players.id })
    .from(players)
    .where(
      and(
        eq(players.createdBy, userId),
        sql`lower(${players.name}) = lower(${name})`,
        isNull(players.deletedAt),
      ),
    )
    .limit(1);

  if (dupe) return { conflict: true };

  const [created] = await db
    .insert(players)
    .values({ name: name.trim(), createdBy: userId })
    .returning();

  return { data: created };
}

export async function updatePlayer(
  userId: string,
  id: string,
  name: string,
): Promise<{ data: Player } | { notFound: true } | { forbidden: true } | { conflict: true }> {
  const row = await getPlayerById(id);
  if (!row) return { notFound: true };
  if (row.createdBy !== userId) return { forbidden: true };

  // Uniqueness check only when name actually changes
  if (name.toLowerCase() !== row.name.toLowerCase()) {
    const [dupe] = await db
      .select({ id: players.id })
      .from(players)
      .where(
        and(
          eq(players.createdBy, userId),
          sql`lower(${players.name}) = lower(${name})`,
          isNull(players.deletedAt),
          ne(players.id, id),
        ),
      )
      .limit(1);

    if (dupe) return { conflict: true };
  }

  const [updated] = await db
    .update(players)
    .set({ name: name.trim() })
    .where(eq(players.id, id))
    .returning();

  return { data: updated };
}

export async function softDeletePlayer(
  userId: string,
  id: string,
): Promise<{ ok: true } | { notFound: true } | { forbidden: true } | { activeMatch: true }> {
  const row = await getPlayerById(id);
  if (!row) return { notFound: true };
  if (row.createdBy !== userId) return { forbidden: true };

  if (await hasActiveMatch(id)) return { activeMatch: true };

  await db
    .update(players)
    .set({ deletedAt: new Date() })
    .where(eq(players.id, id));

  return { ok: true };
}
