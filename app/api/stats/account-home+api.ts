/**
 * GET /api/stats/account-home — home-screen stats for the user's account player.
 *
 * Returns total matches, win rate, most-played deck, most common wincon and
 * average winning-turn for the players row linked to the current Clerk user
 * (players.account_user_id === userId). When the user hasn't created an
 * account player yet, returns zeros + null pointers so the UI can render a
 * graceful empty state.
 *
 * PLAT-010 (EPIC-05)
 */
import { getAuth } from '@/services/auth';

import { getAccountHomeStats } from '@/services/stats';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await getAccountHomeStats(userId);
    return Response.json({ success: true, data: result.data }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/stats/account-home]', e);
    return Response.json(
      { error: 'INTERNAL', message: (e as Error).message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
