/**
 * GET /api/stats/v2/decks/:id — a deck's record against each colour (stats v2).
 *
 * LABS: only called by devices with the "New stats" switch on. Same
 * visibility rule as /api/stats/decks/:id.
 */
import { getAuth } from '@/services/auth';
import { getRouteParam } from '@/services/route-params';
import { getDeckColorsV2 } from '@/services/stats2/api';

export async function GET(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  try {
    const result = await getDeckColorsV2(userId, id);
    if ('notFound' in result) {
      return Response.json({ error: 'NOT_FOUND', message: 'Deck not found' }, { status: 404 });
    }
    if ('forbidden' in result) {
      return Response.json({ error: 'FORBIDDEN', message: 'Access denied' }, { status: 403 });
    }
    return Response.json({ success: true, data: result.data }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/stats/v2/decks/:id]', e);
    return Response.json(
      { error: 'INTERNAL', message: (e as Error).message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
