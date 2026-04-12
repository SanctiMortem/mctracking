/**
 * GET /api/stats/commanders/:id — on-demand commander stats (HIST-008, EPIC-04)
 *
 * Returns total_matches (appearances as primary or partner commander),
 * wins, win_rate_pct (CALC-001), decks using it, and players who piloted it.
 *
 * BR-STATS-01: only completed matches.
 * BR-STATS-05: each partner commander's stats are independent.
 */
import { getAuth } from '@/services/auth';
import { getRouteParam } from '@/services/route-params';

import { getCommanderStats } from '@/services/stats';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await getCommanderStats(userId, id);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Commander not found' }, { status: 404 });
  }
  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'Access denied' }, { status: 403 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
