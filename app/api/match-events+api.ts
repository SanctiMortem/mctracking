/**
 * POST /api/match-events — record a tracker state change.
 *
 * Body: { match_id, participation_id, event_type, delta, commander_id_source? }
 *
 * The debounce window runs on the client (React Native).
 * The API receives the already-accumulated delta.
 *
 * TRACK-002 (EPIC-03)
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import { recordEvent } from '@/services/matchEvents';
import type { EventType } from '@/services/matchEvents';

const VALID_EVENT_TYPES = new Set<EventType>(['life_change', 'poison_change', 'commander_damage']);

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { match_id, participation_id, event_type, delta, commander_id_source } = body as Record<string, unknown>;

  if (typeof match_id !== 'string' || !match_id) {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'match_id is required' }, { status: 400 });
  }
  if (typeof participation_id !== 'string' || !participation_id) {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'participation_id is required' }, { status: 400 });
  }
  if (typeof event_type !== 'string' || !VALID_EVENT_TYPES.has(event_type as EventType)) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'event_type must be life_change, poison_change, or commander_damage' },
      { status: 400 },
    );
  }
  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0) {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'delta must be a non-zero integer' }, { status: 400 });
  }

  const result = await recordEvent({
    matchId: match_id,
    participationId: participation_id,
    eventType: event_type as EventType,
    delta,
    commanderIdSource: typeof commander_id_source === 'string' ? commander_id_source : undefined,
  });

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Match not found' }, { status: 404 });
  }
  if ('notInProgress' in result) {
    return Response.json({ error: 'MATCH_NOT_IN_PROGRESS', message: 'Match is not in progress' }, { status: 400 });
  }
  if ('missingCommander' in result) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'commander_id_source is required for commander_damage events' },
      { status: 400 },
    );
  }
  if ('forbidden' in result) {
    return Response.json(
      { error: 'FORBIDDEN', message: 'participation_id does not belong to this match' },
      { status: 403 },
    );
  }

  return Response.json({ success: true, data: result.data }, { status: 201 });
}
