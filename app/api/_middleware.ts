/**
 * Clerk JWT middleware — protects all Expo API Routes.
 * Routes that need to remain public (e.g. health check) should
 * be excluded explicitly by checking the URL path.
 *
 * Full auth implementation: PLAT-002 (EPIC-05).
 */
// @ts-expect-error — @clerk/clerk-expo/server types not yet bundled; runtime works correctly
import { getAuth } from '@clerk/clerk-expo/server';

export async function middleware(req: Request) {
  const { pathname } = new URL(req.url);

  // Health check is always public
  if (pathname === '/api/health') return;

  const { userId } = getAuth(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
