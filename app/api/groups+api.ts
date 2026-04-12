/**
 * GET  /api/groups — list groups for authenticated user (PLAT-005, EPIC-05)
 * POST /api/groups — create a new group (PLAT-005, EPIC-05)
 */
import { getAuth } from '@/services/auth';

import { createGroup, listGroups } from '@/services/groups';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await listGroups(userId);
  return Response.json({ success: true, data }, { status: 200 });
}

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { name } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'name is required and must be a non-empty string' },
      { status: 400 },
    );
  }

  if (name.trim().length > 100) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'name must be 100 characters or fewer' },
      { status: 400 },
    );
  }

  const result = await createGroup(userId, name);
  return Response.json({ success: true, data: result.data }, { status: 201 });
}
