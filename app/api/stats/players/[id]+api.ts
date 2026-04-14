/**
 * GET /api/stats/players/:id — on-demand player stats (HIST-004, EPIC-04)
 *
 * Returns total_matches, wins/losses/draws, win_rate_pct (CALC-001),
 * favorite_decks (top 5 by usage), favorite_commanders (top 5 by usage).
 *
 * BR-STATS-01: only completed matches counted.
 * BR-STATS-03: abandoned excluded from total_matches denominator.
 * BR-STATS-05: partner commanders counted independently.
 */
import { getAuth } from '@/services/auth';
import { getRouteParam } from '@/services/route-params';

import { getPlayerStats } from '@/services/stats';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  try {
    const result = await getPlayerStats(userId, id);

    if ('notFound' in result) {
      return Response.json({ error: 'NOT_FOUND', message: 'Player not found' }, { status: 404 });
    }
    if ('forbidden' in result) {
      return Response.json({ error: 'FORBIDDEN', message: 'Access denied' }, { status: 403 });
    }

    return Response.json({ success: true, data: result.data }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/stats/players/:id]', e);
    return Response.json(
      { error: 'INTERNAL', message: (e as Error).message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
