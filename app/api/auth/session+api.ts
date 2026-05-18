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
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';

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

  // Return every in-progress match the user can see — pod members frequently
  // have multiple matches running simultaneously and the Home tab needs to
  // show all of them so they can resume the right one. Newest-first so the
  // most recently created surfaces at the top of the list.
  //
  // Left-join the host's account player so the banner can show whose match
  // it is ("Match in progress · Peter · Started 12m ago"). createdBy is the
  // Clerk user ID; account players are linked via players.accountUserId.
  const activeMatchRows = await db
    .select({
      id: matches.id,
      groupId: matches.groupId,
      createdBy: matches.createdBy,
      createdAt: matches.createdAt,
    })
    .from(matches)
    .where(and(eq(matches.status, 'in_progress'), or(...orConditions)))
    .orderBy(desc(matches.createdAt));

  // Resolve host names in one query: account-player name keyed by Clerk user ID.
  const hostUserIds = Array.from(new Set(activeMatchRows.map((r) => r.createdBy)));
  const hostNameByUserId = new Map<string, string>();
  if (hostUserIds.length > 0) {
    const hostRows = await db
      .select({ userId: players.accountUserId, name: players.name })
      .from(players)
      .where(and(inArray(players.accountUserId, hostUserIds), isNull(players.deletedAt)));
    for (const row of hostRows) {
      if (row.userId) hostNameByUserId.set(row.userId, row.name);
    }
  }

  const active_matches = activeMatchRows.map((row) => ({
    id: row.id,
    group_id: row.groupId,
    started_at: row.createdAt,
    host_name: hostNameByUserId.get(row.createdBy) ?? null,
  }));

  // Back-compat: older clients still read `active_match` (singular). Keep it
  // populated with the newest match so they get the previous behaviour.
  const active_match = active_matches[0] ?? null;

  return Response.json({
    success: true,
    data: { authenticated: true, user_id: userId, settings, active_match, active_matches },
  });
}
