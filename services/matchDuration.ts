/**
 * Match duration helpers — trailing-gap truncation for abandoned matches.
 *
 * Some matches get left `in_progress` for hours (or days) before someone
 * remembers to hit "Close Match". Naive `endedAt - createdAt` reports
 * inflated durations for those. The heuristic here caps the tail: if the
 * final gap between the last recorded event and endedAt exceeds a
 * threshold, we treat the last event as the effective end. Quiet stretches
 * *during* play don't trigger truncation because they're bounded by later
 * events; only the final gap after everyone stopped playing matters.
 *
 * Duplicated as a SQL expression in services/stats.ts for aggregations —
 * see effectiveDurationSecondsExpr below.
 */

const TAIL_GAP_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2h

/**
 * Effective "end of play" timestamp for a completed match. When the
 * post-last-event gap exceeds the threshold, returns lastEventAt (i.e.
 * treats the match as if it ended when the last real activity happened).
 * Otherwise trusts the recorded endedAt.
 *
 * Pass `lastEventAt = null` when there are no events (e.g. a match closed
 * with no interactions logged) — the function falls back to trusting
 * endedAt in that case.
 */
export function effectiveEndedAt(
  createdAt: Date | string,
  endedAt: Date | string | null,
  lastEventAt: Date | string | null,
): Date | null {
  if (!endedAt) return null;
  const end = new Date(endedAt);
  if (!lastEventAt) return end;
  const last = new Date(lastEventAt);
  const gap = end.getTime() - last.getTime();
  if (gap > TAIL_GAP_THRESHOLD_MS) return last;
  return end;
}

/** Effective duration in seconds using effectiveEndedAt above. */
export function effectiveDurationSeconds(
  createdAt: Date | string,
  endedAt: Date | string | null,
  lastEventAt: Date | string | null,
): number | null {
  const eff = effectiveEndedAt(createdAt, endedAt, lastEventAt);
  if (!eff) return null;
  return Math.max(0, Math.round((eff.getTime() - new Date(createdAt).getTime()) / 1000));
}
