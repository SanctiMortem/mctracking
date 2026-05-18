/**
 * GET /api/stats/pod-highlights?group_id=...
 *
 * Powers the highlights carousel at the top of the Stats screen.
 *
 *  - When `group_id` is provided, returns pod-scoped highlights and the
 *    caller must be a member of that pod (403 otherwise).
 *  - When `group_id` is omitted, returns personal-scope highlights
 *    (matches created by the authenticated user).
 *
 * Highlights: total matches, most active player, top winner (min 3
 * matches), total play time, fastest + longest turn-win decks,
 * longest loss streak.
 */
import { and, eq } from 'drizzle-orm';

import { getAuth } from '@/services/auth';
import { db } from '@/services/db';
import { groupMembers } from '@/db/schema';
import { getPodHighlights } from '@/services/stats';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('group_id');

  if (groupId) {
    const [member] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    if (!member) {
      return Response.json(
        { error: 'FORBIDDEN', message: 'Not a member of this pod' },
        { status: 403 },
      );
    }
  }

  const result = await getPodHighlights(userId, groupId);
  return Response.json({ success: true, data: result.data }, { status: 200 });
}
