/**
 * GET /api/groups/:id/decks — list all decks from all pod members.
 * Returns decks with owner name labels for deck lending UI.
 */
import { getAuth } from '@/services/auth';
import { getRouteParam } from '@/services/route-params';
import { getMembership } from '@/services/groups';
import { listPodDecks } from '@/services/pods';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  // Verify caller is a member of this group
  const membership = await getMembership(id, userId);
  if (!membership) {
    return Response.json({ error: 'FORBIDDEN', message: 'Not a member of this group' }, { status: 403 });
  }

  const podDecks = await listPodDecks(id);
  return Response.json({ success: true, data: podDecks }, { status: 200 });
}
