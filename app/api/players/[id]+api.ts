/**
 * PATCH  /api/players/:id — rename a player (owner only)
 * DELETE /api/players/:id — soft delete a player (owner only, no active match)
 *
 * DATA-003 (EPIC-01)
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import { softDeletePlayer, updatePlayer } from '@/services/players';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { name } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'name', message: 'name must be a non-empty string' },
      { status: 400 },
    );
  }

  const result = await updatePlayer(userId, id, name.trim());

  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if ('conflict' in result) {
    return Response.json(
      { error: 'CONFLICT', message: 'A player with this name already exists' },
      { status: 409 },
    );
  }

  return Response.json(result.data);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const result = await softDeletePlayer(userId, id);

  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if ('activeMatch' in result) {
    return Response.json(
      { error: 'ACTIVE_MATCH', message: 'Player has an active match' },
      { status: 400 },
    );
  }

  return Response.json({ ok: true });
}
