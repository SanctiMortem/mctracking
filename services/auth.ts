/**
 * Server-side auth helper for Expo API Routes.
 *
 * Replaces the non-existent `@clerk/clerk-expo/server` import.
 * Extracts the user ID from the Authorization Bearer token (Clerk JWT).
 * The middleware already validates the token exists for protected routes,
 * so this helper decodes the JWT payload to get the `sub` (userId).
 *
 * PLAT-002 (EPIC-05)
 */

type AuthResult = {
  userId: string | null;
};

/**
 * Extract userId from a Clerk JWT Bearer token in the request.
 * Returns { userId: null } if no valid token is present.
 */
export function getAuth(req: Request): AuthResult {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { userId: null };
  }

  try {
    // Clerk JWTs are standard JWTs — decode the payload (base64url).
    const parts = token.split('.');
    if (parts.length !== 3) return { userId: null };

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    );

    return { userId: payload.sub ?? null };
  } catch {
    return { userId: null };
  }
}
