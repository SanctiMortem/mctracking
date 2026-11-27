/**
 * Stats v2 — combines the current stats payload with the v2 rankings for the
 * ranking screens.
 *
 * The screens keep their current rows (which carry the full player, deck and
 * commander objects, art included). v2 only decides WHO is listed, in WHAT
 * ORDER, and adds "wins vs expected". Pure and total: with no v2 data, or
 * with a payload that does not look right, every function returns the
 * current lists untouched.
 */
import type { PlayerRanking } from '@/services/stats';

import type { RankingListV2 } from './contract';

export interface PlayerRowView {
  /** The current ranking row, with `rank` replaced by the v2 rank (0 when unranked). */
  ranking: PlayerRanking;
  /** null when v2 is not in use. */
  winsVsExpected: number | null;
  unranked: boolean;
}

function usable(list: RankingListV2 | null | undefined): list is RankingListV2 {
  return !!list && Array.isArray(list.ranked) && Array.isArray(list.unranked);
}

/**
 * Current rows in v2 order: ranked players first, then the unranked ones.
 * Players v2 leaves out (soft-deleted) are dropped.
 */
export function mergePlayerRankings(
  current: PlayerRanking[],
  v2: RankingListV2 | null | undefined,
): PlayerRowView[] {
  const asIs = () => current.map((ranking) => ({ ranking, winsVsExpected: null, unranked: false }));
  if (!usable(v2)) return asIs();

  const byId = new Map(current.map((r) => [r.player.id, r]));
  const rows: PlayerRowView[] = [];
  for (const [list, unranked] of [[v2.ranked, false], [v2.unranked, true]] as const) {
    for (const entry of list) {
      const ranking = byId.get(entry.id);
      if (!ranking) continue;
      rows.push({
        ranking: { ...ranking, rank: unranked ? 0 : (entry.rank ?? 0) },
        winsVsExpected: typeof entry.wins_vs_expected === 'number' ? entry.wins_vs_expected : null,
        unranked,
      });
    }
  }
  // v2 knows nobody the current list has: something is off, keep the current list.
  return rows.length > 0 || current.length === 0 ? rows : asIs();
}

/**
 * Current deck or commander rows in v2 order. Entries v2 does not rank
 * (soft-deleted, or under the minimum) are dropped.
 */
export function orderByRanking<T>(
  current: T[],
  idOf: (item: T) => string,
  v2: RankingListV2 | null | undefined,
): T[] {
  if (!usable(v2)) return current;
  const byId = new Map(current.map((item) => [idOf(item), item]));
  const ordered = v2.ranked.map((entry) => byId.get(entry.id)).filter((item): item is T => item !== undefined);
  return ordered.length > 0 || current.length === 0 ? ordered : current;
}

/** "+8.7" / "-10.8" / "0.0". */
export function signedOneDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
}
