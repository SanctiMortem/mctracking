/**
 * PATCH /api/groups/:id — archive a group (owner only). (PLAT-005, EPIC-05)
 *
 * BR-GROUP-04: soft-archive, never hard-delete.
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import { archiveGroup } from '@/services/groups';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await archiveGroup(userId, params.id);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Group not found' }, { status: 404 });
  }

  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'Only the group owner can archive the group' }, { status: 403 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
