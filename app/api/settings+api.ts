/**
 * GET /api/settings — return user_settings for the authenticated user.
 *
 * If settings don't exist yet (race condition), creates with defaults.
 * PATCH /settings is implemented in PLAT-007.
 *
 * PLAT-002 (EPIC-05)
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import { getOrCreateSettings } from '@/services/settings';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const settings = await getOrCreateSettings(userId);
  return Response.json({ success: true, data: settings });
}
