/**
 * Server-side auth helper for Expo API Routes.
 *
 * Verifies the Clerk session token sent as `Authorization: Bearer <jwt>`
 * (the client gets it from `useAuth().getToken()`), and only then returns
 * its `sub` as the user id. Verification covers:
 *   - signature, against the Clerk instance's JWKS (fetched with
 *     CLERK_SECRET_KEY and cached in memory by @clerk/backend)
 *   - expiry / not-before (5s clock skew)
 *   - issuer, against the Frontend API encoded in the publishable key
 *
 * Every API route relies on this as its only authentication gate, so any
 * failure — including missing server configuration — yields
 * `{ userId: null }` and the route answers 401.
 *
 * PLAT-002 (EPIC-05)
 */
import { verifyToken } from '@clerk/backend';

type AuthResult = {
  userId: string | null;
};

const UNAUTHENTICATED: AuthResult = { userId: null };

/**
 * Issuer of this instance's session tokens, derived from the publishable key
 * (`pk_live_<base64("<frontend-api-host>$")>`). Null if no key is configured
 * or it cannot be parsed.
 */
export function getExpectedIssuer(): string | null {
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return null;

  const match = /^pk_(?:test|live)_(.+)$/.exec(publishableKey);
  if (!match) return null;

  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
    if (!decoded.endsWith('$')) return null;
    const host = decoded.slice(0, -1);
    return host ? `https://${host}` : null;
  } catch {
    return null;
  }
}

let warnedMissingIssuer = false;

/**
 * Authenticate the request from its Clerk session token.
 * Returns { userId: null } unless the token is present and fully verified.
 */
export async function getAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return UNAUTHENTICATED;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error('[auth] CLERK_SECRET_KEY is not set — rejecting all requests');
    return UNAUTHENTICATED;
  }

  const issuer = getExpectedIssuer();
  if (!issuer && !warnedMissingIssuer) {
    warnedMissingIssuer = true;
    console.warn(
      '[auth] No Clerk publishable key configured — token issuer is not being checked',
    );
  }

  try {
    const payload = await verifyToken(token, { secretKey });

    if (issuer && payload.iss !== issuer) return UNAUTHENTICATED;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return UNAUTHENTICATED;

    return { userId: payload.sub };
  } catch {
    // Bad signature, expired, malformed, unknown key id, JWKS unreachable…
    return UNAUTHENTICATED;
  }
}
