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
import { and, eq } from 'drizzle-orm';

import { db } from '@/services/db';
import { matches } from '@/db/schema';
import { getOrCreateSettings } from '@/services/settings';

export async function GET(req: Request) {
  const { userId } = getAuth(req);

  if (!userId) {
    return Response.json({ success: true, data: { authenticated: false } });
  }

  const [settings, [activeMatchRow]] = await Promise.all([
    getOrCreateSettings(userId),
    db
      .select({ id: matches.id, groupId: matches.groupId, createdAt: matches.createdAt })
      .from(matches)
      .where(and(eq(matches.createdBy, userId), eq(matches.status, 'in_progress')))
      .limit(1),
  ]);

  const active_match = activeMatchRow
    ? { id: activeMatchRow.id, group_id: activeMatchRow.groupId, started_at: activeMatchRow.createdAt }
    : null;

  return Response.json({
    success: true,
    data: { authenticated: true, user_id: userId, settings, active_match },
  });
}
