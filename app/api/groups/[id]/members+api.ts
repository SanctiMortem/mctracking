/**
 * GET /api/groups/:id/members — list pod members with their account players.
 * Only returns members who have created an account player.
 */
import { getAuth } from '@/services/auth';
import { getRouteParam } from '@/services/route-params';
import { getMembership } from '@/services/groups';
import { listPodMembers } from '@/services/pods';

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

  const members = await listPodMembers(id);
  return Response.json({ success: true, data: members }, { status: 200 });
}
