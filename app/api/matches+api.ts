/**
 * POST /api/matches — create a new match with 2-4 participants.
 *
 * MATCH-002 (EPIC-02)
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import { createMatch } from '@/services/matches';
import type { ParticipantInput } from '@/services/matches';

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { participants } = body as Record<string, unknown>;

  if (!Array.isArray(participants)) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'participants must be an array' },
      { status: 400 },
    );
  }

  // Validate each element has the required shape
  for (const p of participants) {
    if (
      !p ||
      typeof p !== 'object' ||
      typeof (p as Record<string, unknown>).player_id !== 'string' ||
      typeof (p as Record<string, unknown>).deck_id !== 'string'
    ) {
      return Response.json(
        { error: 'VALIDATION_ERROR', message: 'Each participant must have player_id and deck_id strings' },
        { status: 400 },
      );
    }
  }

  const result = await createMatch(userId, participants as ParticipantInput[]);

  if ('invalidPlayerCount' in result) {
    return Response.json(
      { error: 'MATCH_INVALID_PLAYER_COUNT', message: 'Match requires 2-4 participants' },
      { status: 400 },
    );
  }

  if ('duplicateDeck' in result) {
    return Response.json(
      { error: 'MATCH_DECK_DUPLICATE', message: 'Each deck can only appear once per match' },
      { status: 400 },
    );
  }

  if ('forbidden' in result) {
    return Response.json(
      { error: 'FORBIDDEN', message: `Deck ${result.forbidden} does not belong to you` },
      { status: 403 },
    );
  }

  if ('deckInActiveMatch' in result) {
    return Response.json(
      { error: 'DECK_IN_ACTIVE_MATCH', message: `Deck ${result.deckInActiveMatch} is already in an active match` },
      { status: 400 },
    );
  }

  return Response.json({ success: true, data: result.data }, { status: 201 });
}
