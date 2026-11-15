/**
 * Stats report — shapes shared by the server (which builds the data package)
 * and the app (which sends it to Claude and draws the result).
 *
 * Pure and dependency-free so both sides can import it.
 *
 * The split that keeps reports consistent: every number comes from the data
 * package, computed here by the server. Claude never counts — it reads the
 * package, sorts cards into checkup areas, and writes short findings that
 * point back at a stat by id. The app draws the numbers itself.
 *
 * RPT-001
 */

/** How much a record can be trusted, from its match count alone. */
export type SampleLevel = 'solid' | 'early' | 'few' | 'none';

export const SAMPLE_SOLID_MATCHES = 10;
export const SAMPLE_EARLY_MATCHES = 5;

export function sampleLevel(matches: number): SampleLevel {
  if (matches >= SAMPLE_SOLID_MATCHES) return 'solid';
  if (matches >= SAMPLE_EARLY_MATCHES) return 'early';
  return matches > 0 ? 'few' : 'none';
}

/** One record. `id` is what a finding points at (e.g. "color:G", "seat:1"). */
export type ReportStat = {
  id: string;
  /** Plain-English label, for Claude. The app labels rows from `id`. */
  label: string;
  /** Deck name, on per-deck and matchup stats — shown as the row label. */
  name?: string;
  matches: number;
  wins: number;
  sample: SampleLevel;
};

export type ReportCard = {
  name: string;
  quantity: number;
  type_line: string | null;
  mana_value: number | null;
  oracle_text: string | null;
};

export const CURVE_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'] as const;

export type DeckShape = {
  total_cards: number;
  lands: number;
  /** Across non-land cards with a known mana value. */
  average_mana_value: number | null;
  /** Non-land cards per mana value, always all of CURVE_BUCKETS in order. */
  curve: { bucket: string; count: number }[];
  types: { type: string; count: number }[];
};

export type ReportDeck = {
  id: string;
  name: string;
  commanders: string[];
  color_identity: string[];
  /** Current list version; null when the deck has no list. */
  version: number | null;
  shape: DeckShape | null;
  cards: ReportCard[];
};

export type ReportVersionChange = {
  number: number;
  date: string;
  added: string[];
  removed: string[];
};

export type ReportKind = 'deck' | 'player';

export type ReportData = {
  kind: ReportKind;
  /** Deck name or player name. */
  subject: string;
  overall: ReportStat;
  by_color: ReportStat[];
  by_seat: ReportStat[];
  by_pod_size: ReportStat[];
  by_game_length: ReportStat[];
  /** Deck report: record per list version. */
  by_version: ReportStat[];
  /** Deck report: record against specific opposing decks. */
  matchups: ReportStat[];
  /** Player report: the player's record with each deck. */
  by_deck: ReportStat[];
  wins_by_condition: { condition: string; wins: number }[];
  version_changes: ReportVersionChange[];
  /** Deck report: the one deck. Player report: up to a few decks that have a list. */
  decks: ReportDeck[];
};

/** Every stat in the package, for looking a finding's `stat_id` back up. */
export function allStats(data: ReportData): ReportStat[] {
  return [
    data.overall,
    ...data.by_color,
    ...data.by_seat,
    ...data.by_pod_size,
    ...data.by_game_length,
    ...data.by_version,
    ...data.matchups,
    ...data.by_deck,
  ];
}

// ─── What Claude returns ──────────────────────────────────────────────────────

export const CHECKUP_AREAS = [
  'lands', 'ramp', 'card_draw', 'removal', 'board_wipes', 'ways_to_win',
] as const;
export type CheckupArea = (typeof CHECKUP_AREAS)[number];
export type CheckupLevel = 'low' | 'fine' | 'high';

export type ReportCheckup = {
  area: CheckupArea;
  level: CheckupLevel;
  /** Card names from the list that fill this area. The app counts them. */
  cards: string[];
  note: string;
};

export type FindingBasis = 'results' | 'decklist' | 'both';

export type ReportFinding = {
  title: string;
  detail: string;
  based_on: FindingBasis;
  /** The stat this rests on, by id. Null for a decklist-only finding. */
  stat_id: string | null;
};

export type ReportSuggestion = { title: string; detail: string };

export type StatsReport = {
  headline: string;
  checkups: ReportCheckup[];
  findings: ReportFinding[];
  suggestions: ReportSuggestion[];
};

export const MAX_FINDINGS = 4;
export const MAX_SUGGESTIONS = 3;
