/**
 * Clerk JWT middleware — protects all Expo API Routes.
 * Routes that need to remain public (e.g. health check, auth/session) should
 * be excluded explicitly by checking the URL path.
 *
 * PLAT-002 (EPIC-05)
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

/** Paths that are accessible without a Clerk session. */
const PUBLIC_PATHS = new Set(['/api/health', '/api/auth/session']);

export async function middleware(req: Request) {
  const { pathname } = new URL(req.url);

  if (PUBLIC_PATHS.has(pathname)) return;

  const { userId } = getAuth(req);
  if (!userId) {
    return Response.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }
}
