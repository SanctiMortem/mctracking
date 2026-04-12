/**
 * GET   /api/settings — return user_settings for the authenticated user.
 * PATCH /api/settings — update user preferences (PLAT-007).
 *
 * GET creates settings with defaults if they don't exist (bootstrap).
 * PATCH: `premium` field is explicitly rejected — use POST /purchases/verify (ADR-007).
 *
 * PLAT-002, PLAT-007 (EPIC-05)
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import { getOrCreateSettings, updateSettings } from '@/services/settings';
import type { SettingsPatch } from '@/services/settings';

const VALID_LANGUAGES = new Set(['en', 'es', 'auto']);

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const settings = await getOrCreateSettings(userId);
  return Response.json({ success: true, data: settings });
}

export async function PATCH(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // ADR-007 / BR-AUTH-04: premium is not updatable via this endpoint
  if ('premium' in raw) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'premium cannot be set via this endpoint — use POST /purchases/verify' },
      { status: 400 },
    );
  }

  // Build and validate patch
  const patch: SettingsPatch = {};

  if ('language' in raw) {
    if (typeof raw.language !== 'string' || !VALID_LANGUAGES.has(raw.language)) {
      return Response.json(
        { error: 'VALIDATION_ERROR', message: 'language must be "en", "es", or "auto"' },
        { status: 400 },
      );
    }
    patch.language = raw.language as SettingsPatch['language'];
  }

  if ('swipe_gestures_enabled' in raw) {
    if (typeof raw.swipe_gestures_enabled !== 'boolean') {
      return Response.json(
        { error: 'VALIDATION_ERROR', message: 'swipe_gestures_enabled must be a boolean' },
        { status: 400 },
      );
    }
    patch.swipe_gestures_enabled = raw.swipe_gestures_enabled;
  }

  if ('debounce_threshold_ms' in raw) {
    if (typeof raw.debounce_threshold_ms !== 'number' || !Number.isInteger(raw.debounce_threshold_ms)) {
      return Response.json(
        { error: 'VALIDATION_ERROR', message: 'debounce_threshold_ms must be an integer' },
        { status: 400 },
      );
    }
    patch.debounce_threshold_ms = raw.debounce_threshold_ms;
  }

  if ('require_commander' in raw) {
    if (typeof raw.require_commander !== 'boolean') {
      return Response.json(
        { error: 'VALIDATION_ERROR', message: 'require_commander must be a boolean' },
        { status: 400 },
      );
    }
    patch.require_commander = raw.require_commander;
  }

  if ('default_life_total' in raw) {
    if (typeof raw.default_life_total !== 'number' || !Number.isInteger(raw.default_life_total)) {
      return Response.json(
        { error: 'VALIDATION_ERROR', message: 'default_life_total must be an integer' },
        { status: 400 },
      );
    }
    patch.default_life_total = raw.default_life_total;
  }

  const result = await updateSettings(userId, patch);

  if ('debounceOutOfRange' in result) {
    return Response.json(
      { error: 'SETTINGS_DEBOUNCE_OUT_OF_RANGE', message: 'debounce_threshold_ms must be between 200 and 2000' },
      { status: 400 },
    );
  }

  if ('lifeTotalOutOfRange' in result) {
    return Response.json(
      { error: 'SETTINGS_LIFE_TOTAL_OUT_OF_RANGE', message: 'default_life_total must be between 1 and 999' },
      { status: 400 },
    );
  }

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Settings not found' }, { status: 404 });
  }

  return Response.json({ success: true, data: result.data }, { status: 200 });
}
