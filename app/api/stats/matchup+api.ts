/**
 * GET /api/stats/matchup — head-to-head stats between two entities (HIST-010, EPIC-04)
 *
 * Query params:
 *   entity_type   player | deck | commander
 *   entity_a_id   UUID of entity A
 *   entity_b_id   UUID of entity B
 *   scope         all (default) | 1v1 (BR-STATS-06: only 2-player matches)
 *
 * BR-STATS-01: only completed matches counted.
 * BR-STATS-06: scope=1v1 restricts to matches with exactly 2 participants.
 */
import { getAuth } from '@/services/auth';

import { getMatchupStats } from '@/services/stats';

const VALID_ENTITY_TYPES = new Set(['player', 'deck', 'commander']);
const VALID_SCOPES = new Set(['all', '1v1']);

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entity_type');
  const entityAId = searchParams.get('entity_a_id');
  const entityBId = searchParams.get('entity_b_id');
  const scope = searchParams.get('scope') ?? 'all';

  if (!entityType || !entityAId || !entityBId) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'entity_type, entity_a_id, and entity_b_id are required' },
      { status: 400 },
    );
  }
  if (!VALID_ENTITY_TYPES.has(entityType)) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'entity_type must be player, deck, or commander' },
      { status: 400 },
    );
  }
  if (!VALID_SCOPES.has(scope)) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'scope must be all or 1v1' },
      { status: 400 },
    );
  }
  if (entityAId === entityBId) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'entity_a_id and entity_b_id must be different' },
      { status: 400 },
    );
  }

  const result = await getMatchupStats(
    userId,
    entityType as 'player' | 'deck' | 'commander',
    entityAId,
    entityBId,
    scope as 'all' | '1v1',
  );

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: `${result.notFound} not found` }, { status: 404 });
  }
  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'Access denied' }, { status: 403 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
