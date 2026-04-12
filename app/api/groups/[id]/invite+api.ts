/**
 * POST /api/groups/:id/invite — get or regenerate invite link (owner only). (PLAT-005, EPIC-05)
 *
 * BR-GROUP-04: only owner can generate invite.
 * BR-GROUP-05: returns existing code if not expired; regenerates if expired.
 *
 * Optional body: { force?: boolean } — set force=true to regenerate even if current code is valid.
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import { getOrRegenerateInvite } from '@/services/groups';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const force = typeof body === 'object' && body !== null && (body as Record<string, unknown>).force === true;

  const result = await getOrRegenerateInvite(userId, params.id, force);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Group not found' }, { status: 404 });
  }

  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'Only the group owner can generate an invite' }, { status: 403 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
