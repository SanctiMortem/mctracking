/**
 * GET /api/stats/v2/matchup — head-to-head between two entities (stats v2).
 *
 * LABS: only called by devices with the "New stats" switch on.
 *
 * Same query params as /api/stats/matchup:
 *   entity_type     player | deck | commander
 *   entity_a_id     UUID of entity A
 *   entity_b_id     UUID of entity B
 *   scope           all (default) | 1v1 (two-player matches only)
 *   scope_group_id  (optional) pod scope; the caller must be a member.
 *                   Without it the scope is "all my matches".
 *
 * Unlike v1, wins + losses + ties always equals `duels`, and the shared
 * matches a third player won are returned as `undecided_matches`.
 */
import { getAuth } from '@/services/auth';
import { getMatchupV2, isPodMember } from '@/services/stats2/api';
import type { EntityType } from '@/services/stats2/matchups';

const VALID_ENTITY_TYPES = new Set(['player', 'deck', 'commander']);
const VALID_SCOPES = new Set(['all', '1v1']);

export async function GET(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entity_type');
  const entityAId = searchParams.get('entity_a_id');
  const entityBId = searchParams.get('entity_b_id');
  const scope = searchParams.get('scope') ?? 'all';
  const scopeGroupId = searchParams.get('scope_group_id');

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
    return Response.json({ error: 'VALIDATION_ERROR', message: 'scope must be all or 1v1' }, { status: 400 });
  }
  if (entityAId === entityBId) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'entity_a_id and entity_b_id must be different' },
      { status: 400 },
    );
  }
  if (scopeGroupId && !(await isPodMember(userId, scopeGroupId))) {
    return Response.json({ error: 'FORBIDDEN', message: 'Not a member of this pod' }, { status: 403 });
  }

  try {
    const result = await getMatchupV2(
      userId,
      entityType as EntityType,
      entityAId,
      entityBId,
      scope === '1v1',
      scopeGroupId,
    );
    return Response.json({ success: true, data: result.data }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/stats/v2/matchup]', e);
    return Response.json(
      { error: 'INTERNAL', message: (e as Error).message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
