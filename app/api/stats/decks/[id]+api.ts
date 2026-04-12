/**
 * GET /api/stats/decks/:id — on-demand deck stats (HIST-006, EPIC-04)
 *
 * Returns total_matches, wins, win_rate_pct (CALC-001), and per-player
 * breakdown of everyone who piloted this deck (players_used_by).
 *
 * BR-STATS-01: only completed matches counted.
 * BR-STATS-03: abandoned excluded from denominator.
 * BR-STATS-04: deck win rate is independent of which player piloted it.
 */
import { getAuth } from '@/services/auth';

import { getDeckStats } from '@/services/stats';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getDeckStats(userId, params.id);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Deck not found' }, { status: 404 });
  }
  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'Access denied' }, { status: 403 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
