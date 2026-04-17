/**
 * Commander service — Drizzle queries for the commanders table.
 * All mutations are scoped to the authenticated user (createdBy).
 *
 * Commanders are Scryfall-sourced: we store scryfall_id, name, color_identity,
 * art_crop. If a commander with the given scryfall_id already exists we reuse
 * it instead of inserting a duplicate.
 *
 * DATA-002 (EPIC-01)
 */
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/services/db';
import { commanders } from '@/db/schema';
import type { Commander } from '@/db/index';

// WUBRG only (colorless = empty array)
const VALID_COLORS = new Set(['W', 'U', 'B', 'R', 'G']);

export function validateColorIdentity(colors: unknown): colors is string[] {
  return (
    Array.isArray(colors) &&
    colors.length <= 5 &&
    colors.every((c) => typeof c === 'string' && VALID_COLORS.has(c))
  );
}

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function listCommanders(userId: string): Promise<Commander[]> {
  return await db
    .select()
    .from(commanders)
    .where(and(eq(commanders.createdBy, userId), isNull(commanders.deletedAt)))
    .orderBy(commanders.name);
}

export async function getCommanderById(id: string): Promise<Commander | null> {
  const [row] = await db
    .select()
    .from(commanders)
    .where(and(eq(commanders.id, id), isNull(commanders.deletedAt)))
    .limit(1);
  return row ?? null;
}

async function getCommanderByScryfallId(
  scryfallId: string,
): Promise<Commander | null> {
  const [row] = await db
    .select()
    .from(commanders)
    .where(and(eq(commanders.scryfallId, scryfallId), isNull(commanders.deletedAt)))
    .limit(1);
  return row ?? null;
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

type CreateInput = {
  scryfallId: string;
  name: string;
  colorIdentity: string[];
  artCrop: string | null;
  isPartner: boolean;
};

type UpdateInput = Partial<{
  name: string;
  colorIdentity: string[];
  artCrop: string | null;
  isPartner: boolean;
}>;

/**
 * Create or return the existing commander for this Scryfall ID.
 * Scryfall IDs are globally unique, so we dedupe across users.
 */
export async function createCommander(
  userId: string,
  data: CreateInput,
): Promise<{ data: Commander }> {
  // Reuse existing record if this Scryfall card has already been imported
  const existing = await getCommanderByScryfallId(data.scryfallId);
  if (existing) return { data: existing };

  const [created] = await db
    .insert(commanders)
    .values({
      scryfallId: data.scryfallId,
      name: data.name,
      colorIdentity: data.colorIdentity,
      artCrop: data.artCrop,
      isPartner: data.isPartner,
      createdBy: userId,
    })
    .returning();

  return { data: created };
}

export async function updateCommander(
  userId: string,
  id: string,
  data: UpdateInput,
): Promise<{ data: Commander } | { notFound: true } | { forbidden: true }> {
  const row = await getCommanderById(id);
  if (!row) return { notFound: true };
  if (row.createdBy !== userId) return { forbidden: true };

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
