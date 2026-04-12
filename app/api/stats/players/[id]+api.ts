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

import { getPlayerStats } from '@/services/stats';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getPlayerStats(userId, params.id);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Player not found' }, { status: 404 });
  }
  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'Access denied' }, { status: 403 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
