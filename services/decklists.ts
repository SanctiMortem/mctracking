/**
 * Decklist service — a deck's optional full card list.
 *
 * Import flow: parsed lines → look up the `cards` cache → fetch what is
 * missing from Scryfall (exact, then fuzzy for typos) → cache → replace the
 * deck's `deck_cards` rows. Lines Scryfall cannot resolve are kept with a
 * null card so the user can see and fix them.
 *
 * Neon HTTP has no transactions: the replace is delete-then-insert, and the
 * whole import is safe to run again with the same input.
 *
 * DECK-003, DECK-004 (EPIC-07)
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { cards, commanders, deckCards, decks } from '@/db/schema';
import type { Card } from '@/db/index';
import { db } from '@/services/db';
import type { DecklistLine } from '@/services/decklistParser';
import { fetchCardFuzzy, fetchCardsByNames, type ScryfallCardData } from '@/services/scryfall';
import { userCanViewDeck } from '@/services/stats';

/** Upper bound on distinct lines in one import (a Commander deck is ≤100). */
export const MAX_DECKLIST_LINES = 250;
/** Fuzzy lookups are one request each — cap them so an import stays fast. */
const MAX_FUZZY_LOOKUPS = 12;
const INSERT_CHUNK = 100;

export type DecklistCard = {
  raw_name: string;
  quantity: number;
  /** True when the card's colour identity is outside the commander(s)'. */
  off_identity: boolean;
  card: {
    id: string;
    name: string;
    type_line: string | null;
    oracle_text: string | null;
    colors: string[];
    color_identity: string[];
    image_url: string | null;
  } | null;
};

export type Decklist = {
  deck_id: string;
  /** Only the deck's owner can import, replace or remove the list. */
  can_edit: boolean;
  /** Sum of quantities. */
  total_cards: number;
  unresolved_count: number;
  off_identity_count: number;
  cards: DecklistCard[];
};

export type DecklistResult =
  | { data: Decklist }
  | { notFound: true }
  | { forbidden: true };

async function getDeckRow(deckId: string) {
  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), isNull(decks.deletedAt)))
    .limit(1);
  return deck ?? null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

async function buildDecklist(
  deck: NonNullable<Awaited<ReturnType<typeof getDeckRow>>>,
  userId: string,
): Promise<Decklist> {
  const commanderIds = [deck.commanderId, deck.commanderId2].filter(Boolean) as string[];

  const [rows, commanderRows] = await Promise.all([
    db
      .select({ line: deckCards, card: cards })
      .from(deckCards)
      .leftJoin(cards, eq(deckCards.cardId, cards.id))
      .where(eq(deckCards.deckId, deck.id)),
    db
      .select({ colorIdentity: commanders.colorIdentity })
      .from(commanders)
      .where(inArray(commanders.id, commanderIds)),
  ]);

  // Deck identity = union of its commander(s) (BR-DECK-03 partners).
  const identity = new Set(commanderRows.flatMap((c) => c.colorIdentity));

  const list: DecklistCard[] = rows.map(({ line, card }) => ({
    raw_name: line.rawName,
    quantity: line.quantity,
    off_identity: card ? card.colorIdentity.some((c) => !identity.has(c)) : false,
    card: card
      ? {
          id: card.id,
          name: card.name,
          type_line: card.typeLine,
          oracle_text: card.oracleText,
          colors: card.colors,
          color_identity: card.colorIdentity,
          image_url: card.imageUrl,
        }
      : null,
  }));

  // Problems first, then alphabetical.
  const rank = (c: DecklistCard) => (c.card === null ? 0 : c.off_identity ? 1 : 2);
  list.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.card?.name ?? a.raw_name).localeCompare(b.card?.name ?? b.raw_name),
  );

  return {
    deck_id: deck.id,
    can_edit: deck.createdBy === userId,
    total_cards: list.reduce((sum, c) => sum + c.quantity, 0),
    unresolved_count: list.filter((c) => c.card === null).length,
    off_identity_count: list.filter((c) => c.off_identity).length,
    cards: list,
  };
}

export async function getDecklist(userId: string, deckId: string): Promise<DecklistResult> {
  const deck = await getDeckRow(deckId);
  if (!deck) return { notFound: true };
  if (!(await userCanViewDeck(userId, deck))) return { forbidden: true };
  return { data: await buildDecklist(deck, userId) };
}

// ─── Resolve ──────────────────────────────────────────────────────────────────

