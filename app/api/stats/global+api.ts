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
 * Note: group_id filter is reserved for EPIC-05 (groups feature).
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import { getGlobalStats } from '@/services/stats';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // group_id: ignored in EPIC-04, reserved for EPIC-05
  const result = await getGlobalStats(userId);
  return Response.json({ success: true, data: result.data }, { status: 200 });
}
