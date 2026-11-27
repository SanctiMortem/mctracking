/**
 * PATCH /api/matches/:id/deaths/:participationId/killer — "Killed by".
 *
 * Sets, switches or clears who killed a dead player. Applied to that
 * player's latest non-undone `player_died` event; the client does not send
 * (and often does not know) the event id.
 *
 * Body: { death_cause, killer_participation_id, killer_commander_id }
 *   each null or left out = not set.
 *     clear            all null
 *     self-inflicted   death_cause "self", both killer fields null
 *     an opponent      death_cause "opponent", killer_participation_id set,
 *                      killer_commander_id optional (which partner)
 *
 * Allowed while the match is in progress and for 15 minutes after it is
 * completed. It never writes an event, so it is never an Undo step.
 *
 * 404 NO_DEATH               that player has no non-undone death in this match
 * 400 VALIDATION_ERROR       bad body, or a killer that does not fit the match
 * 400 EDIT_WINDOW_EXPIRED    completed more than 15 minutes ago
 * 400 MATCH_NOT_EDITABLE     abandoned match
 * 503 KILLED_BY_UNAVAILABLE  the database does not have the columns yet
 *                            (migration 0016); the app hides the panel
 *
 * docs/STATS_REDESIGN_SPEC.md section 1a
 */
import { getAuth } from '@/services/auth';

import { KILLER_VALIDATION_MESSAGES, parseKillerBody, parseKillerRoutePath } from '@/services/killedBy';
import { setDeathKiller } from '@/services/setDeathKiller';

export async function PATCH(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const ids = parseKillerRoutePath(new URL(req.url).pathname);
  if (!ids) {
    return Response.json({ error: 'BAD_REQUEST', message: 'Missing or malformed id' }, { status: 400 });
  }

  const parsed = parseKillerBody(await req.json().catch(() => null));
  if (!parsed.ok) {
    return Response.json({ error: 'VALIDATION_ERROR', message: parsed.message }, { status: 400 });
  }

  const result = await setDeathKiller(userId, ids.matchId, ids.participationId, parsed.selection);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Match not found' }, { status: 404 });
  }
  if ('noDeath' in result) {
    return Response.json(
      { error: 'NO_DEATH', message: 'That player is not marked dead in this match' },
      { status: 404 },
    );
  }
  if ('notEditable' in result) {
    return Response.json(
      { error: 'MATCH_NOT_EDITABLE', message: 'An abandoned match cannot be edited' },
      { status: 400 },
    );
  }
  if ('editWindowExpired' in result) {
    return Response.json(
      { error: 'EDIT_WINDOW_EXPIRED', message: 'The 15-minute edit window has expired' },
      { status: 400 },
    );
  }
  if ('invalid' in result) {
    return Response.json(
      { error: 'VALIDATION_ERROR', code: result.invalid, message: KILLER_VALIDATION_MESSAGES[result.invalid] },
      { status: 400 },
    );
  }
  if ('unavailable' in result) {
    return Response.json(
      { error: 'KILLED_BY_UNAVAILABLE', message: '"Killed by" is not available yet' },
      { status: 503 },
    );
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
