/**
 * Clockwise seat order per layout variant.
 *
 * Each layout variant in components/match/TrackerLayout.tsx places its
 * `sections` in a known JSX order. This module returns the *clockwise viewing
 * order* of those section indices (12 o'clock → 3 → 6 → 9 from the spectator
 * standing above the table) so the tracker can validate "next player" taps:
 *   - sections[0] is whatever the layout renders first (often the top frame)
 *   - the returned array is the clockwise sequence of section indices
 *
 * Used by useTurnTimers to enforce that a turn-counter increment only fires
 * when the new active player is the legitimate clockwise successor of the
 * last player who legitimately took a turn (skipping dead players).
 */

export function clockwiseSeatIndices(variant: string | undefined, count: number): number[] {
  switch (variant) {
    case '2p-side':
    case '2p-stack':
      return [0, 1];
    case '3p-top1-bot2':
      // sections: [top, bot-left, bot-right] → cw: top → bot-right → bot-left
      return [0, 2, 1];
    case '3p-top2-bot1':
      // sections: [top-left, top-right, bot] → cw: tl → tr → bot
      return [0, 1, 2];
    case '3p-left1-right2':
      // sections: [left, top-right, bot-right] → cw: left → tr → br
      return [0, 1, 2];
    case '4p-grid':
      // sections: [TL, TR, BL, BR] → cw: TL → TR → BR → BL
      return [0, 1, 3, 2];
    case '4p-pod':
      // sections: [top, mid-left, mid-right, bot] → cw: top → mid-right → bot → mid-left
      return [0, 2, 3, 1];
  }
  return Array.from({ length: count }, (_, i) => i);
}

/** Map seat indices through `participationIds` to a clockwise id sequence. */
export function clockwiseParticipationIds(
  variant: string | undefined,
  participationIds: string[],
): string[] {
  const idx = clockwiseSeatIndices(variant, participationIds.length);
  if (idx.length !== participationIds.length) return [...participationIds];
  return idx.map((i) => participationIds[i]);
}

/**
 * Next alive id after `currentId` in the clockwise sequence. Skips ids
 * present in `deadIds`. Returns null if no candidate exists.
 */
export function nextAliveClockwise(
  currentId: string,
  clockwiseOrder: string[],
  deadIds: ReadonlySet<string>,
): string | null {
  if (clockwiseOrder.length === 0) return null;
  const idx = clockwiseOrder.indexOf(currentId);
  if (idx === -1) return null;
  for (let step = 1; step <= clockwiseOrder.length; step++) {
    const next = clockwiseOrder[(idx + step) % clockwiseOrder.length];
    if (!deadIds.has(next)) return next;
  }
  return null;
}
