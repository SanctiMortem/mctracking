/**
 * Decklist service — a deck's optional full card list.
 *
 * Import flow: parsed lines → look up the `cards` cache → fetch what is
 * missing from Scryfall (exact, then fuzzy for typos) → cache → save the
 * list as a new `deck_versions` row with its `deck_cards`. Lines Scryfall
 * cannot resolve are kept with a null card so the user can see and fix them.
 *
 * Versions (DECK-007): the highest version_number is the current deck. Older
 * versions are never edited or deleted. Importing a list identical to the
 * current one adds nothing, so an import is safe to run again with the same
 * input (Neon HTTP has no transactions).
 *
 * DECK-003, DECK-004, DECK-007 (EPIC-07)
 */
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import {
  cards,
  commanders,
  deckCards,
  deckVersions,
  decks,
  matches,
  participations,
  players,
} from '@/db/schema';
import type { Card, DeckVersion } from '@/db/index';
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
  /** The version shown — the deck's newest. Null when it never had a list. */
  version: { id: string; number: number; created_at: string } | null;
  /** How many versions the deck has. */
  version_count: number;
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

/** The deck's newest version — the list that is the deck today. */
async function getCurrentVersion(deckId: string): Promise<DeckVersion | null> {
  const [version] = await db
    .select()
    .from(deckVersions)
    .where(eq(deckVersions.deckId, deckId))
    .orderBy(desc(deckVersions.versionNumber))
    .limit(1);
  return version ?? null;
}

