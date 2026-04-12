/**
 * Purchases service — receipt validation + Premium activation.
 * Called exclusively by POST /api/purchases/verify (ADR-007, BR-AUTH-04).
 *
 * PLAT-012 (EPIC-05)
 */
import { eq } from 'drizzle-orm';

import { db } from '@/services/db';
import { userSettings } from '@/db/schema';
import type { UserSettings } from '@/db/index';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PREMIUM_PRODUCT_ID = 'com.mtgtracker.premium';
const APPLE_VERIFY_URL_PROD = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type VerifyResult =
  | { data: Pick<UserSettings, 'premium'>; alreadyPremium: boolean }
  | { invalidReceipt: true }
  | { notFound: true };

// ─────────────────────────────────────────────
// DB update
// ─────────────────────────────────────────────

/**
 * Sets user_settings.premium = true for the given user.
 * Idempotent — safe to call if the user is already premium.
 * Returns the updated row, or null if no settings row exists.
 */
export async function setPremiumTrue(
  userId: string,
): Promise<{ data: Pick<UserSettings, 'premium'> } | { notFound: true }> {
  const [updated] = await db
    .update(userSettings)
    .set({ premium: true, updatedAt: new Date() })
    .where(eq(userSettings.userId, userId))
    .returning({ premium: userSettings.premium });

  if (!updated) return { notFound: true };
  return { data: updated };
}

// ─────────────────────────────────────────────
// iOS receipt validation (App Store classic endpoint)
// ─────────────────────────────────────────────

type AppleVerifyResponse = {
  status: number;
  receipt?: {
    in_app?: { product_id: string }[];
  };
};

/**
 * Validates an iOS App Store receipt against Apple's server.
 * Uses the classic /verifyReceipt endpoint (non-consumable IAP, MVP scope).
 * Tries production first; on status 21007 (sandbox receipt) retries sandbox.
 *
 * Requires env var: APPLE_SHARED_SECRET
 */
export async function validateAppleReceipt(receipt: string): Promise<boolean> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET ?? '';
  const payload = JSON.stringify({
    'receipt-data': receipt,
    password: sharedSecret,
    'exclude-old-transactions': true,
  });

  let data = await postAppleVerify(APPLE_VERIFY_URL_PROD, payload);

  // status 21007 → sandbox receipt sent to production; retry
  if (data.status === 21007) {
    data = await postAppleVerify(APPLE_VERIFY_URL_SANDBOX, payload);
  }

  if (data.status !== 0) return false;
  return data.receipt?.in_app?.some((t) => t.product_id === PREMIUM_PRODUCT_ID) ?? false;
}

async function postAppleVerify(url: string, payload: string): Promise<AppleVerifyResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  return res.json() as Promise<AppleVerifyResponse>;
}

// ─────────────────────────────────────────────
// Android receipt validation (Google Play Developer API)
// ─────────────────────────────────────────────

type GoogleProductPurchase = { purchaseState?: number };

/**
 * Validates an Android purchase token against the Google Play Developer API.
 * Signs a JWT using the service account key (RS256) to obtain an access token.
 *
 * Requires env vars:
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_KEY — base64-encoded service account JSON
 *   ANDROID_PACKAGE_NAME            — e.g. "com.mtgtracker"
 */
export async function validateGoogleReceipt(purchaseToken: string): Promise<boolean> {
  const packageName = process.env.ANDROID_PACKAGE_NAME;
  const serviceAccountKeyB64 = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;

  if (!packageName || !serviceAccountKeyB64) return false;

  const accessToken = await getGoogleAccessToken(serviceAccountKeyB64);
  if (!accessToken) return false;

  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${packageName}/purchases/products/${PREMIUM_PRODUCT_ID}/tokens/${purchaseToken}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return false;

  const data = (await res.json()) as GoogleProductPurchase;
  return data.purchaseState === 0; // 0 = purchased
}

/**
 * Exchanges a base64-encoded Google service account JSON key for an OAuth2 access token
 * using the JWT Bearer token grant (RFC 7523).
 * Runs only on the server — uses Node.js crypto.
 */
async function getGoogleAccessToken(serviceAccountKeyB64: string): Promise<string | null> {
  try {
    const keyJson = JSON.parse(
      Buffer.from(serviceAccountKeyB64, 'base64').toString('utf-8'),
    ) as { client_email: string; private_key: string };

    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claimsPayload = Buffer.from(
      JSON.stringify({
        iss: keyJson.client_email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      }),
    ).toString('base64url');

    const { createSign } = await import('node:crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(`${header}.${claimsPayload}`);
    const signature = sign.sign(keyJson.private_key, 'base64url');

    const jwt = `${header}.${claimsPayload}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    return tokenData.access_token ?? null;
  } catch {
    return null;
  }
}
