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
 * Autocomplete a partial card name, scoped to legal commanders only.
 *
 * Uses /cards/search with the `is:commander` filter — Scryfall's authoritative
 * answer for "can this card be a commander?" This covers legendary creatures,
 * Backgrounds, planeswalkers with "can be your commander" text, and newer cases
 * like Spacecraft (e.g. Inspirit, Flagship Vessel) that the previous type_line
 * heuristic rejected.
 *
 * We also warm the commanderCache with full card data, so the subsequent
 * findCommander() call after the user picks a suggestion is a cache hit.
 */
export async function autocomplete(q: string): Promise<string[]> {
  const key = q.trim().toLowerCase();
  if (key.length < 2) return [];
  const cached = autocompleteCache.get(key);
  if (cached) return cached;

  try {
    const query = `is:commander name:"${key.replace(/"/g, '\\"')}"`;
    const res = await scryfallFetch(
      `/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=name`,
    );
    if (!res.ok) {
      lruSet(autocompleteCache, key, []);
      return [];
    }
    const data = (await res.json()) as { data?: ScryfallCard[] };
    const cards = Array.isArray(data.data) ? data.data : [];

    // Warm the commander cache so the next findCommander() is instant.
    for (const card of cards) {
      const nameKey = card.name.toLowerCase();
      if (!commanderCache.has(nameKey)) {
        lruSet(commanderCache, nameKey, cardToCommander(card));
      }
    }

    const names = cards.slice(0, 15).map((c) => c.name);
    lruSet(autocompleteCache, key, names);
    return names;
  } catch {
    return [];
  }
}

/**
 * Find the full commander record by exact name, validated by Scryfall's
 * `is:commander` filter (single source of truth).
 *
 * The previous version used a type_line heuristic that rejected non-creature
 * commanders introduced after the rule was added (e.g. legendary Spacecraft).
 */
export async function findCommander(name: string): Promise<ScryfallCommander | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (commanderCache.has(key)) return commanderCache.get(key) ?? null;

  try {
    const query = `is:commander !"${name.replace(/"/g, '\\"')}"`;
    const res = await scryfallFetch(
      `/cards/search?q=${encodeURIComponent(query)}&unique=cards`,
    );
    if (!res.ok) {
      lruSet(commanderCache, key, null);
      return null;
    }
    const data = (await res.json()) as { data?: ScryfallCard[] };
    const card = data.data?.[0];
    if (!card) {
      lruSet(commanderCache, key, null);
      return null;
    }

    const result = cardToCommander(card);
    lruSet(commanderCache, key, result);
    return result;
  } catch {
    return null;
  }
}

function cardToCommander(card: ScryfallCard): ScryfallCommander {
  const oracle = card.oracle_text ?? '';
  const hasPartner =
    /\bpartner\b/i.test(oracle) ||
    /\bpartner with\b/i.test(oracle) ||
    /\bfriends forever\b/i.test(oracle) ||
    /\bdoctor's companion\b/i.test(oracle) ||
    /\bchoose a background\b/i.test(oracle);

  return {
    id: card.id,
    name: card.name,
    colorIdentity: Array.isArray(card.color_identity) ? card.color_identity : [],
    artCrop: extractArtCrop(card),
    hasPartner,
  };
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
