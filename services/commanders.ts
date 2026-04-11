/**
 * Commander service — Drizzle queries for the commanders table.
 * All mutations are scoped to the authenticated user (createdBy).
 *
 * DATA-002 (EPIC-01)
 */
import { and, eq, isNull, ne, sql } from 'drizzle-orm';

import { db } from '@/services/db';
import { commanders } from '@/db/schema';
import type { Commander } from '@/db/index';

// Valid MTG color codes (BR-ENTITY-01 / E-001)
const VALID_COLORS = new Set(['W', 'U', 'B', 'R', 'G', 'C']);

export function validateColors(colors: unknown): colors is string[] {
  return (
    Array.isArray(colors) &&
    colors.length <= 6 &&
    colors.every((c) => typeof c === 'string' && VALID_COLORS.has(c))
  );
}

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function listCommanders(userId: string): Promise<Commander[]> {
  return db
    .select()
    .from(commanders)
    .where(and(eq(commanders.createdBy, userId), isNull(commanders.deletedAt)))
    .orderBy(commanders.name);
}

export async function getCommanderById(
  id: string,
): Promise<Commander | null> {
  const [row] = await db
    .select()
    .from(commanders)
    .where(and(eq(commanders.id, id), isNull(commanders.deletedAt)))
    .limit(1);
  return row ?? null;
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

type CreateInput = { name: string; colors: string[]; isPartner: boolean };
type UpdateInput = Partial<{ name: string; colors: string[]; isPartner: boolean }>;

export async function createCommander(
  userId: string,
  data: CreateInput,
): Promise<{ data: Commander } | { conflict: true }> {
  // Case-insensitive uniqueness (edge case from DATA-001)
  const [dupe] = await db
    .select({ id: commanders.id })
    .from(commanders)
    .where(
      and(
        sql`lower(${commanders.name}) = lower(${data.name})`,
        isNull(commanders.deletedAt),
      ),
    )
    .limit(1);

  if (dupe) return { conflict: true };

  const [created] = await db
    .insert(commanders)
    .values({ ...data, createdBy: userId })
    .returning();

  return { data: created };
}

export async function updateCommander(
  userId: string,
  id: string,
  data: UpdateInput,
): Promise<{ data: Commander } | { notFound: true } | { forbidden: true } | { conflict: true }> {
  const row = await getCommanderById(id);
  if (!row) return { notFound: true };
  if (row.createdBy !== userId) return { forbidden: true };

  // Case-insensitive uniqueness check when name changes
  if (data.name && data.name.toLowerCase() !== row.name.toLowerCase()) {
    const [dupe] = await db
      .select({ id: commanders.id })
      .from(commanders)
      .where(
        and(
          sql`lower(${commanders.name}) = lower(${data.name})`,
          isNull(commanders.deletedAt),
          ne(commanders.id, id),
        ),
      )
      .limit(1);

    if (dupe) return { conflict: true };
  }

  const [updated] = await db
    .update(commanders)
    .set(data)
    .where(eq(commanders.id, id))
    .returning();

  return { data: updated };
}

export async function softDeleteCommander(
  userId: string,
  id: string,
): Promise<{ ok: true } | { notFound: true } | { forbidden: true }> {
  const row = await getCommanderById(id);
  if (!row) return { notFound: true };
  if (row.createdBy !== userId) return { forbidden: true };

  await db
    .update(commanders)
    .set({ deletedAt: new Date() })
    .where(eq(commanders.id, id));

  return { ok: true };
}
