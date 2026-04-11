/**
 * GET  /api/commanders — list commanders for the authenticated user
 * POST /api/commanders — create a new commander
 *
 * DATA-002 (EPIC-01)
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import {
  createCommander,
  listCommanders,
  validateColors,
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

  const { name, colors, isPartner = false } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'name', message: 'name is required' },
      { status: 400 },
    );
  }
  if (!validateColors(colors)) {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'colors', message: 'colors must be a non-empty array of W|U|B|R|G|C' },
      { status: 400 },
    );
  }

  const result = await createCommander(userId, {
    name: name.trim(),
    colors,
    isPartner: Boolean(isPartner),
  });

  if ('conflict' in result) {
    return Response.json(
      { error: 'CONFLICT', message: 'A commander with this name already exists' },
      { status: 409 },
    );
  }

  return Response.json(result.data, { status: 201 });
}
