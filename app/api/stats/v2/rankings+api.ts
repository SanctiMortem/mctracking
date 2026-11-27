/**
 * GET /api/stats/v2/rankings — player, deck and commander rankings (stats v2).
 *
 * LABS: only called by devices with the "New stats" switch on. The current
 * dashboard keeps using /api/stats/global.
 *
 * Query params:
 *   group_id (optional) — scope to that pod; the caller must be a member.
 *                         Without it the scope is "all my matches".
 */
import { getAuth } from '@/services/auth';
import { getRankingsV2, isPodMember } from '@/services/stats2/api';

export async function GET(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const groupId = new URL(req.url).searchParams.get('group_id');
  if (groupId && !(await isPodMember(userId, groupId))) {
    return Response.json({ error: 'FORBIDDEN', message: 'Not a member of this pod' }, { status: 403 });
  }

  try {
    const result = await getRankingsV2(userId, groupId);
    return Response.json({ success: true, data: result.data }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/stats/v2/rankings]', e);
    return Response.json(
      { error: 'INTERNAL', message: (e as Error).message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
