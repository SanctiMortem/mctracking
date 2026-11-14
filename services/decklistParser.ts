/**
 * Decklist text parser — turns a pasted list into `{ quantity, name }[]`.
 *
 * Accepts the plain-text exports of Moxfield, Archidekt and MTG Arena, plus
 * hand-typed lists. Only quantity and card name survive: set codes, collector
 * numbers, foil / etched tags, category tags and section headers are dropped.
 * Cards under Sideboard / Maybeboard / Considering / Tokens headers are
 * skipped — they are not part of the deck that gets played.
 *
 * Pure and dependency-free so it runs on both the client (clipboard check,
 * preview) and the server (import route).
 *
 * DECK-002 (EPIC-07)
 */

export interface DecklistLine {
  quantity: number;
  name: string;
}

/** Sections whose cards are not part of the played deck. */
const SKIPPED_SECTIONS = /^(sideboard|maybeboard|considering|tokens?)\b/i;

/** Words that, alone on a line, are a section header rather than a card. */
const HEADER_WORDS = new Set([
  'commander', 'commanders', 'companion', 'deck', 'mainboard', 'main', 'maindeck',
  'sideboard', 'maybeboard', 'considering', 'tokens', 'token',
  'creature', 'creatures', 'land', 'lands', 'instant', 'instants', 'sorcery',
  'sorceries', 'artifact', 'artifacts', 'enchantment', 'enchantments',
  'planeswalker', 'planeswalkers', 'battle', 'battles', 'about',
]);

const QUANTITY_RE = /^(\d{1,3})\s*x?\s+(.+)$/i;

/**
 * A line with no leading quantity is a header when it ends with ":" or a
 * "(23)" count, starts with a comment marker, or is a bare section word.
 * Anything else without a quantity is treated as a single card.
 */
function isHeader(line: string): boolean {
  if (line.startsWith('//') || line.startsWith('#')) return true;
  if (/:$/.test(line)) return true;
  if (/\(\d+\)$/.test(line)) return true;
  return HEADER_WORDS.has(line.toLowerCase());
}

function headerLabel(line: string): string {
  return line
    .replace(/^(\/\/|#)\s*/, '')
    .replace(/\s*\(\d+\)$/, '')
    .replace(/:$/, '')
    .trim();
}

/** Strip everything that is not the card name. */
function cleanName(raw: string): string {
  let name = raw;
  // Foil / etched / alter markers: *F*, *E*, *A*
  name = name.replace(/\s*\*[A-Za-z]+\*/g, '');
  // Archidekt colour-tag suffix: ^Have,#37d67a^
  name = name.replace(/\s*\^[^^]*\^\s*$/, '');
  // Archidekt category suffix: [Ramp] or [Ramp,Draw]
  name = name.replace(/\s*\[[^\]]*\]\s*$/, '');
  // Set code + optional collector number: (C21) 263, (PLST) MH1-12, (sld) 1234★
  name = name.replace(/\s+\([A-Za-z0-9]{2,6}\)(\s+\S+)?\s*$/, '');
  // Trailing hashtags: #ramp #!commander
  name = name.replace(/(\s+#\S+)+\s*$/, '');
  return name.replace(/\s+/g, ' ').trim();
}

export function parseDecklist(text: string): DecklistLine[] {
  const merged = new Map<string, DecklistLine>();
  let skipping = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const qty = QUANTITY_RE.exec(line);

    if (!qty && isHeader(line)) {
      skipping = SKIPPED_SECTIONS.test(headerLabel(line));
      continue;
    }
    if (skipping) continue;

    const quantity = qty ? parseInt(qty[1], 10) : 1;
    const name = cleanName(qty ? qty[2] : line);
    if (!name || quantity < 1) continue;

    const key = name.toLowerCase();
    const existing = merged.get(key);
    if (existing) existing.quantity += quantity;
    else merged.set(key, { quantity, name });
  }

  return [...merged.values()];
}

/**
 * True when `text` reads like a decklist: at least 10 lines that start with
 * a quantity. Used to decide whether to offer "Import copied list?".
 */
export function looksLikeDecklist(text: string): boolean {
  let hits = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    if (QUANTITY_RE.test(rawLine.trim())) {
      hits += 1;
      if (hits >= 10) return true;
    }
  }
  return false;
}
