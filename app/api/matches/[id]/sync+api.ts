/**
 * GET /api/matches/:id/sync — compact live state for an in-progress match.
 *
 * Polled by every device with the tracker open so they converge on the same
 * life totals, turn counts, timers and dead players. Deliberately small and
 * constant-size: see `getMatchSyncState` for why turn state is derived
 * server-side instead of shipping the raw event log.
 */
import { getAuth } from '@/services/auth';
import { getRouteParam } from '@/services/route-params';

import { getMatchSyncState } from '@/services/matches';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await getMatchSyncState(userId, id);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Match not found' }, { status: 404 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
