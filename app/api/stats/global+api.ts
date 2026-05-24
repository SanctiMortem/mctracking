/**
 * GET /api/stats/global — global stats dashboard (HIST-010, EPIC-04)
 *
 * Returns:
 *   total_matches     completed matches in user scope
 *   total_players     distinct players with at least 1 completed match
 *   player_rankings   all players ordered by win_rate_pct with RANK (BR-STATS-07)
 *   top_decks         top 5 by win_rate_pct (min 3 matches to qualify)
 *   top_commanders    top 5 by win_rate_pct (min 3 matches to qualify)
 *
 * Query params:
 *   group_id (optional) — when set, stats are scoped to matches in that pod.
 *                         User must be a member of the pod.
 */
import { and, eq } from 'drizzle-orm';

import { getAuth } from '@/services/auth';
import { db } from '@/services/db';
import { groupMembers } from '@/db/schema';
import { getGlobalStats } from '@/services/stats';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const groupId = url.searchParams.get('group_id');
  // `limit=all` lifts the top-5 cap on decks + commanders so the
  // per-entity "ALL" screens can show the full ranked list. Any other
  // value falls back to the default (top 5).
  const limit = url.searchParams.get('limit') === 'all' ? null : undefined;

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

  const result = await getGlobalStats(userId, groupId, { limit });
  return Response.json({ success: true, data: result.data }, { status: 200 });
}
