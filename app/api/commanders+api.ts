/**
 * GET  /api/commanders — list commanders for the authenticated user
 * POST /api/commanders — create a commander from a Scryfall card
 *
 * Body for POST:
 *   { scryfall_id, name, color_identity: string[], art_crop: string|null, is_partner?: boolean }
 *
 * DATA-002 (EPIC-01)
 */
import { getAuth } from '@/services/auth';

import {
  createCommander,
  listCommanders,
  validateColorIdentity,
} from '@/services/commanders';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await listCommanders(userId);
  return Response.json(data);
}

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    scryfall_id,
    name,
    color_identity,
    art_crop,
    is_partner = false,
  } = body as Record<string, unknown>;

  if (!scryfall_id || typeof scryfall_id !== 'string') {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'scryfall_id', message: 'scryfall_id is required' },
      { status: 400 },
    );
  }
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'name', message: 'name is required' },
      { status: 400 },
    );
  }
  if (!validateColorIdentity(color_identity)) {
    return Response.json(
      {
        error: 'VALIDATION_ERROR',
        field: 'color_identity',
        message: 'color_identity must be an array of W|U|B|R|G',
      },
      { status: 400 },
    );
  }

  const result = await createCommander(userId, {
    scryfallId: scryfall_id,
    name: name.trim(),
    colorIdentity: color_identity,
    artCrop: typeof art_crop === 'string' ? art_crop : null,
    isPartner: Boolean(is_partner),
  });

  return Response.json(result.data, { status: 201 });
}
