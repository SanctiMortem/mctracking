/**
 * PATCH /api/matches/:id — close a match (win / draw / abandon).
 *
 * MATCH-003 (EPIC-02)
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import { closeMatch } from '@/services/matches';
import type { CloseAction } from '@/services/matches';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { action } = body as Record<string, unknown>;

  if (action !== 'win' && action !== 'draw' && action !== 'abandon') {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'action must be "win", "draw", or "abandon"' },
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

  const result = await closeMatch(userId, params.id, input);

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
    return Response.json({ error: 'FORBIDDEN', message: 'You did not create this match' }, { status: 403 });
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
