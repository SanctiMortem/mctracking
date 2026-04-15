/**
 * POST /api/admin/reset — Wipe all data for a clean start.
 *
 * Deletes in FK-safe order:
 *   match_results → match_events → participations → matches
 *   → decks → commanders → group_members → groups → players → user_settings
 *
 * ⚠️  DESTRUCTIVE — remove this route after use.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/services/db';

export async function POST() {
  try {
    // Delete in FK-safe order (children first)
    await db.execute(sql`DELETE FROM match_results`);
    await db.execute(sql`DELETE FROM match_events`);
    await db.execute(sql`DELETE FROM participations`);
    await db.execute(sql`DELETE FROM matches`);
    await db.execute(sql`DELETE FROM decks`);
    await db.execute(sql`DELETE FROM commanders`);
    await db.execute(sql`DELETE FROM group_members`);
    await db.execute(sql`DELETE FROM groups`);
    await db.execute(sql`DELETE FROM players`);
    await db.execute(sql`DELETE FROM user_settings`);

    return Response.json({
      success: true,
      message: 'All data cleared. Clean slate.',
    });
  } catch (e) {
    const err = e as Error;
    return Response.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
