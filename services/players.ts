/**
 * Player service — Drizzle queries for the players table.
 * All mutations are scoped to the authenticated user (createdBy).
 *
 * DATA-003 (EPIC-01)
 *
 * hasActiveMatch implemented via isPlayerInActiveMatch (MATCH-002).
 */
import { and, eq, isNull, ne, sql } from 'drizzle-orm';

import { db } from '@/services/db';
import { isPlayerInActiveMatch } from '@/services/matches';
import { players } from '@/db/schema';
import type { Player } from '@/db/index';

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function listPlayers(
  userId: string,
  opts?: { guestsOnly?: boolean },
): Promise<Player[]> {
  const conditions = [eq(players.createdBy, userId), isNull(players.deletedAt)];
  if (opts?.guestsOnly) {
    conditions.push(isNull(players.accountUserId));
  }
  return await db
    .select()
    .from(players)
    .where(and(...conditions))
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

/** Get the account player for a Clerk user (null if not created yet). */
export async function getAccountPlayer(userId: string): Promise<Player | null> {
  const [row] = await db
    .select()
    .from(players)
    .where(and(eq(players.accountUserId, userId), isNull(players.deletedAt)))
    .limit(1);
  return row ?? null;
}

/** Get or create the account player for a Clerk user. */
export async function getOrCreateAccountPlayer(
  userId: string,
  name: string,
): Promise<{ data: Player; created: boolean }> {
  const existing = await getAccountPlayer(userId);
  if (existing) return { data: existing, created: false };

  const [created] = await db
    .insert(players)
    .values({
      name: name.trim(),
      createdBy: userId,
      accountUserId: userId,
    })
    .returning();

  return { data: created, created: true };
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

  if (await isPlayerInActiveMatch(id)) return { activeMatch: true };

  await db
    .update(players)
    .set({ deletedAt: new Date() })
    .where(eq(players.id, id));

  return { ok: true };
}
