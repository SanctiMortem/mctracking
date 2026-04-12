/**
 * GET    /api/commanders/:id — commander detail (owner only)
 * PATCH  /api/commanders/:id — update a commander (owner only)
 * DELETE /api/commanders/:id — soft delete a commander (owner only)
 *
 * DATA-002 / DATA-010 (EPIC-01)
 */
import { getAuth } from '@/services/auth';
import { getRouteParam } from '@/services/route-params';

import {
  getCommanderById,
  softDeleteCommander,
  updateCommander,
  validateColors,
} from '@/services/commanders';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const commander = await getCommanderById(id);
  if (!commander) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (commander.createdBy !== userId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  return Response.json(commander);
}

export async function PATCH(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, colors, isPartner } = body as Record<string, unknown>;
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

  if (colors !== undefined) {
    if (!validateColors(colors)) {
      return Response.json(
        { error: 'VALIDATION_ERROR', field: 'colors', message: 'colors must be an array of W|U|B|R|G|C' },
        { status: 400 },
      );
    }
    update.colors = colors;
  }

  if (isPartner !== undefined) {
    update.isPartner = Boolean(isPartner);
  }

  const result = await updateCommander(userId, id, update);

  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if ('conflict' in result) {
    return Response.json(
      { error: 'CONFLICT', message: 'A commander with this name already exists' },
      { status: 409 },
    );
  }

  return Response.json(result.data);
}

export async function DELETE(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await softDeleteCommander(userId, id);

  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });

  return Response.json({ ok: true });
}
