/**
 * /api/matches/:id/roast — LABS: the optional satirical retelling.
 *
 *   PUT    { length: 'short' | 'long', content, model } → store what a phone
 *          just wrote with its own Claude key (replaces any earlier roast)
 *   DELETE → remove it
 *
 * Both answer with the fresh narration; the roast is read as part of
 * GET /api/matches/:id/narration.
 *
 * RCP-005 (experimental)
 */
import { getAuth } from '@/services/auth';
import { deleteRoast, saveRoast } from '@/services/narration';
import { narrationWriteResponse } from '@/services/narrationResponse';
import { getRouteParam } from '@/services/route-params';

export async function PUT(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  let body: { length?: unknown; content?: unknown; model?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'BAD_REQUEST', message: 'Body must be JSON' }, { status: 400 });
  }
  if ((body.length !== 'short' && body.length !== 'long') || typeof body.content !== 'string') {
    return Response.json({ error: 'BAD_REQUEST', message: 'length and content are required' }, { status: 400 });
  }

  return narrationWriteResponse(
    await saveRoast(userId, id, {
      length: body.length,
      content: body.content,
      model: typeof body.model === 'string' ? body.model.slice(0, 80) : null,
    }),
  );
}

export async function DELETE(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  return narrationWriteResponse(await deleteRoast(userId, id));
}
