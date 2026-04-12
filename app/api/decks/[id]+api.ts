/**
 * GET    /api/decks/:id — deck detail with embedded commander(s)
 * PATCH  /api/decks/:id — update deck (owner only)
 * DELETE /api/decks/:id — soft delete (owner only, no active match)
 *
 * DATA-004 (EPIC-01)
 */
import { getAuth } from '@/services/auth';

import { getDeckById, softDeleteDeck, updateDeck } from '@/services/decks';

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const deck = await getDeckById(params.id);
  if (!deck) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (deck.createdBy !== userId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  return Response.json(deck);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, commander_id, commander_id_2, description } = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return Response.json(
        { error: 'VALIDATION_ERROR', field: 'name', message: 'name must be a non-empty string' },
        { status: 400 },
      );
    }
    update.name = name.trim();
  }
  if (commander_id !== undefined) {
    if (typeof commander_id !== 'string') {
      return Response.json({ error: 'VALIDATION_ERROR', field: 'commander_id' }, { status: 400 });
    }
    update.commanderId = commander_id;
  }
  // Allow explicitly setting commander_id_2 to null (removing partner)
  if ('commander_id_2' in body) {
    update.commanderId2 = typeof commander_id_2 === 'string' ? commander_id_2 : null;
  }
  if (description !== undefined) {
    update.description = typeof description === 'string' ? description : null;
  }

  const result = await updateDeck(userId, params.id, update);

  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });
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

  return Response.json(result.data);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await softDeleteDeck(userId, params.id);

  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if ('activeMatch' in result) {
    return Response.json(
      { error: 'ACTIVE_MATCH', message: 'Deck has an active match' },
      { status: 400 },
    );
  }

  return Response.json({ ok: true });
}
