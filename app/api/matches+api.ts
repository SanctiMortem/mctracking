/**
 * GET  /api/matches — paginated match history with filters (HIST-001, EPIC-04)
 * POST /api/matches — create a new match with 2-4 participants (MATCH-002, EPIC-02)
 */
import { getAuth } from '@/services/auth';

import { createMatch, listMatches } from '@/services/matches';
import type { ListMatchesFilters, ParticipantInput } from '@/services/matches';

const VALID_RESULTS = new Set(['win', 'lose', 'draw', 'abandoned']);

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const limitRaw = parseInt(searchParams.get('limit') ?? '20', 10);
  const offsetRaw = parseInt(searchParams.get('offset') ?? '0', 10);
  const limit = isNaN(limitRaw) || limitRaw < 1 ? 20 : Math.min(limitRaw, 100);
  const offset = isNaN(offsetRaw) || offsetRaw < 0 ? 0 : offsetRaw;

  const filters: ListMatchesFilters = { limit, offset };

  const playerId = searchParams.get('player_id');
  const deckId = searchParams.get('deck_id');
  const commanderId = searchParams.get('commander_id');
  const result = searchParams.get('result');
  const winCondition = searchParams.get('win_condition');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  if (playerId) filters.playerId = playerId;
  if (deckId) filters.deckId = deckId;
  if (commanderId) filters.commanderId = commanderId;
  if (result && VALID_RESULTS.has(result)) {
    filters.result = result as ListMatchesFilters['result'];
  }
  if (winCondition) filters.winCondition = winCondition;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  const response = await listMatches(userId, filters);
  return Response.json({ success: true, data: response.data }, { status: 200 });
}

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
