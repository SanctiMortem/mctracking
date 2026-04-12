/**
 * PATCH /api/groups/:id — archive a group (owner only). (PLAT-005, EPIC-05)
 *
 * BR-GROUP-04: soft-archive, never hard-delete.
 */
import { getAuth } from '@/services/auth';
import { getRouteParam } from '@/services/route-params';

import { archiveGroup } from '@/services/groups';

export async function PATCH(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await archiveGroup(userId, id);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Group not found' }, { status: 404 });
  }

  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'Only the group owner can archive the group' }, { status: 403 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
