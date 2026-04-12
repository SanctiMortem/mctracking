/**
 * Deck service — Drizzle queries for the decks table.
 * Joins commanders table twice (primary + partner) for embedded responses.
 *
 * DATA-004 (EPIC-01)
 *
 * hasActiveMatch implemented via isDeckInActiveMatch (MATCH-002).
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/services/db';
import { isDeckInActiveMatch } from '@/services/matches';
import { commanders, decks } from '@/db/schema';
import type { Commander, Deck } from '@/db/index';

// ─────────────────────────────────────────────
// Response shape
// ─────────────────────────────────────────────

export type DeckWithCommanders = Deck & {
  commander: Commander;
  commander2: Commander | null;
};

// Aliases for double join on the same table
const cmd1 = alias(commanders, 'cmd1');
const cmd2 = alias(commanders, 'cmd2');

function buildDeckSelect() {
  return db
    .select({
      // Deck columns
      id: decks.id,
      name: decks.name,
      commanderId: decks.commanderId,
      commanderId2: decks.commanderId2,
      groupId: decks.groupId,
      description: decks.description,
      createdBy: decks.createdBy,
      deletedAt: decks.deletedAt,
      createdAt: decks.createdAt,
      // Primary commander
      commander: {
        id: cmd1.id,
        name: cmd1.name,
        colors: cmd1.colors,
        isPartner: cmd1.isPartner,
        createdBy: cmd1.createdBy,
        deletedAt: cmd1.deletedAt,
        createdAt: cmd1.createdAt,
      },
      // Partner commander (nullable)
      commander2: {
        id: cmd2.id,
        name: cmd2.name,
        colors: cmd2.colors,
        isPartner: cmd2.isPartner,
        createdBy: cmd2.createdBy,
        deletedAt: cmd2.deletedAt,
        createdAt: cmd2.createdAt,
      },
    })
    .from(decks)
    .innerJoin(cmd1, eq(decks.commanderId, cmd1.id))
    .leftJoin(cmd2, eq(decks.commanderId2, cmd2.id));
}

function toResponse(row: Awaited<ReturnType<typeof buildDeckSelect>>[number]): DeckWithCommanders {
  return {
    ...row,
    commander: row.commander as Commander,
    commander2: row.commander2?.id ? (row.commander2 as Commander) : null,
  };
}

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function listDecks(
  userId: string,
  filter?: { commanderId?: string },
): Promise<DeckWithCommanders[]> {
  const conditions = [eq(decks.createdBy, userId), isNull(decks.deletedAt)];
  if (filter?.commanderId) {
    conditions.push(
      sql`(${decks.commanderId} = ${filter.commanderId} OR ${decks.commanderId2} = ${filter.commanderId})`,
    );
  }

  const rows = await buildDeckSelect()
    .where(and(...conditions))
    .orderBy(decks.name);

  return rows.map(toResponse);
}

export async function getDeckById(id: string): Promise<DeckWithCommanders | null> {
  const rows = await buildDeckSelect()
    .where(and(eq(decks.id, id), isNull(decks.deletedAt)))
    .limit(1);

  return rows.length ? toResponse(rows[0]) : null;
}

// Raw deck row (no join) — used internally for auth checks
async function getDeckRaw(id: string) {
  const [row] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), isNull(decks.deletedAt)))
    .limit(1);
  return row ?? null;
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

type CreateInput = {
  name: string;
  commanderId: string;
  commanderId2?: string | null;
  description?: string | null;
};

type UpdateInput = Partial<{
  name: string;
  commanderId: string;
  commanderId2: string | null;
  description: string | null;
}>;

export async function createDeck(
  userId: string,
  data: CreateInput,
): Promise<
  | { data: DeckWithCommanders }
  | { commanderNotFound: true }
  | { partnerRequired: true }
  | { commander2NotFound: true }
> {
  // Validate primary commander exists
  const [primaryCmd] = await db
    .select()
    .from(commanders)
    .where(and(eq(commanders.id, data.commanderId), isNull(commanders.deletedAt)))
    .limit(1);

  if (!primaryCmd) return { commanderNotFound: true };

  // Partner rule — BR-DECK-03
  if (primaryCmd.isPartner && !data.commanderId2) {
    return { partnerRequired: true };
  }

  // Validate partner commander if provided
  if (data.commanderId2) {
    const [partnerCmd] = await db
      .select({ id: commanders.id })
      .from(commanders)
      .where(and(eq(commanders.id, data.commanderId2), isNull(commanders.deletedAt)))
      .limit(1);

    if (!partnerCmd) return { commander2NotFound: true };
  }

  const [created] = await db
    .insert(decks)
    .values({
      name: data.name.trim(),
      commanderId: data.commanderId,
      commanderId2: data.commanderId2 ?? null,
      description: data.description ?? null,
      createdBy: userId,
    })
    .returning();

  const deck = await getDeckById(created.id);
  return { data: deck! };
}

export async function updateDeck(
  userId: string,
  id: string,
  data: UpdateInput,
): Promise<
  | { data: DeckWithCommanders }
  | { notFound: true }
  | { forbidden: true }
  | { commanderNotFound: true }
  | { partnerRequired: true }
  | { commander2NotFound: true }
> {
  const row = await getDeckRaw(id);
  if (!row) return { notFound: true };
  if (row.createdBy !== userId) return { forbidden: true };

  // Re-validate commander if changing
  const resolvedCommanderId = data.commanderId ?? row.commanderId;
  if (data.commanderId) {
    const [cmd] = await db
      .select()
      .from(commanders)
      .where(and(eq(commanders.id, data.commanderId), isNull(commanders.deletedAt)))
      .limit(1);

    if (!cmd) return { commanderNotFound: true };

    // If new commander is partner, require commander_id_2
    const resolvedCmd2 = 'commanderId2' in data ? data.commanderId2 : row.commanderId2;
    if (cmd.isPartner && !resolvedCmd2) return { partnerRequired: true };
  }

  if (data.commanderId2) {
    const [cmd2] = await db
      .select({ id: commanders.id })
      .from(commanders)
      .where(and(eq(commanders.id, data.commanderId2), isNull(commanders.deletedAt)))
      .limit(1);

    if (!cmd2) return { commander2NotFound: true };
  }

  await db
    .update(decks)
    .set({
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.commanderId !== undefined && { commanderId: data.commanderId }),
      ...('commanderId2' in data && { commanderId2: data.commanderId2 }),
      ...(data.description !== undefined && { description: data.description }),
    })
    .where(eq(decks.id, id));

  const deck = await getDeckById(id);
  return { data: deck! };
}

export async function softDeleteDeck(
  userId: string,
  id: string,
): Promise<{ ok: true } | { notFound: true } | { forbidden: true } | { activeMatch: true }> {
  const row = await getDeckRaw(id);
  if (!row) return { notFound: true };
  if (row.createdBy !== userId) return { forbidden: true };

  if (await isDeckInActiveMatch(id)) return { activeMatch: true };

  await db.update(decks).set({ deletedAt: new Date() }).where(eq(decks.id, id));
  return { ok: true };
}
