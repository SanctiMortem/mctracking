/**
 * GET /api/auth/session — public bootstrap endpoint.
 *
 * If a Clerk session is present:
 *   - Upserts user_settings with defaults on first login (BR-AUTH-02)
 *   - Returns { authenticated: true, user_id, settings, active_match }
 *   - active_match: first in_progress match owned by user, or null
 *
 * If no session: returns { authenticated: false }
 *
 * PLAT-002 (EPIC-05)
 */
import { getAuth } from '@/services/auth';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import { db } from '@/services/db';
import { groupMembers, matches, participations, players } from '@/db/schema';
import { getOrCreateSettings } from '@/services/settings';

export async function GET(req: Request) {
  const { userId } = getAuth(req);

  if (!userId) {
    return Response.json({ success: true, data: { authenticated: false } });
  }

  // Find active matches the user can see:
  //   1. Matches the user created
  //   2. Matches in pods the user belongs to
  //   3. Matches where the user's account player is participating
  const settings = await getOrCreateSettings(userId);

  // Build a set of match conditions
  const orConditions = [eq(matches.createdBy, userId)];

  // Pod matches: find groups the user belongs to
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  const groupIds = memberRows.map((r) => r.groupId);
  if (groupIds.length > 0) {
    orConditions.push(inArray(matches.groupId, groupIds));
  }

  // Account player participation
  const [accountPlayer] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.accountUserId, userId), isNull(players.deletedAt)))
    .limit(1);

  let participatedMatchIds: string[] = [];
  if (accountPlayer) {
    const partRows = await db
      .select({ matchId: participations.matchId })
      .from(participations)
      .innerJoin(matches, and(eq(participations.matchId, matches.id), eq(matches.status, 'in_progress')))
      .where(eq(participations.playerId, accountPlayer.id));
    participatedMatchIds = partRows.map((r) => r.matchId);
    if (participatedMatchIds.length > 0) {
      orConditions.push(inArray(matches.id, participatedMatchIds));
    }
  }

  const [activeMatchRow] = await db
    .select({ id: matches.id, groupId: matches.groupId, createdAt: matches.createdAt })
    .from(matches)
    .where(and(eq(matches.status, 'in_progress'), or(...orConditions)))
    .limit(1);

  const active_match = activeMatchRow
    ? { id: activeMatchRow.id, group_id: activeMatchRow.groupId, started_at: activeMatchRow.createdAt }
    : null;

  return Response.json({
    success: true,
    data: { authenticated: true, user_id: userId, settings, active_match },
  });
}
