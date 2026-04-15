/**
 * GET   /api/players/account — get the current user's account player (or null)
 * POST  /api/players/account — get or create the account player with a chosen name
 * PATCH /api/players/account — rename the account player
 */
import { getAuth } from '@/services/auth';
import { getAccountPlayer, getOrCreateAccountPlayer, updatePlayer } from '@/services/players';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const player = await getAccountPlayer(userId);
  return Response.json({ success: true, data: player }, { status: 200 });
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
      { error: 'VALIDATION_ERROR', message: 'name is required' },
      { status: 400 },
    );
  }

  const result = await getOrCreateAccountPlayer(userId, name);
  return Response.json(
    { success: true, data: result.data, created: result.created },
    { status: result.created ? 201 : 200 },
  );
}

export async function PATCH(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { name } = body as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length === 0) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'name is required' },
      { status: 400 },
    );
  }

  // Find the account player first
  const accountPlayer = await getAccountPlayer(userId);
  if (!accountPlayer) {
    return Response.json({ error: 'NOT_FOUND', message: 'No account player found' }, { status: 404 });
  }

  const updated = await updatePlayer(userId, accountPlayer.id, name.trim());
  return Response.json({ success: true, data: updated }, { status: 200 });
}
