/**
 * POST /api/match-events/undo?match_id= — undo the last non-undone event.
 *
 * Marks the event as is_undone=true (soft undo, BR-TRACK-11) and
 * reverts the participation snapshot.
 *
 * Returns { undone: null } when there are no events to undo.
 *
 * TRACK-002 (EPIC-03)
 */
import { getAuth } from '@/services/auth';

import { undoLastEvent } from '@/services/matchEvents';

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const matchId = url.searchParams.get('match_id');

  if (!matchId) {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'match_id query param is required' }, { status: 400 });
  }

  const result = await undoLastEvent(matchId);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Match not found' }, { status: 404 });
  }

  if ('noEvents' in result) {
    return Response.json({ success: true, data: { undone: null } }, { status: 200 });
  }

  return Response.json({ success: true, data: { undone: result.data } }, { status: 200 });
}
