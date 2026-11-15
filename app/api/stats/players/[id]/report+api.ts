/**
 * GET /api/stats/players/:id/report — data package for the AI stats report on a
 * player profile (your own only).
 *
 * Returns records, deck shape and card lists. The phone sends it to Claude
 * with the user's own key; nothing is stored and this route never calls an
 * AI service.
 *
 * RPT-001
 */
import { getAuth } from '@/services/auth';
import { getPlayerReportData } from '@/services/reports';
import { getRouteParam } from '@/services/route-params';

export async function GET(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  try {
    const result = await getPlayerReportData(userId, id);
    if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    if ('forbidden' in result) return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    return Response.json({ success: true, data: result.data });
  } catch (e) {
    console.error('[GET /api/stats/players/:id/report]', e);
    return Response.json({ error: 'INTERNAL', message: 'Could not build the report data' }, { status: 500 });
  }
}
