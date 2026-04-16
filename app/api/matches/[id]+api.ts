/**
 * GET    /api/matches/:id — match detail with participations + result.
 * PATCH  /api/matches/:id — close a match (win / draw / abandon).
 *
 * MATCH-003, MATCH-004 (EPIC-02)
 */
import { getAuth } from '@/services/auth';
import { getRouteParam } from '@/services/route-params';

import { closeMatch, deleteMatch, getMatchById, updateMatchResult } from '@/services/matches';
import type { CloseAction, UpdateResultAction } from '@/services/matches';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await getMatchById(userId, id);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Match not found' }, { status: 404 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
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

  const { action } = body as Record<string, unknown>;

  // ── Edit result (15-min window) ──
  if (action === 'update_result' || action === 'update_result_draw') {
    let updateInput: UpdateResultAction;
    if (action === 'update_result') {
      const { winner_participation_id, win_condition } = body as Record<string, unknown>;
      if (typeof winner_participation_id !== 'string' || typeof win_condition !== 'string') {
        return Response.json(
          { error: 'VALIDATION_ERROR', message: 'winner_participation_id and win_condition are required' },
          { status: 400 },
        );
      }
      updateInput = { action: 'update_result', winner_participation_id, win_condition };
    } else {
      updateInput = { action: 'update_result_draw' };
    }

    const result = await updateMatchResult(userId, id, updateInput);

    if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    if ('forbidden' in result) return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    if ('notCompleted' in result) return Response.json({ error: 'NOT_COMPLETED', message: 'Match is not completed' }, { status: 400 });
    if ('editWindowExpired' in result) return Response.json({ error: 'EDIT_WINDOW_EXPIRED', message: 'The 15-minute edit window has expired' }, { status: 400 });
    if ('invalidWinCondition' in result) return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid win_condition value' }, { status: 400 });
    if ('participationNotFound' in result) return Response.json({ error: 'VALIDATION_ERROR', message: 'winner_participation_id does not belong to this match' }, { status: 400 });

    return Response.json({ success: true, data: result.data }, { status: 200 });
  }

  // ── Close match (win / draw / abandon) ──
  if (action !== 'win' && action !== 'draw' && action !== 'abandon') {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'action must be "win", "draw", "abandon", "update_result", or "update_result_draw"' },
      { status: 400 },
    );
  }

  let input: CloseAction;

  if (action === 'win') {
    const { winner_participation_id, win_condition } = body as Record<string, unknown>;
    if (typeof winner_participation_id !== 'string' || typeof win_condition !== 'string') {
      return Response.json(
        { error: 'VALIDATION_ERROR', message: 'winner_participation_id and win_condition are required for action "win"' },
        { status: 400 },
      );
    }
    input = { action: 'win', winner_participation_id, win_condition };
  } else {
    input = { action } as CloseAction;
  }

  const result = await closeMatch(userId, id, input);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Match not found' }, { status: 404 });
  }

  if ('alreadyClosed' in result) {
    return Response.json(
      { error: 'MATCH_ALREADY_CLOSED', message: 'Match is already closed' },
      { status: 400 },
    );
  }

  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'You do not have permission to manage this match' }, { status: 403 });
  }

  if ('invalidWinCondition' in result) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'Invalid win_condition value' },
      { status: 400 },
    );
  }

  if ('participationNotFound' in result) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'winner_participation_id does not belong to this match' },
      { status: 400 },
    );
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}

export async function DELETE(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await deleteMatch(userId, id);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Match not found' }, { status: 404 });
  }
  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'You do not have permission to manage this match' }, { status: 403 });
  }
  if ('activeMatch' in result) {
    return Response.json({ error: 'MATCH_IN_PROGRESS', message: 'Cannot delete an in-progress match. Abandon it first.' }, { status: 400 });
  }

  return Response.json({ success: true }, { status: 200 });
}
