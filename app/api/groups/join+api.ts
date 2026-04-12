/**
 * POST /api/groups/join — join a group via invite code. (PLAT-005, EPIC-05)
 *
 * BR-GROUP-02: membership created; history preserved.
 * BR-GROUP-05: invite code expiration validated.
 */
import { getAuth } from '@/services/auth';

import { joinGroup } from '@/services/groups';

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { invite_code } = body as Record<string, unknown>;

  if (typeof invite_code !== 'string' || invite_code.trim().length === 0) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'invite_code is required' },
      { status: 400 },
    );
  }

  const result = await joinGroup(userId, invite_code.trim());

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Invite code not found' }, { status: 404 });
  }

  if ('expired' in result) {
    return Response.json({ error: 'GROUP_INVITE_EXPIRED', message: 'Invite code has expired' }, { status: 409 });
  }

  if ('alreadyMember' in result) {
    return Response.json({ error: 'ALREADY_A_MEMBER', message: 'You are already a member of this group' }, { status: 409 });
  }

  return Response.json({ success: true, data: result.data }, { status: 201 });
}
