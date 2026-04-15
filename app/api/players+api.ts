/**
 * GET  /api/players — list active players for the authenticated user
 * POST /api/players — create a new player
 *
 * DATA-003 (EPIC-01)
 */
import { getAuth } from '@/services/auth';

import { createPlayer, listPlayers } from '@/services/players';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const guestsOnly = searchParams.get('guests_only') === 'true';
  const data = await listPlayers(userId, { guestsOnly });
  return Response.json(data);
}

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { name } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'name', message: 'name is required' },
      { status: 400 },
    );
  }

  const result = await createPlayer(userId, name.trim());

  if ('conflict' in result) {
    return Response.json(
      { error: 'CONFLICT', message: 'A player with this name already exists' },
      { status: 409 },
    );
  }

  return Response.json(result.data, { status: 201 });
}
