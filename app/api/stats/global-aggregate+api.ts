/**
 * GET /api/stats/global-aggregate — home-screen global aggregates.
 *
 * Surfaces five cross-match highlights: top wincon, top commander (plays),
 * commander with the most commander damage dealt, fastest-winning commander
 * (lowest average turn count), and the most popular deck color identity.
 *
 * Query params:
 *   group_id (optional) — when set, stats are scoped to matches in that pod.
 *                         User must be a member of the pod.
 */
import { and, eq } from 'drizzle-orm';

import { getAuth } from '@/services/auth';
import { db } from '@/services/db';
import { groupMembers } from '@/db/schema';
import { getGlobalAggregates } from '@/services/stats';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const groupId = url.searchParams.get('group_id');

  if (groupId) {
    const [member] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    if (!member) {
      return Response.json({ error: 'FORBIDDEN', message: 'Not a member of this pod' }, { status: 403 });
    }
  }

  try {
    const result = await getGlobalAggregates(userId, groupId);
    return Response.json({ success: true, data: result.data }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/stats/global-aggregate]', e);
    return Response.json(
      { error: 'INTERNAL', message: (e as Error).message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
