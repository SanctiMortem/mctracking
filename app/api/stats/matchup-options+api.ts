/**
 * GET /api/stats/matchup-options
 *
 * Returns the players / decks / commanders the user can compare on the
 * head-to-head matchup screen for a given scope.
 *
 * Query params:
 *   scope_group_id (optional) — when set, scope is the named pod and the
 *                               result is the union of every pod member's
 *                               active players, decks and the commanders
 *                               referenced by those decks. The caller must
 *                               be a member of that pod.
 *
 * No scope param ⇒ personal scope: only the user's own rows.
 */
import { and, eq } from 'drizzle-orm';

import { getAuth } from '@/services/auth';
import { db } from '@/services/db';
import { groupMembers } from '@/db/schema';
import { getMatchupOptions } from '@/services/stats';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scopeGroupId = searchParams.get('scope_group_id');

  if (scopeGroupId) {
    const [member] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, scopeGroupId), eq(groupMembers.userId, userId)))
      .limit(1);
    if (!member) {
      return Response.json(
        { error: 'FORBIDDEN', message: 'Not a member of this pod' },
        { status: 403 },
      );
    }
  }

  const data = await getMatchupOptions(userId, scopeGroupId);
  return Response.json({ success: true, data }, { status: 200 });
}
