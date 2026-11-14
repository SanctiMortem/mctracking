/**
 * GET /api/matches/:id/narration — LABS: the AI recap and per-event causes
 * for a match. `data` is null when the match has no narration (or the
 * caller may not see the draft yet).
 *
 * ANL-006, RCP-001 (experimental)
 */
import { getAuth } from '@/services/auth';
import { getNarration } from '@/services/narration';
import { getRouteParam } from '@/services/route-params';

export async function GET(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await getNarration(userId, id);
  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Match not found' }, { status: 404 });
  }

  return Response.json({ success: true, data: result.data });
}
