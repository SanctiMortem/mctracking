/**
 * Stats v2 — what the /api/stats/v2/* routes return.
 *
 * Pure types, no imports from the database, so the app can use them without
 * pulling server code into the bundle. Field names are snake_case like the
 * rest of the API.
 */
import type { SampleLevel } from '@/services/reportShared';

import type { Color, Coverage } from './types';

// ─── GET /api/stats/v2/rankings ──────────────────────────────────────────────

export interface RankedEntityV2 {
  id: string;
  name: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  /** One decimal, null with no matches. */
  win_pct: number | null;
  /** wins − Σ(1 ÷ pod size), one decimal. */
  wins_vs_expected: number;
  /** 1-based; null for entities under the minimum number of matches. */
  rank: number | null;
}

export interface RankingListV2 {
  /** Matches needed to be ranked. */
  min_matches: number;
  ranked: RankedEntityV2[];
  /** Under the minimum. Most matches first. */
  unranked: RankedEntityV2[];
}

export interface RankingsV2 {
  total_matches: number;
  players: RankingListV2;
  decks: RankingListV2;
  commanders: RankingListV2;
}

// ─── GET /api/stats/v2/decks/:id ─────────────────────────────────────────────

export interface ColorRowV2 {
  wins: number;
  losses: number;
  ties: number;
  duels: number;
  /** Distinct matches behind the duels; the sample label counts these. */
  matches: number;
  /** wins ÷ (wins + losses), one decimal. */
  raw_pct: number | null;
  /** Pulled toward 50 % for small samples, one decimal. */
  adj_pct: number;
  sample: SampleLevel;
}

export interface ColorStatV2 extends ColorRowV2 {
  color: Color;
}

export interface DeckColorsV2 {
  rows: ColorStatV2[];
  strong: ColorStatV2[];
  weak: ColorStatV2[];
  by_color_count: (ColorRowV2 & { color_count: number })[];
}

// ─── GET /api/stats/v2/matchup ───────────────────────────────────────────────

export interface MatchupV2 {
  a_wins: number;
  b_wins: number;
  ties: number;
  /** a_wins + b_wins + ties. */
  duels: number;
  shared_matches: number;
  /** Shared matches a third player won: neither finished ahead of the other. */
  undecided_matches: number;
}

// ─── GET /api/stats/v2/players/:id ───────────────────────────────────────────

export interface CoveredV2 {
  /** null = not enough tracked games to show a value. */
  value: number | null;
  coverage: Coverage;
}

export interface PlayerExtrasV2 {
  matches: number;
  wins: number;
  expected_wins: number;
  wins_vs_expected: number;
  placement: {
    average: CoveredV2;
    top2_rate_pct: CoveredV2;
    first_out_rate_pct: CoveredV2;
  };
}
