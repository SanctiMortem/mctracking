/**
 * GET /api/decks/:id/versions — the deck's list history, newest first
 * (anyone who can view the deck).
 *
 * Each version carries its date, uploader, the cards added / removed / changed
 * since the previous version, and the deck's record while it was current.
 *
 * DECK-007 (EPIC-07)
 */
import { getAuth } from '@/services/auth';
import { getDeckVersionHistory } from '@/services/decklists';
import { getRouteParam } from '@/services/route-params';

export async function GET(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // The id is the segment before "versions"
  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await getDeckVersionHistory(userId, id);
  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });

  return Response.json({ success: true, data: result.data });
}