async function buildDecklist(
  deck: NonNullable<Awaited<ReturnType<typeof getDeckRow>>>,
  userId: string,
): Promise<Decklist> {
  const version = await getCurrentVersion(deck.id);
  const commanderIds = [deck.commanderId, deck.commanderId2].filter(Boolean) as string[];

  const [rows, commanderRows] = await Promise.all([
    version
      ? db
          .select({ line: deckCards, card: cards })
          .from(deckCards)
          .leftJoin(cards, eq(deckCards.cardId, cards.id))
          .where(eq(deckCards.deckVersionId, version.id))
      : Promise.resolve([]),
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
    version: version
      ? { id: version.id, number: version.versionNumber, created_at: version.createdAt.toISOString() }
      : null,
    version_count: version?.versionNumber ?? 0,
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
          cmc: sql`excluded.cmc`,
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
 * Fill in mana value for cards cached before it was stored (migration 0013).
 * Refetches only the rows that lack it and returns the list with fresh rows
 * swapped in. If Scryfall is unreachable the list comes back unchanged — a
 * missing mana value is not worth failing a report over.
 */
export async function ensureManaValues(list: Card[]): Promise<Card[]> {
  const missing = list.filter((c) => c.cmc === null);
  if (missing.length === 0) return list;
  try {
    const fetched = await fetchCardsByNames(missing.map((c) => c.name.split('//')[0].trim()));
    const fresh = new Map((await upsertCards(fetched)).map((c) => [c.id, c]));
    return list.map((c) => fresh.get(c.id) ?? c);
  } catch (e) {
    console.error('[decklist] mana value refetch failed', e);
    return list;
  }
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

// ─── Commander cards ──────────────────────────────────────────────────────────

export type CommanderCardView = {
  commander_id: string;
  /** The commander's name as stored on the deck. */
  name: string;
  /** Null when the card could not be loaded (Scryfall unreachable and not cached). */
  card: DecklistCard['card'];
};

export type CommanderCardsResult =
  | { data: { commanders: CommanderCardView[] } }
  | { notFound: true }
  | { forbidden: true };

/**
 * The deck's commander(s) as full cards — image, type line and rules text —
 * so they can be read on the deck screen like any card in the list. Uses the
 * same `cards` cache and Scryfall lookup as a decklist import, so a commander
 * is only fetched from Scryfall the first time anyone opens it.
 */
export async function getDeckCommanderCards(userId: string, deckId: string): Promise<CommanderCardsResult> {
  const deck = await getDeckRow(deckId);
  if (!deck) return { notFound: true };
  if (!(await userCanViewDeck(userId, deck))) return { forbidden: true };

  const ids = [deck.commanderId, deck.commanderId2].filter(Boolean) as string[];
  const rows = await db
    .select({ id: commanders.id, name: commanders.name })
    .from(commanders)
    .where(inArray(commanders.id, ids));

  let resolved = new Map<string, Card>();
  try {
    resolved = await resolveNames(rows.map((r) => r.name));
  } catch (e) {
    // Scryfall down and the card is not cached: the screen shows the name only.
    console.error('[decklist] commander card lookup failed', e);
  }

  // Deck order: commander, then partner.
  const list: CommanderCardView[] = [];
  for (const id of ids) {
    const row = rows.find((r) => r.id === id);
    if (!row) continue;
    const card = resolved.get(lookupKey(row.name)) ?? null;
    list.push({
      commander_id: row.id,
      name: row.name,
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
    });
  }
  return { data: { commanders: list } };
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

  // One row per raw name — the same card pasted twice adds up.
  const byName = new Map<string, { cardId: string | null; rawName: string; quantity: number }>();
  for (const l of lines) {
    const rawName = l.name.slice(0, 200);
    const prev = byName.get(rawName);
    const quantity = Math.min(Math.max(l.quantity, 1) + (prev?.quantity ?? 0), 99);
    byName.set(rawName, { cardId: resolved.get(lookupKey(l.name))?.id ?? null, rawName, quantity });
  }
  const incoming = [...byName.values()];

  // Same list as the current version → nothing new to record.
  const current = await getCurrentVersion(deckId);
  if (current) {
    const currentRows = await db
      .select({ cardId: deckCards.cardId, rawName: deckCards.rawName, quantity: deckCards.quantity })
      .from(deckCards)
      .where(eq(deckCards.deckVersionId, current.id));
    if (sameList(currentRows, incoming)) return { data: await buildDecklist(deck, userId) };
  }

  await saveVersion(deckId, userId, (current?.versionNumber ?? 0) + 1, incoming);
  return { data: await buildDecklist(deck, userId) };
}

type VersionLine = { cardId: string | null; rawName: string; quantity: number };

/** What identifies a line across versions: the card, or the raw text if unresolved. */
function lineKey(l: { cardId: string | null; rawName: string }): string {
  return l.cardId ?? `raw:${l.rawName.trim().toLowerCase()}`;
}

function quantities(list: VersionLine[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of list) out.set(lineKey(l), (out.get(lineKey(l)) ?? 0) + l.quantity);
  return out;
}

function sameList(a: VersionLine[], b: VersionLine[]): boolean {
  const qa = quantities(a);
  const qb = quantities(b);
  if (qa.size !== qb.size) return false;
  for (const [k, q] of qa) if (qb.get(k) !== q) return false;
  return true;
}

/**
 * Insert a version and its cards. No transactions on Neon HTTP: if the cards
 * fail to save, the half-written version is removed so it never becomes the
 * current deck.
 */
async function saveVersion(
  deckId: string,
  userId: string,
  versionNumber: number,
  list: VersionLine[],
): Promise<void> {
  const [version] = await db
    .insert(deckVersions)
    .values({ deckId, versionNumber, createdBy: userId })
    .returning();
  try {
    const values = list.map((l) => ({ ...l, deckId, deckVersionId: version.id }));
    for (let i = 0; i < values.length; i += INSERT_CHUNK) {
      await db.insert(deckCards).values(values.slice(i, i + INSERT_CHUNK)).onConflictDoNothing();
    }
  } catch (e) {
    await db.delete(deckCards).where(eq(deckCards.deckVersionId, version.id)).catch(() => {});
    await db.delete(deckVersions).where(eq(deckVersions.id, version.id)).catch(() => {});
    throw e;
  }
}

/**
 * Remove the deck's list. History is kept: this records a new, empty version
 * rather than deleting cards.
 */
export async function clearDecklist(
  userId: string,
  deckId: string,
): Promise<{ ok: true } | { notFound: true } | { forbidden: true }> {
  const deck = await getDeckRow(deckId);
  if (!deck) return { notFound: true };
  if (deck.createdBy !== userId) return { forbidden: true };

  const current = await getCurrentVersion(deckId);
  if (!current) return { ok: true };
  const [hasCards] = await db
    .select({ id: deckCards.id })
    .from(deckCards)
    .where(eq(deckCards.deckVersionId, current.id))
    .limit(1);
  if (hasCards) await saveVersion(deckId, userId, current.versionNumber + 1, []);
  return { ok: true };
}

// ─── History ──────────────────────────────────────────────────────────────────

export type VersionDiffCard = { name: string; quantity: number };
export type VersionDiffChange = { name: string; from: number; to: number };

export type DeckVersionSummary = {
  id: string;
  number: number;
  created_at: string;
  /** Player name of whoever uploaded it, when they have an account player. */
  uploaded_by: string | null;
  total_cards: number;
  /** Change from the previous version. Null for the first version. */
  diff: {
    added: VersionDiffCard[];
    removed: VersionDiffCard[];
    changed: VersionDiffChange[];
  } | null;
  /** Completed matches played with this version. */
  matches: number;
  wins: number;
};

export type DeckVersionHistory = {
  deck_id: string;
  /** Newest first. */
  versions: DeckVersionSummary[];
  /** Completed matches with no recorded version (played before versioning, or with no list). */
  unknown_version: { matches: number; wins: number };
};

export type DeckVersionHistoryResult =
  | { data: DeckVersionHistory }
  | { notFound: true }
  | { forbidden: true };

export async function getDeckVersionHistory(
  userId: string,
  deckId: string,
): Promise<DeckVersionHistoryResult> {
  const deck = await getDeckRow(deckId);
  if (!deck) return { notFound: true };
  if (!(await userCanViewDeck(userId, deck))) return { forbidden: true };

  const [versions, cardRows, recordRows] = await Promise.all([
    db
      .select()
      .from(deckVersions)
      .where(eq(deckVersions.deckId, deckId))
      .orderBy(asc(deckVersions.versionNumber)),
    db
      .select({
        versionId: deckCards.deckVersionId,
        cardId: deckCards.cardId,
        rawName: deckCards.rawName,
        quantity: deckCards.quantity,
        cardName: cards.name,
      })
      .from(deckCards)
      .leftJoin(cards, eq(deckCards.cardId, cards.id))
      .where(eq(deckCards.deckId, deckId)),
    db
      .select({
        versionId: participations.deckVersionId,
        matches: sql<number>`count(*)::int`,
        wins: sql<number>`count(*) filter (where ${participations.result} = 'win')::int`,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(and(eq(participations.deckId, deckId), eq(matches.status, 'completed')))
      .groupBy(participations.deckVersionId),
  ]);

  const uploaderIds = [...new Set(versions.map((v) => v.createdBy))];
  const uploaderRows = uploaderIds.length
    ? await db
        .select({ userId: players.accountUserId, name: players.name })
        .from(players)
        .where(and(inArray(players.accountUserId, uploaderIds), isNull(players.deletedAt)))
    : [];
  const uploaderName = new Map(uploaderRows.map((r) => [r.userId, r.name]));

  // version id → (line key → { name, quantity })
  const byVersion = new Map<string, Map<string, VersionDiffCard>>();
  for (const r of cardRows) {
    if (!r.versionId) continue;
    const lines = byVersion.get(r.versionId) ?? new Map<string, VersionDiffCard>();
    const key = lineKey(r);
    const prev = lines.get(key);
    lines.set(key, { name: r.cardName ?? r.rawName, quantity: (prev?.quantity ?? 0) + r.quantity });
    byVersion.set(r.versionId, lines);
  }
  const record = new Map(recordRows.map((r) => [r.versionId, r]));
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  const summaries = versions.map((v, i): DeckVersionSummary => {
    const now = byVersion.get(v.id) ?? new Map<string, VersionDiffCard>();
    let diff: DeckVersionSummary['diff'] = null;
    if (i > 0) {
      const before = byVersion.get(versions[i - 1].id) ?? new Map<string, VersionDiffCard>();
      const added: VersionDiffCard[] = [];
      const removed: VersionDiffCard[] = [];
      const changed: VersionDiffChange[] = [];
      for (const [key, line] of now) {
        const old = before.get(key);
        if (!old) added.push(line);
        else if (old.quantity !== line.quantity) {
          changed.push({ name: line.name, from: old.quantity, to: line.quantity });
        }
      }
      for (const [key, line] of before) if (!now.has(key)) removed.push(line);
      diff = { added: added.sort(byName), removed: removed.sort(byName), changed: changed.sort(byName) };
    }
    return {
      id: v.id,
      number: v.versionNumber,
      created_at: v.createdAt.toISOString(),
      uploaded_by: uploaderName.get(v.createdBy) ?? null,
      total_cards: [...now.values()].reduce((sum, l) => sum + l.quantity, 0),
      diff,
      matches: record.get(v.id)?.matches ?? 0,
      wins: record.get(v.id)?.wins ?? 0,
    };
  });

  return {
    data: {
      deck_id: deckId,
      versions: summaries.reverse(),
      unknown_version: {
        matches: record.get(null)?.matches ?? 0,
        wins: record.get(null)?.wins ?? 0,
      },
    },
  };
}
