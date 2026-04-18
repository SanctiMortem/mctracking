/**
 * POST /api/admin/clear-history — Wipe the authed user's match history.
 *
 * Scope: matches where created_by = userId (and all dependent rows).
 * Preserves: players, decks, commanders, groups, user_settings.
 *
 * FK-safe order: match_results → match_events → participations → matches.
 * Sequential queries (Neon HTTP does not support transactions).
 */
import { sql } from 'drizzle-orm';
import { db } from '@/services/db';
import { getAuth } from '@/services/auth';

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.execute(sql`
      DELETE FROM match_results
      WHERE match_id IN (SELECT id FROM matches WHERE created_by = ${userId})
    `);
    await db.execute(sql`
      DELETE FROM match_events
      WHERE match_id IN (SELECT id FROM matches WHERE created_by = ${userId})
    `);
    await db.execute(sql`
      DELETE FROM participations
      WHERE match_id IN (SELECT id FROM matches WHERE created_by = ${userId})
    `);
    await db.execute(sql`DELETE FROM matches WHERE created_by = ${userId}`);

    return Response.json({
      success: true,
      message: 'Match history cleared.',
    });
  } catch (e) {
    const err = e as Error;
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