/**
 * What a decklist line is matched on: the lowercased front-face name.
 * Scryfall's exact-name lookup finds "Fire" but not "Fire // Ice", so a
 * pasted "Front // Back" is looked up by its front half — the same value
 * stored in `cards.name_key`.
 */
function lookupKey(name: string): string {
  return name.split('//')[0].trim().toLowerCase();
}

async function upsertCards(data: ScryfallCardData[]): Promise<Card[]> {
  if (data.length === 0) return [];
  // The same card can come back twice (e.g. two typos of one name).
  const unique = [...new Map(data.map((d) => [d.scryfallId, d])).values()];
  const out: Card[] = [];
  for (let i = 0; i < unique.length; i += INSERT_CHUNK) {
    const rows = await db
      .insert(cards)
      .values(unique.slice(i, i + INSERT_CHUNK))
      .onConflictDoUpdate({
        target: cards.scryfallId,
        set: {
          oracleId: sql`excluded.oracle_id`,
          name: sql`excluded.name`,
          nameKey: sql`excluded.name_key`,
          oracleText: sql`excluded.oracle_text`,
          typeLine: sql`excluded.type_line`,
          colors: sql`excluded.colors`,
          colorIdentity: sql`excluded.color_identity`,
          imageUrl: sql`excluded.image_url`,
          fetchedAt: sql`now()`,
        },
      })
      .returning();
    out.push(...rows);
  }
  return out;
}

/**
 * Map each input name (by `lookupKey`) to a cached card, fetching from Scryfall
 * only what the cache does not have. Names missing from the result are
 * unresolved.
 */
async function resolveNames(names: string[]): Promise<Map<string, Card>> {
  const resolved = new Map<string, Card>();
  // key → the front-face name to send to Scryfall
  const byKey = new Map(names.map((n) => [lookupKey(n), n.split('//')[0].trim()]));
  const keys = [...byKey.keys()];
  if (keys.length === 0) return resolved;

  const index = (card: Card) => {
    if (byKey.has(card.nameKey) && !resolved.has(card.nameKey)) resolved.set(card.nameKey, card);
  };

  // 1. Cache
  const cached = await db
    .select()
    .from(cards)
    .where(inArray(cards.nameKey, keys));
  cached.forEach(index);

  // 2. Scryfall, exact names
  const missing = keys.filter((k) => !resolved.has(k));
  if (missing.length > 0) {
    const fetched = await fetchCardsByNames(missing.map((k) => byKey.get(k)!));
    (await upsertCards(fetched)).forEach(index);
  }

  // 3. Scryfall, fuzzy — typos. One request each, so capped.
  const stillMissing = keys.filter((k) => !resolved.has(k)).slice(0, MAX_FUZZY_LOOKUPS);
  for (const k of stillMissing) {
    const hit = await fetchCardFuzzy(byKey.get(k)!);
    if (!hit) continue;
    const [card] = await upsertCards([hit]);
    if (card) resolved.set(k, card);
  }

  return resolved;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export type ImportDecklistResult = DecklistResult | { tooManyLines: true } | { empty: true };

export async function importDecklist(
  userId: string,
  deckId: string,
  lines: DecklistLine[],
): Promise<ImportDecklistResult> {
  const deck = await getDeckRow(deckId);
  if (!deck) return { notFound: true };
  if (deck.createdBy !== userId) return { forbidden: true };
  if (lines.length === 0) return { empty: true };
  if (lines.length > MAX_DECKLIST_LINES) return { tooManyLines: true };

  // Resolve BEFORE touching the stored list, so a Scryfall outage leaves the
  // existing decklist intact.
  const resolved = await resolveNames(lines.map((l) => l.name));

  await db.delete(deckCards).where(eq(deckCards.deckId, deckId));

  const values = lines.map((l) => ({
    deckId,
    cardId: resolved.get(lookupKey(l.name))?.id ?? null,
    rawName: l.name.slice(0, 200),
    quantity: Math.min(Math.max(l.quantity, 1), 99),
  }));
  for (let i = 0; i < values.length; i += INSERT_CHUNK) {
    await db
      .insert(deckCards)
      .values(values.slice(i, i + INSERT_CHUNK))
      .onConflictDoNothing();
  }

  return { data: await buildDecklist(deck, userId) };
}

export async function clearDecklist(
  userId: string,
  deckId: string,
): Promise<{ ok: true } | { notFound: true } | { forbidden: true }> {
  const deck = await getDeckRow(deckId);
  if (!deck) return { notFound: true };
  if (deck.createdBy !== userId) return { forbidden: true };
  await db.delete(deckCards).where(eq(deckCards.deckId, deckId));
  return { ok: true };
}
