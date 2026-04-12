/**
 * Settings service — upsert and retrieve user_settings.
 *
 * PLAT-002 (EPIC-05) — getOrCreateSettings
 * PLAT-007 (EPIC-05) — updateSettings
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

// ─────────────────────────────────────────────
// Patch input type
// ─────────────────────────────────────────────

export type SettingsPatch = {
  language?: 'en' | 'es' | 'auto';
  swipe_gestures_enabled?: boolean;
  /** BR-TRACK-10: must be in [200, 2000] — validated before calling this function */
  debounce_threshold_ms?: number;
  require_commander?: boolean;
  /** Must be in [1, 999] — validated before calling this function */
  default_life_total?: number;
};

// Validation result types
export type UpdateSettingsResult =
  | { data: UserSettings }
  | { notFound: true }
  | { debounceOutOfRange: true }
  | { lifeTotalOutOfRange: true };

/**
 * Update user_settings for the given user.
 * Returns notFound if no settings row exists (should not happen post-bootstrap,
 * but guards against race conditions).
 *
 * Validations enforced:
 *   - debounce_threshold_ms ∈ [200, 2000] (BR-TRACK-10)
 *   - default_life_total ∈ [1, 999]
 *   - premium is NOT part of SettingsPatch — blocked at API layer (ADR-007)
 */
export async function updateSettings(
  userId: string,
  patch: SettingsPatch,
): Promise<UpdateSettingsResult> {
  // Range validations
  if (
    patch.debounce_threshold_ms !== undefined &&
    (patch.debounce_threshold_ms < 200 || patch.debounce_threshold_ms > 2000)
  ) {
    return { debounceOutOfRange: true };
  }

  if (
    patch.default_life_total !== undefined &&
    (patch.default_life_total < 1 || patch.default_life_total > 999)
  ) {
    return { lifeTotalOutOfRange: true };
  }

  // Build the update payload — only include fields present in patch
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.language !== undefined) update.language = patch.language;
  if (patch.swipe_gestures_enabled !== undefined) update.swipeGesturesEnabled = patch.swipe_gestures_enabled;
  if (patch.debounce_threshold_ms !== undefined) update.debounceThresholdMs = patch.debounce_threshold_ms;
  if (patch.require_commander !== undefined) update.requireCommander = patch.require_commander;
  if (patch.default_life_total !== undefined) update.defaultLifeTotal = patch.default_life_total;

  const [updated] = await db
    .update(userSettings)
    .set(update)
    .where(eq(userSettings.userId, userId))
    .returning();

  if (!updated) return { notFound: true };
  return { data: updated };
}
