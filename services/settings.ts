/**
 * Settings service — upsert and retrieve user_settings.
 *
 * PLAT-002 (EPIC-05)
 */
import { eq } from 'drizzle-orm';

import { db } from '@/services/db';
import { userSettings } from '@/db/schema';
import type { UserSettings } from '@/db/index';

/**
 * Returns the user_settings row for the given Clerk user ID,
 * creating it with defaults if it does not exist yet (BR-AUTH-02).
 * Uses onConflictDoNothing() for idempotence — safe to call multiple times.
 */
export async function getOrCreateSettings(userId: string): Promise<UserSettings> {
  // Upsert: insert with defaults; skip if userId already exists (UNIQUE index)
  await db
    .insert(userSettings)
    .values({ userId })
    .onConflictDoNothing();

  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  // row is guaranteed to exist after the upsert above
  return row!;
}
