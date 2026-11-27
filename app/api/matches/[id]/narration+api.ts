/**
 * /api/matches/:id/narration — LABS: the AI recap, per-event causes and the
 * review around them.
 *
 *   GET   → the narration as the caller may see it (`data` null when there is
 *           none, or it is a draft they may not see yet)
 *   POST  → one review action, answered with the fresh narration:
 *             { action: 'flag', kind, key }   hide a part for everyone
 *             { action: 'unflag_mine' }       bring back the parts I hid
 *             { action: 'approve' | 'unapprove' }
 *
 * ANL-006, RCP-001, RCP-003 (experimental)
 */
import { getAuth } from '@/services/auth';
import {
  FLAG_KINDS,
  type FlagKind,
  flagNarrationPart,
  getNarration,
  setNarrationApproval,
  unflagMyNarrationParts,
} from '@/services/narration';
import { narrationWriteResponse } from '@/services/narrationResponse';
import { getRouteParam } from '@/services/route-params';

export async function GET(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await getNarration(userId, id);
  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Match not found' }, { status: 404 });
  }

  return Response.json({ success: true, data: result.data });
}

export async function POST(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  let body: { action?: unknown; kind?: unknown; key?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'BAD_REQUEST', message: 'Body must be JSON' }, { status: 400 });
  }

  switch (body.action) {
    case 'flag': {
      const kind = body.kind as FlagKind;
      const key = typeof body.key === 'string' ? body.key.trim() : '';
      if (!FLAG_KINDS.includes(kind) || !key || key.length > 64) {
        return Response.json({ error: 'BAD_REQUEST', message: 'flag needs a valid kind and key' }, { status: 400 });
      }
      return narrationWriteResponse(await flagNarrationPart(userId, id, kind, key));
    }
    case 'unflag_mine':
      return narrationWriteResponse(await unflagMyNarrationParts(userId, id));
    case 'approve':
      return narrationWriteResponse(await setNarrationApproval(userId, id, true));
    case 'unapprove':
      return narrationWriteResponse(await setNarrationApproval(userId, id, false));
    default:
      return Response.json({ error: 'BAD_REQUEST', message: 'Unknown action' }, { status: 400 });
  }
}
