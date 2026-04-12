/**
 * POST /api/purchases/verify — validate an IAP receipt and activate Premium.
 *
 * Validates server-side with App Store (iOS) or Google Play (Android).
 * On success: sets user_settings.premium = true (idempotent).
 * The `premium` field in PATCH /settings is explicitly rejected (ADR-007).
 *
 * PLAT-012 (EPIC-05)
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

import {
  setPremiumTrue,
  validateAppleReceipt,
  validateGoogleReceipt,
} from '@/services/purchases';

const SUPPORTED_PLATFORMS = new Set(['ios', 'android']);

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { receipt, platform } = body as Record<string, unknown>;

  if (typeof receipt !== 'string' || receipt.trim().length === 0) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'receipt is required' },
      { status: 400 },
    );
  }

  if (typeof platform !== 'string' || !SUPPORTED_PLATFORMS.has(platform)) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'platform must be "ios" or "android"' },
      { status: 400 },
    );
  }

  // Validate receipt with the appropriate store
  let valid: boolean | { serverError: true } = false;
  try {
    if (platform === 'ios') {
      valid = await validateAppleReceipt(receipt);
    } else {
      valid = await validateGoogleReceipt(receipt);
    }
  } catch {
    return Response.json(
      { error: 'PURCHASE_VALIDATION_ERROR', message: 'Receipt validation failed' },
      { status: 502 },
    );
  }

  // Server misconfiguration (e.g. missing APPLE_SHARED_SECRET) → 503
  if (typeof valid === 'object' && 'serverError' in valid) {
    return Response.json(
      { error: 'SERVICE_UNAVAILABLE', message: 'Receipt validation service is unavailable' },
      { status: 503 },
    );
  }

  if (!valid) {
    return Response.json(
      { error: 'PURCHASE_RECEIPT_INVALID', message: 'Receipt could not be validated' },
      { status: 400 },
    );
  }

  // Activate Premium — idempotent (safe if already premium)
  const result = await setPremiumTrue(userId);

  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'Settings not found' }, { status: 404 });
  }

  return Response.json({ success: true, data: { premium: result.data.premium } }, { status: 200 });
}
