/**
 * POST /api/admin/reset — Wipe all data for a clean start.
 *
 * Preserves: account players (account_user_id IS NOT NULL), user_settings —
 * both are tied to Clerk identity, not test data.
 *
 * FK-safe order: match_results → match_events → participations → matches
 *   → decks → commanders → group_members → groups → non-account players.
 *
 * ⚠️  DESTRUCTIVE — remove this route after use.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/services/db';

export async function POST() {
  try {
    await db.execute(sql`DELETE FROM match_results`);
    await db.execute(sql`DELETE FROM match_events`);
    await db.execute(sql`DELETE FROM participations`);
    await db.execute(sql`DELETE FROM matches`);
    await db.execute(sql`DELETE FROM decks`);
    await db.execute(sql`DELETE FROM commanders`);
    await db.execute(sql`DELETE FROM group_members`);
    await db.execute(sql`DELETE FROM groups`);
    await db.execute(sql`DELETE FROM players WHERE account_user_id IS NULL`);

    return Response.json({
      success: true,
      message: 'All data cleared. Account players and settings preserved.',
    });
  } catch (e) {
    const err = e as Error;
    return Response.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
