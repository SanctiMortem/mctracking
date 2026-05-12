/**
 * GET  /api/decks              — list decks for the authenticated user
 * GET  /api/decks?commander_id= — filtered by commander
 * POST /api/decks              — create a new deck
 *
 * DATA-004 (EPIC-01)
 */
import { getAuth } from '@/services/auth';

import { createDeck, listDecks } from '@/services/decks';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const commanderId = searchParams.get('commander_id') ?? undefined;
  const includeArchived = searchParams.get('include_archived') === 'true';

  const data = await listDecks(userId, { commanderId, includeArchived });
  return Response.json(data);
}

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, commander_id, commander_id_2, description } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'name', message: 'name is required' },
      { status: 400 },
    );
  }
  if (!commander_id || typeof commander_id !== 'string') {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'commander_id', message: 'commander_id is required' },
      { status: 400 },
    );
  }

  const result = await createDeck(userId, {
    name: name.trim(),
    commanderId: commander_id,
    commanderId2: typeof commander_id_2 === 'string' ? commander_id_2 : null,
    description: typeof description === 'string' ? description : null,
  });

  if ('commanderNotFound' in result) {
    return Response.json({ error: 'NOT_FOUND', field: 'commander_id' }, { status: 404 });
  }
  if ('partnerRequired' in result) {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'commander_id_2', message: 'Partner commander requires commander_id_2' },
      { status: 400 },
    );
  }
  if ('commander2NotFound' in result) {
    return Response.json({ error: 'NOT_FOUND', field: 'commander_id_2' }, { status: 404 });
  }

  return Response.json(result.data, { status: 201 });
}
