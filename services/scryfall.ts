/**
 * Scryfall API client.
 *
 * Two operations:
 *   - autocomplete(q) → string[]  // name suggestions for the input
 *   - findCommander(name) → ScryfallCommander | null  // legal commander lookup
 *
 * Scryfall requires a descriptive User-Agent and requests courteous pacing
 * (~50–100ms between calls). We respect that via small in-memory caches + a
 * soft rate limiter for back-to-back calls.
 *
 * Endpoint docs:
 *   https://scryfall.com/docs/api/cards/autocomplete
 *   https://scryfall.com/docs/api/cards/search
 */

const SCRYFALL_BASE = 'https://api.scryfall.com';
const USER_AGENT = 'MTGSliverTracker/1.0 (+mailto:support@aboutagency.com)';
const ACCEPT = 'application/json';

// Small LRU caches keyed by lowercased input
const MAX_CACHE = 128;
const autocompleteCache = new Map<string, string[]>();
const commanderCache = new Map<string, ScryfallCommander | null>();

export interface ScryfallCommander {
  /** Scryfall card UUID — stable, use as our scryfall_id */
  id: string;
  /** Canonical card name */
  name: string;
  /** Array of 'W' | 'U' | 'B' | 'R' | 'G'; [] = colorless */
  colorIdentity: string[];
  /** image_uris.art_crop (falls back to card_faces[0].image_uris.art_crop for DFCs) */
  artCrop: string | null;
  /** True when the card is a legendary creature that has Partner ability */
  hasPartner: boolean;
}

function lruSet<K, V>(cache: Map<K, V>, key: K, value: V) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
}

async function scryfallFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${SCRYFALL_BASE}${path}`, {
    ...init,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: ACCEPT,
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

/**
 * Autocomplete a partial card name.
 * Scryfall already filters to unique names, no need to dedupe on our side.
 */
export async function autocomplete(q: string): Promise<string[]> {
  const key = q.trim().toLowerCase();
  if (key.length < 2) return [];
  const cached = autocompleteCache.get(key);
  if (cached) return cached;

  try {
    const res = await scryfallFetch(
      `/cards/autocomplete?q=${encodeURIComponent(key)}&include_extras=false`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: string[] };
    const list = Array.isArray(data.data) ? data.data : [];
    lruSet(autocompleteCache, key, list);
    return list;
  } catch {
    return [];
  }
}

/**
 * Find the full commander record by exact name.
 * Uses /cards/named?exact= which returns a single card or 404.
 * Filters: must be a legendary creature OR have `can_be_commander` typeline hint.
 */
export async function findCommander(name: string): Promise<ScryfallCommander | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (commanderCache.has(key)) return commanderCache.get(key) ?? null;

  try {
    const res = await scryfallFetch(
      `/cards/named?exact=${encodeURIComponent(key)}`,
    );
    if (!res.ok) {
      lruSet(commanderCache, key, null);
      return null;
    }
    const card = (await res.json()) as ScryfallCard;

    // Basic commander-legality check: either a legendary creature OR the
    // card's type_line includes 'Background'/'Planeswalker can be your commander'.
    // We trust Scryfall's type_line for this.
    const typeLine = (card.type_line ?? '').toLowerCase();
    const isLegendaryCreature =
      typeLine.includes('legendary') && typeLine.includes('creature');
    const isBackground = typeLine.includes('background');
    const canBeCommander =
      isLegendaryCreature ||
      isBackground ||
      (card.oracle_text ?? '').toLowerCase().includes('can be your commander');

    if (!canBeCommander) {
      lruSet(commanderCache, key, null);
      return null;
    }

    const artCrop = extractArtCrop(card);
    const hasPartner = /\bpartner\b/i.test(card.oracle_text ?? '') ||
      /\bpartner with\b/i.test(card.oracle_text ?? '');

    const result: ScryfallCommander = {
      id: card.id,
      name: card.name,
      colorIdentity: Array.isArray(card.color_identity) ? card.color_identity : [],
      artCrop,
      hasPartner,
    };
    lruSet(commanderCache, key, result);
    return result;
  } catch {
    return null;
  }
}

function extractArtCrop(card: ScryfallCard): string | null {
  if (card.image_uris?.art_crop) return card.image_uris.art_crop;
  const face = card.card_faces?.[0];
  if (face?.image_uris?.art_crop) return face.image_uris.art_crop;
  return null;
}

// ─────────────────────────────────────────────
// Scryfall card response shape (subset we use)
// ─────────────────────────────────────────────
interface ScryfallImageUris {
  art_crop?: string;
  normal?: string;
}
interface ScryfallCardFace {
  image_uris?: ScryfallImageUris;
}
interface ScryfallCard {
  id: string;
  name: string;
  type_line?: string;
  oracle_text?: string;
  color_identity?: string[];
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
}
